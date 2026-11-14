from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.dependencies import get_current_user, get_optional_user, require_role, write_rate_guard
from app.models.resource import ResourceCreate, ResourceInDB
from app.models.user import UserInDB
from app.services.cloudinary_service import generate_upload_signature
from app.services.logger import log_action

router = APIRouter(prefix="/api/resources", tags=["resources"])
settings = get_settings()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _auto_status(role: str, visibility: str) -> str:
    """Trust rules: staff/admin auto-approved; students need review for shared."""
    if role in ("staff", "admin"):
        return "approved"
    if visibility == "private":
        return "approved"  # only owner sees it anyway
    return "pending"


def _can_view(res: dict, user: Optional[UserInDB]) -> bool:
    # Owner or admin always sees
    if user:
        if str(res.get("ownerId")) == user.id or user.role == "admin":
            return True
    # Public + approved = everyone
    if res["visibility"] == "public" and res["status"] == "approved":
        return True
    # Course-scoped requires enrollment check (caller handles for auth case)
    if res["visibility"] == "course" and user and res["status"] == "approved":
        return True  # refinement below
    return False


@router.get("/upload-signature")
async def upload_signature(auth: UserInDB = Depends(get_current_user)):
    folder = f"learning-platform/resources/{auth.id}"
    sig = generate_upload_signature({"folder": folder})
    return {
        "signature": sig["signature"],
        "timestamp": sig["timestamp"],
        "folder": folder,
        "apiKey": settings.CLOUDINARY_API_KEY,
    }


@router.post("", response_model=ResourceInDB, status_code=201)
async def resource_create(
    payload: ResourceCreate,
    auth: UserInDB = Depends(get_current_user),
    _rl: None = Depends(write_rate_guard),
):
    if payload.visibility == "course" and not payload.courseId:
        raise HTTPException(status_code=400, detail="courseId required for course visibility")

    now = _utcnow()
    status = _auto_status(auth.role, payload.visibility)
    doc = {
        "title": payload.title,
        "description": payload.description,
        "url": payload.url,
        "publicId": payload.publicId,
        "format": payload.format,
        "bytes": payload.bytes,
        "kind": payload.kind,
        "category": payload.category,
        "courseId": payload.courseId,
        "ownerId": ObjectId(auth.id),
        "ownerName": auth.fullName,
        "ownerRole": auth.role,
        "visibility": payload.visibility,
        "status": status,
        "rejectionReason": "",
        "downloads": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().resources.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="resource_create",
        target=str(result.inserted_id), meta={"visibility": payload.visibility},
    )
    return ResourceInDB(**doc)


async def _enrolled(user_id: str, course_id: str) -> bool:
    return bool(await get_database().enrollments.find_one({
        "studentId": ObjectId(user_id),
        "courseId": ObjectId(course_id),
        "paymentStatus": "paid",
    }))


async def _assigned_staff(user_id: str, course_id: str) -> bool:
    return bool(await get_database().staffassignments.find_one({
        "staffId": ObjectId(user_id),
        "courseId": ObjectId(course_id),
    }))


@router.get("", response_model=list[ResourceInDB])
async def resource_list(
    category: Optional[str] = Query(default=None),
    courseId: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    mine: bool = Query(default=False),
    limit: int = Query(default=100, le=200),
    auth: Optional[UserInDB] = Depends(get_optional_user),
):
    filt: dict = {}
    if category:
        filt["category"] = category
    if courseId:
        filt["courseId"] = courseId
    if kind:
        filt["kind"] = kind
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if mine:
        if not auth:
            raise HTTPException(status_code=401, detail="Login required")
        filt["ownerId"] = ObjectId(auth.id)

    cursor = get_database().resources.find(filt).sort("createdAt", -1).limit(limit)
    out = []
    async for doc in cursor:
        # Public filter for unauthenticated callers
        if not auth:
            if doc["visibility"] != "public" or doc["status"] != "approved":
                continue
        else:
            # Owner or admin: full visibility
            is_owner = str(doc["ownerId"]) == auth.id
            if not is_owner and auth.role != "admin":
                # Public+approved
                if doc["visibility"] == "public" and doc["status"] == "approved":
                    pass
                # Course+approved+enrolled-or-assigned
                elif doc["visibility"] == "course" and doc["status"] == "approved" and doc.get("courseId"):
                    ok = await _enrolled(auth.id, doc["courseId"])
                    if not ok and auth.role == "staff":
                        ok = await _assigned_staff(auth.id, doc["courseId"])
                    if not ok:
                        continue
                else:
                    continue
        out.append(ResourceInDB(**doc))
    return out


@router.post("/{resource_id}/download")
async def resource_download(
    resource_id: str,
    auth: Optional[UserInDB] = Depends(get_optional_user),
):
    db = get_database()
    doc = await db.resources.find_one({"_id": _oid(resource_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    is_owner = auth and str(doc["ownerId"]) == auth.id
    is_admin = auth and auth.role == "admin"

    if not is_owner and not is_admin:
        if doc["visibility"] == "public" and doc["status"] == "approved":
            pass
        elif doc["visibility"] == "course" and doc["status"] == "approved" and doc.get("courseId") and auth:
            ok = await _enrolled(auth.id, doc["courseId"])
            if not ok and auth.role == "staff":
                ok = await _assigned_staff(auth.id, doc["courseId"])
            if not ok:
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            raise HTTPException(status_code=403, detail="Forbidden")

    await db.resources.update_one(
        {"_id": doc["_id"]}, {"$inc": {"downloads": 1}}
    )
    return {"url": doc["url"]}


@router.delete("/{resource_id}")
async def resource_delete(
    resource_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    doc = await db.resources.find_one({"_id": _oid(resource_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if str(doc["ownerId"]) != auth.id and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.resources.delete_one({"_id": doc["_id"]})
    await log_action(
        actorId=auth.id, action="resource_delete", target=resource_id,
    )
    return {"ok": True}


@router.patch("/{resource_id}/approve", response_model=ResourceInDB)
async def resource_approve(
    resource_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    updated = await get_database().resources.find_one_and_update(
        {"_id": _oid(resource_id)},
        {"$set": {"status": "approved", "rejectionReason": "", "updatedAt": _utcnow()}},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="resource_approve", target=resource_id)
    return ResourceInDB(**updated)


@router.patch("/{resource_id}/reject", response_model=ResourceInDB)
async def resource_reject(
    resource_id: str,
    auth: UserInDB = Depends(require_role("admin")),
    reason: str = Query(default=""),
):
    updated = await get_database().resources.find_one_and_update(
        {"_id": _oid(resource_id)},
        {"$set": {"status": "rejected", "rejectionReason": reason, "updatedAt": _utcnow()}},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="resource_reject", target=resource_id)
    return ResourceInDB(**updated)
