import secrets
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import hash_password
from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.admission import (
    AdmissionApplicationCreate,
    AdmissionApplicationInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/admissions", tags=["admissions"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ── PUBLIC: submit application ──────────────────────────────────
@router.post("/apply", response_model=AdmissionApplicationInDB, status_code=201)
async def apply(payload: AdmissionApplicationCreate):
    db = get_database()
    email_lc = payload.email.lower()

    # Reject if user or pending application already exists for this email
    if await db.users.find_one({"email": email_lc}):
        raise HTTPException(status_code=409, detail="This email already has an account")
    if await db.admissions.find_one({"email": email_lc, "status": "pending"}):
        raise HTTPException(status_code=409, detail="You already have a pending application")

    now = _utcnow()
    doc = {
        "fullName": payload.fullName,
        "email": email_lc,
        "phone": payload.phone,
        "idNumber": payload.idNumber,
        "location": payload.location,
        "school": payload.school,
        "fieldOfStudy": payload.fieldOfStudy,
        "courseOfStudy": payload.courseOfStudy,
        "desiredCourseId": payload.desiredCourseId,
        "motivation": payload.motivation,
        "status": "pending",
        "reviewedBy": None,
        "reviewedAt": None,
        "reviewNote": "",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.admissions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return AdmissionApplicationInDB(**doc)


# ── PUBLIC: check status by email ──────────────────────────────
@router.get("/check")
async def check_status(email: str = Query(..., min_length=5)):
    db = get_database()
    app = await db.admissions.find_one(
        {"email": email.lower()},
        sort=[("createdAt", -1)],
    )
    if not app:
        raise HTTPException(status_code=404, detail="No application found for that email")
    return {
        "status": app["status"],
        "submittedAt": app.get("createdAt"),
        "reviewedAt": app.get("reviewedAt"),
        "reviewNote": app.get("reviewNote", ""),
    }


# ── ADMIN: list ─────────────────────────────────────────────────
@router.get("", response_model=list[AdmissionApplicationInDB])
async def list_applications(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    limit: int = Query(default=100, le=500),
    _: UserInDB = Depends(require_role("admin")),
):
    filt: dict = {}
    if status:
        filt["status"] = status
    cursor = (
        get_database().admissions.find(filt)
        .sort("createdAt", -1)
        .limit(limit)
    )
    out = []
    async for a in cursor:
        out.append(AdmissionApplicationInDB(**a))
    return out


# ── ADMIN: get one ─────────────────────────────────────────────
@router.get("/{application_id}", response_model=AdmissionApplicationInDB)
async def get_application(
    application_id: str,
    _: UserInDB = Depends(require_role("admin")),
):
    a = await get_database().admissions.find_one({"_id": _oid(application_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    return AdmissionApplicationInDB(**a)


# ── ADMIN: approve → creates user, returns temp password ONCE ──
@router.patch("/{application_id}/approve")
async def approve(
    application_id: str,
    auth: UserInDB = Depends(require_role("admin")),
    note: str = Query(default=""),
):
    db = get_database()
    a = await db.admissions.find_one({"_id": _oid(application_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if a["status"] == "approved":
        raise HTTPException(status_code=400, detail="Already approved")
    if await db.users.find_one({"email": a["email"]}):
        raise HTTPException(
            status_code=409,
            detail="A user with that email already exists — resolve manually",
        )

    # Create user with random temp password
    temp_password = secrets.token_urlsafe(9)  # ~12 chars
    now = _utcnow()
    user_doc = {
        "idNumber": a["idNumber"],
        "fullName": a["fullName"],
        "email": a["email"],
        "phone": a["phone"],
        "location": a["location"],
        "school": a["school"],
        "fieldOfStudy": a["fieldOfStudy"],
        "courseOfStudy": a["courseOfStudy"],
        "password": hash_password(temp_password),
        "role": "student",
        "status": "active",
        "emailVerified": False,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        user_result = await db.users.insert_one(user_doc)
    except Exception as e:
        raise HTTPException(status_code=409, detail=f"Could not create user: {e}")

    await db.admissions.update_one(
        {"_id": a["_id"]},
        {"$set": {
            "status": "approved",
            "reviewedBy": ObjectId(auth.id),
            "reviewedAt": now,
            "reviewNote": note,
            "updatedAt": now,
        }},
    )
    await log_action(
        actorId=auth.id, action="admission_approve",
        target=application_id, meta={"email": a["email"]},
    )

    return {
        "ok": True,
        "userId": str(user_result.inserted_id),
        "email": a["email"],
        "tempPassword": temp_password,
        "message": "User created. Share the temp password securely — it is not shown again.",
    }


# ── ADMIN: reject ──────────────────────────────────────────────
@router.patch("/{application_id}/reject", response_model=AdmissionApplicationInDB)
async def reject(
    application_id: str,
    auth: UserInDB = Depends(require_role("admin")),
    reason: str = Query(default=""),
):
    db = get_database()
    a = await db.admissions.find_one({"_id": _oid(application_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if a["status"] == "approved":
        raise HTTPException(status_code=400, detail="Cannot reject an approved application")

    now = _utcnow()
    updated = await db.admissions.find_one_and_update(
        {"_id": a["_id"]},
        {"$set": {
            "status": "rejected",
            "reviewedBy": ObjectId(auth.id),
            "reviewedAt": now,
            "reviewNote": reason,
            "updatedAt": now,
        }},
        return_document=True,
    )
    await log_action(
        actorId=auth.id, action="admission_reject",
        target=application_id, meta={"reason": reason},
    )
    return AdmissionApplicationInDB(**updated)
