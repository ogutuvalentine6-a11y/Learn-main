from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.progress import ProgressInDB
from app.models.staff_assignment import StaffAssignmentInDB
from app.models.user import UserInDB, UserPublic
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["admin"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str, field: str = "id") -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {field}")


# ── GET /api/admin-users ─────────────────────────────────────────
@router.get("/admin-users", response_model=list[UserPublic])
async def admin_users(_: UserInDB = Depends(require_role("admin"))):
    cursor = get_database().users.find({}).sort("createdAt", -1)
    out = []
    async for doc in cursor:
        doc.pop("password", None)
        doc["_id"] = str(doc["_id"])
        out.append(UserPublic.model_validate(doc))
    return out


# ── PATCH /api/admin-user-update ─────────────────────────────────
class AdminUserUpdateRequest(BaseModel):
    userId: str
    role: str | None = Field(default=None, pattern="^(student|staff|admin)$")
    status: str | None = Field(default=None, pattern="^(active|blocked)$")


@router.patch("/admin-user-update", response_model=UserPublic)
async def admin_user_update(
    payload: AdminUserUpdateRequest,
    admin: UserInDB = Depends(require_role("admin")),
):
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    updates.pop("userId", None)
    if not updates:
        raise HTTPException(status_code=400, detail="No updatable fields")

    updates["updatedAt"] = _utcnow()
    updated = await get_database().users.find_one_and_update(
        {"_id": _oid(payload.userId, "userId")},
        {"$set": updates},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    updated.pop("password", None)
    updated["_id"] = str(updated["_id"])
    await log_action(
        actorId=admin.id,
        action="admin_user_update",
        target=payload.userId,
        meta=updates,
    )
    return UserPublic.model_validate(updated)


# ── DELETE /api/admin-user-delete ────────────────────────────────
class AdminUserDeleteRequest(BaseModel):
    userId: str


@router.delete("/admin-user-delete")
async def admin_user_delete(
    payload: AdminUserDeleteRequest,
    admin: UserInDB = Depends(require_role("admin")),
):
    """Hard delete. NOTE: inferred from pattern; paste original to reconcile."""
    db = get_database()
    result = await db.users.delete_one({"_id": _oid(payload.userId, "userId")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_action(
        actorId=admin.id,
        action="admin_user_delete",
        target=payload.userId,
    )
    return {"ok": True}


# ── POST /api/admin-assign-staff ─────────────────────────────────
class AdminAssignStaffRequest(BaseModel):
    staffId: str
    courseId: str


@router.post(
    "/admin-assign-staff",
    response_model=StaffAssignmentInDB,
    status_code=201,
)
async def admin_assign_staff(
    payload: AdminAssignStaffRequest,
    admin: UserInDB = Depends(require_role("admin")),
):
    """Inferred from adminAssignStaffSchema + StaffAssignment model."""
    db = get_database()
    staff = await db.users.find_one({"_id": _oid(payload.staffId, "staffId")})
    if not staff or staff.get("role") != "staff":
        raise HTTPException(status_code=400, detail="staffId must be a staff user")

    course = await db.courses.find_one({"_id": _oid(payload.courseId, "courseId")})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    now = _utcnow()
    assignment = await db.staffassignments.find_one_and_update(
        {
            "staffId": ObjectId(payload.staffId),
            "courseId": ObjectId(payload.courseId),
        },
        {
            "$set": {
                "assignedBy": ObjectId(admin.id),
                "assignedAt": now,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
        return_document=True,
    )
    await log_action(
        actorId=admin.id,
        action="admin_assign_staff",
        target=f"{payload.staffId}->{payload.courseId}",
    )
    return StaffAssignmentInDB(**assignment)


# ── GET /api/admin-logs ──────────────────────────────────────────
@router.get("/admin-logs")
async def admin_logs(_: UserInDB = Depends(require_role("admin"))):
    cursor = get_database().logs.find({}).sort("createdAt", -1).limit(500)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["actorId"] = str(doc["actorId"]) if doc.get("actorId") else None
        doc["createdAt"] = doc["createdAt"].isoformat() if doc.get("createdAt") else None
        doc["updatedAt"] = doc["updatedAt"].isoformat() if doc.get("updatedAt") else None
        out.append(doc)
    return out


# ── PATCH /api/admin-marks-edit ──────────────────────────────────
class AdminMarksEditRequest(BaseModel):
    progressId: str
    score: float = Field(..., ge=0, le=100)


@router.patch("/admin-marks-edit", response_model=ProgressInDB)
async def admin_marks_edit(
    payload: AdminMarksEditRequest,
    admin: UserInDB = Depends(require_role("admin")),
):
    updated = await get_database().progresses.find_one_and_update(
        {"_id": _oid(payload.progressId, "progressId")},
        {"$set": {"score": payload.score, "updatedAt": _utcnow()}},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Progress not found")
    await log_action(
        actorId=admin.id,
        action="admin_marks_edit",
        target=payload.progressId,
        meta={"score": payload.score},
    )
    return ProgressInDB(**updated)


# ── POST /api/admin-verify-payment ───────────────────────────────
class AdminVerifyPaymentRequest(BaseModel):
    paymentId: str


@router.post("/admin-verify-payment")
async def admin_verify_payment(
    payload: AdminVerifyPaymentRequest,
    admin: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    payment = await db.payments.find_one(
        {"_id": _oid(payload.paymentId, "paymentId")}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Not found")

    now = _utcnow()
    updated = await db.payments.find_one_and_update(
        {"_id": payment["_id"]},
        {
            "$set": {
                "status": "success",
                "verifiedBy": ObjectId(admin.id),
                "verifiedAt": now,
                "updatedAt": now,
            }
        },
        return_document=True,
    )
    await db.enrollments.update_one(
        {
            "studentId": payment["studentId"],
            "courseId": payment["courseId"],
        },
        {
            "$set": {
                "paymentStatus": "paid",
                "currentSessionOrder": 1,
                "updatedAt": now,
            }
        },
        upsert=True,
    )
    await log_action(
        actorId=admin.id,
        action="admin_verify_payment",
        target=str(payment["_id"]),
    )

    updated["_id"] = str(updated["_id"])
    updated["studentId"] = str(updated["studentId"])
    updated["courseId"] = str(updated["courseId"])
    if updated.get("verifiedBy"):
        updated["verifiedBy"] = str(updated["verifiedBy"])
    for k in ("createdAt", "updatedAt", "verifiedAt"):
        if updated.get(k):
            updated[k] = updated[k].isoformat()
    return updated
