from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.dependencies import get_current_user, get_optional_user, require_role, write_rate_guard
from app.models.reel import ReelCreate, ReelInDB
from app.models.user import UserInDB
from app.services.cloudinary_service import generate_upload_signature
from app.services.logger import log_action

router = APIRouter(prefix="/api/reels", tags=["reels"])
settings = get_settings()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


@router.get("/upload-signature")
async def upload_signature(auth: UserInDB = Depends(get_current_user)):
    if auth.role not in ("student", "staff", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    folder = f"learning-platform/reels/{auth.id}"
    sig = generate_upload_signature({"folder": folder, "resource_type": "video"})
    return {
        "signature": sig["signature"],
        "timestamp": sig["timestamp"],
        "folder": folder,
        "apiKey": settings.CLOUDINARY_API_KEY,
    }


@router.post("", response_model=ReelInDB, status_code=201)
async def reel_create(
    payload: ReelCreate,
    auth: UserInDB = Depends(get_current_user),
    _rl: None = Depends(write_rate_guard),
):
    if not payload.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl required")

    status = "approved" if auth.role in ("staff", "admin") else "pending"
    now = _utcnow()
    doc = {
        "title": payload.title,
        "description": payload.description,
        "videoUrl": payload.videoUrl,
        "thumbnailUrl": payload.thumbnailUrl,
        "publicId": payload.publicId,
        "durationSeconds": payload.durationSeconds,
        "category": payload.category,
        "tags": payload.tags,
        "courseId": payload.courseId,
        "ownerId": ObjectId(auth.id),
        "ownerName": auth.fullName,
        "ownerRole": auth.role,
        "status": status,
        "rejectionReason": "",
        "views": 0,
        "likes": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().reels.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="reel_create",
        target=str(result.inserted_id), meta={"status": status},
    )
    return ReelInDB(**doc)


@router.get("", response_model=list[ReelInDB])
async def reel_list(
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    mine: bool = Query(default=False),
    limit: int = Query(default=30, le=100),
    skip: int = Query(default=0, ge=0),
    auth: Optional[UserInDB] = Depends(get_optional_user),
):
    filt: dict = {}
    if category:
        filt["category"] = category
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]

    if mine:
        if not auth:
            raise HTTPException(status_code=401, detail="Login required")
        filt["ownerId"] = ObjectId(auth.id)
    else:
        # Public: only approved
        if not auth or auth.role != "admin":
            filt["status"] = "approved"

    cursor = (
        get_database().reels.find(filt)
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
    )
    out = []
    async for doc in cursor:
        out.append(ReelInDB(**doc))
    return out


@router.post("/{reel_id}/view")
async def reel_view(reel_id: str):
    """Fire-and-forget view counter — no auth required."""
    result = await get_database().reels.update_one(
        {"_id": _oid(reel_id)}, {"$inc": {"views": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.post("/{reel_id}/like")
async def reel_like(
    reel_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    rid = _oid(reel_id)
    reel = await db.reels.find_one({"_id": rid})
    if not reel:
        raise HTTPException(status_code=404, detail="Not found")

    like_doc = {"reelId": rid, "userId": ObjectId(auth.id)}
    try:
        await db.reel_likes.insert_one({
            **like_doc, "createdAt": _utcnow(),
        })
    except Exception:
        # Already liked — treat as idempotent success, remove it (toggle)
        await db.reel_likes.delete_one(like_doc)
        await db.reels.update_one({"_id": rid}, {"$inc": {"likes": -1}})
        return {"liked": False}

    await db.reels.update_one({"_id": rid}, {"$inc": {"likes": 1}})
    return {"liked": True}


@router.get("/{reel_id}/liked")
async def reel_liked(
    reel_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    doc = await get_database().reel_likes.find_one({
        "reelId": _oid(reel_id), "userId": ObjectId(auth.id),
    })
    return {"liked": bool(doc)}


@router.patch("/{reel_id}/approve", response_model=ReelInDB)
async def reel_approve(
    reel_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    updated = await get_database().reels.find_one_and_update(
        {"_id": _oid(reel_id)},
        {"$set": {"status": "approved", "rejectionReason": "", "updatedAt": _utcnow()}},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="reel_approve", target=reel_id)
    return ReelInDB(**updated)


@router.patch("/{reel_id}/reject", response_model=ReelInDB)
async def reel_reject(
    reel_id: str,
    auth: UserInDB = Depends(require_role("admin")),
    reason: str = Query(default=""),
):
    updated = await get_database().reels.find_one_and_update(
        {"_id": _oid(reel_id)},
        {"$set": {"status": "rejected", "rejectionReason": reason, "updatedAt": _utcnow()}},
        return_document=True,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="reel_reject", target=reel_id)
    return ReelInDB(**updated)


@router.delete("/{reel_id}")
async def reel_delete(
    reel_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    reel = await db.reels.find_one({"_id": _oid(reel_id)})
    if not reel:
        raise HTTPException(status_code=404, detail="Not found")
    if str(reel["ownerId"]) != auth.id and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.reels.delete_one({"_id": reel["_id"]})
    await db.reel_likes.delete_many({"reelId": reel["_id"]})
    await log_action(actorId=auth.id, action="reel_delete", target=reel_id)
    return {"ok": True}
