import secrets
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import hash_password
from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.guardian import (
    GuardianCreate,
    GuardianLinkCreate,
    GuardianLinkInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["guardian"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ── ADMIN: create guardian + initial link ──────────────────────
@router.post("/admin/guardians")
async def admin_create_guardian(
    payload: GuardianCreate,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    email_lc = payload.email.lower()

    if await db.users.find_one({"email": email_lc}):
        raise HTTPException(status_code=409, detail="Email already registered")
    if await db.users.find_one({"idNumber": payload.idNumber}):
        raise HTTPException(status_code=409, detail="idNumber already registered")

    student_oid = _oid(payload.studentId)
    if not await db.users.find_one({"_id": student_oid, "role": "student"}):
        raise HTTPException(status_code=404, detail="Student not found")

    temp_password = secrets.token_urlsafe(9)
    now = _utcnow()
    user_doc = {
        "idNumber": payload.idNumber,
        "fullName": payload.fullName,
        "email": email_lc,
        "phone": payload.phone,
        # Guardian accounts don't have academic context, but UserInDB
        # enforces min_length=2 on these fields (they're required for
        # students). Fill with placeholders so validation passes.
        "location": "Not specified",
        "school": "Guardian",
        "fieldOfStudy": "N/A",
        "courseOfStudy": "N/A",
        "password": hash_password(temp_password),
        "role": "guardian",
        "status": "active",
        "emailVerified": False,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        user_result = await db.users.insert_one(user_doc)
    except Exception as e:
        raise HTTPException(status_code=409, detail=f"Could not create: {e}")

    guardian_oid = user_result.inserted_id
    await db.guardian_links.insert_one({
        "guardianId": guardian_oid,
        "studentId": student_oid,
        "relationship": payload.relationship,
        "linkedBy": ObjectId(auth.id),
        "linkedAt": now,
    })
    await log_action(
        actorId=auth.id, action="guardian_create",
        target=str(guardian_oid), meta={"studentId": payload.studentId},
    )

    return {
        "ok": True,
        "guardianId": str(guardian_oid),
        "email": email_lc,
        "tempPassword": temp_password,
        "message": "Guardian created and linked. Share the temp password securely.",
    }


# ── ADMIN: create additional link ──────────────────────────────
@router.post("/admin/guardian-links", response_model=GuardianLinkInDB, status_code=201)
async def admin_link(
    payload: GuardianLinkCreate,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    g_oid = _oid(payload.guardianId)
    s_oid = _oid(payload.studentId)

    guardian = await db.users.find_one({"_id": g_oid, "role": "guardian"})
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    student = await db.users.find_one({"_id": s_oid, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if await db.guardian_links.find_one({
        "guardianId": g_oid, "studentId": s_oid,
    }):
        raise HTTPException(status_code=409, detail="Link already exists")

    doc = {
        "guardianId": g_oid,
        "studentId": s_oid,
        "relationship": payload.relationship,
        "linkedBy": ObjectId(auth.id),
        "linkedAt": _utcnow(),
    }
    result = await db.guardian_links.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="guardian_link",
        target=str(result.inserted_id),
    )
    return GuardianLinkInDB(**doc)


# ── ADMIN: list all links ─────────────────────────────────────
@router.get("/admin/guardian-links")
async def admin_links(_: UserInDB = Depends(require_role("admin"))):
    db = get_database()
    cursor = db.guardian_links.find({}).sort("linkedAt", -1).limit(500)
    out = []
    async for gl in cursor:
        g = await db.users.find_one({"_id": gl["guardianId"]}, {"fullName": 1, "email": 1})
        s = await db.users.find_one({"_id": gl["studentId"]}, {"fullName": 1, "email": 1})
        out.append({
            "id": str(gl["_id"]),
            "guardianName": g.get("fullName", "—") if g else "—",
            "guardianEmail": g.get("email", "") if g else "",
            "studentName": s.get("fullName", "—") if s else "—",
            "studentEmail": s.get("email", "") if s else "",
            "relationship": gl.get("relationship", "parent"),
            "linkedAt": gl.get("linkedAt"),
        })
    return out


# ── ADMIN: remove link ────────────────────────────────────────
@router.delete("/admin/guardian-links/{link_id}")
async def admin_unlink(
    link_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    result = await get_database().guardian_links.delete_one({"_id": _oid(link_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(
        actorId=auth.id, action="guardian_unlink", target=link_id,
    )
    return {"ok": True}


# ── GUARDIAN: list linked students ────────────────────────────
@router.get("/guardian/students")
async def guardian_students(auth: UserInDB = Depends(require_role("guardian"))):
    db = get_database()
    uid = ObjectId(auth.id)
    links = await db.guardian_links.find({"guardianId": uid}).to_list(length=50)

    out = []
    for gl in links:
        student = await db.users.find_one({"_id": gl["studentId"]}, {"password": 0})
        if not student:
            continue
        enrolled = await db.enrollments.count_documents({
            "studentId": gl["studentId"], "paymentStatus": "paid",
        })
        out.append({
            "linkId": str(gl["_id"]),
            "studentId": str(student["_id"]),
            "fullName": student.get("fullName", ""),
            "idNumber": student.get("idNumber", ""),
            "email": student.get("email", ""),
            "school": student.get("school", ""),
            "relationship": gl.get("relationship", "parent"),
            "enrolledCourses": enrolled,
        })
    return out


# ── GUARDIAN: read-only student view ──────────────────────────
async def _require_link(guardian_id: str, student_id: str) -> None:
    link = await get_database().guardian_links.find_one({
        "guardianId": ObjectId(guardian_id),
        "studentId": ObjectId(student_id),
    })
    if not link:
        raise HTTPException(status_code=403, detail="Not linked to that student")


@router.get("/guardian/students/{student_id}")
async def guardian_student_detail(
    student_id: str,
    auth: UserInDB = Depends(require_role("guardian")),
):
    await _require_link(auth.id, student_id)

    db = get_database()
    sid = _oid(student_id)
    student = await db.users.find_one({"_id": sid}, {"password": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Not found")

    # Enrollments + progress
    enrollments = []
    async for e in db.enrollments.find({"studentId": sid}):
        course = await db.courses.find_one({"_id": e.get("courseId")})
        sessions_total = await db.sessions.count_documents({"courseId": e.get("courseId")})
        passed = await db.progresses.count_documents({
            "studentId": sid, "courseId": e.get("courseId"), "status": "passed",
        })
        enrollments.append({
            "courseTitle": course.get("title", "—") if course else "—",
            "paymentStatus": e.get("paymentStatus", ""),
            "sessionsTotal": sessions_total,
            "sessionsPassed": passed,
            "percent": round(passed / sessions_total * 100, 1) if sessions_total else 0,
        })

    # Payments
    payments = []
    async for p in db.payments.find({"studentId": sid}).sort("createdAt", -1).limit(20):
        payments.append({
            "reference": p.get("reference", ""),
            "amount": p.get("amount", 0),
            "status": p.get("status", ""),
            "createdAt": p.get("createdAt"),
        })

    # Recent scores
    scores = []
    async for pr in db.progresses.find({"studentId": sid, "score": {"$ne": None}}).sort(
        "submittedAt", -1
    ).limit(10):
        session = await db.sessions.find_one({"_id": pr.get("sessionId")})
        scores.append({
            "sessionTitle": session.get("title", "") if session else "",
            "score": pr.get("score"),
            "status": pr.get("status", ""),
            "submittedAt": pr.get("submittedAt"),
        })

    return {
        "student": {
            "id": str(student["_id"]),
            "fullName": student.get("fullName", ""),
            "idNumber": student.get("idNumber", ""),
            "email": student.get("email", ""),
            "school": student.get("school", ""),
            "fieldOfStudy": student.get("fieldOfStudy", ""),
        },
        "enrollments": enrollments,
        "payments": payments,
        "scores": scores,
    }
