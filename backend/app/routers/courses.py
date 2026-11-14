from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.course import CourseCreate, CourseInDB
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["courses"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/course-list", response_model=list[CourseInDB])
async def course_list():
    """Public. Returns active courses sorted by createdAt desc."""
    cursor = get_database().courses.find({"isActive": True}).sort("createdAt", -1)
    out = []
    async for doc in cursor:
        out.append(CourseInDB(**doc))
    return out


@router.post("/course-create", response_model=CourseInDB, status_code=201)
async def course_create(
    payload: CourseCreate,
    admin: UserInDB = Depends(require_role("admin")),
):
    now = _utcnow()
    doc = {
        "title": payload.title,
        "description": payload.description,
        "price": payload.price,
        "createdBy": ObjectId(admin.id),
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().courses.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=admin.id,
        action="course_create",
        target=str(result.inserted_id),
    )
    return CourseInDB(**doc)


@router.patch("/course-update", response_model=CourseInDB)
async def course_update(
    request: Request,
    admin: UserInDB = Depends(require_role("admin")),
):
    body: dict[str, Any] = await request.json()
    course_id = body.pop("courseId", None)
    if not course_id:
        raise HTTPException(status_code=400, detail="courseId required")

    try:
        oid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid courseId")

    updates = {**body, "updatedAt": _utcnow()}
    updated = await get_database().courses.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Course not found")

    await log_action(actorId=admin.id, action="course_update", target=course_id)
    return CourseInDB(**updated)


@router.delete("/course-delete")
async def course_delete(
    request: Request,
    admin: UserInDB = Depends(require_role("admin")),
):
    body = await request.json()
    course_id = body.get("courseId")
    if not course_id:
        raise HTTPException(status_code=400, detail="courseId required")

    try:
        oid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid courseId")

    # Soft delete: isActive=false (matches legacy course-delete.ts)
    await get_database().courses.update_one(
        {"_id": oid},
        {"$set": {"isActive": False, "updatedAt": _utcnow()}},
    )
    await log_action(actorId=admin.id, action="course_delete", target=course_id)
    return {"ok": True}
