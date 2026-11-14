from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user
from app.models.notification import NotificationInDB
from app.models.user import UserInDB

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def create_notification(
    user_id: str, kind: str, title: str, body: str = "", link: str = "",
) -> None:
    """Fire-and-forget notification creation. Never raises."""
    try:
        await get_database().notifications.insert_one({
            "userId": ObjectId(user_id),
            "kind": kind,
            "title": title,
            "body": body,
            "link": link,
            "read": False,
            "createdAt": _utcnow(),
        })
    except Exception:
        pass


@router.get("", response_model=list[NotificationInDB])
async def notifications_list(
    unreadOnly: bool = Query(default=False),
    limit: int = Query(default=30, le=100),
    auth: UserInDB = Depends(get_current_user),
):
    filt: dict = {"userId": ObjectId(auth.id)}
    if unreadOnly:
        filt["read"] = False
    cursor = (
        get_database().notifications.find(filt).sort("createdAt", -1).limit(limit)
    )
    out = []
    async for n in cursor:
        out.append(NotificationInDB(**n))
    return out


@router.get("/unread-count")
async def unread_count(auth: UserInDB = Depends(get_current_user)):
    count = await get_database().notifications.count_documents({
        "userId": ObjectId(auth.id), "read": False,
    })
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    result = await get_database().notifications.update_one(
        {"_id": oid, "userId": ObjectId(auth.id)},
        {"$set": {"read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(auth: UserInDB = Depends(get_current_user)):
    result = await get_database().notifications.update_many(
        {"userId": ObjectId(auth.id), "read": False},
        {"$set": {"read": True}},
    )
    return {"marked": result.modified_count}
