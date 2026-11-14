"""High-level notification helpers — fire-and-forget, never raise.

Wraps the low-level create_notification() so callers don't need to
import the notifications router or handle bulk-enrollment lookups.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId

from app.db.mongodb import get_database

logger = logging.getLogger("learn.notifier")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def notify_user(
    user_id: str, kind: str, title: str, body: str = "", link: str = "",
) -> None:
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
    except Exception as exc:
        logger.warning("notify_user failed: %s", exc)


async def notify_course_students(
    course_id: str, kind: str, title: str, body: str = "", link: str = "",
) -> int:
    """Notify every paid-enrolled student in a course.

    Returns count of notifications created. Never raises.
    """
    if not course_id:
        return 0
    try:
        db = get_database()
        cid = ObjectId(course_id)
        cursor = db.enrollments.find(
            {"courseId": cid, "paymentStatus": "paid"},
            {"studentId": 1},
        )
        docs = []
        now = _utcnow()
        async for e in cursor:
            docs.append({
                "userId": e["studentId"],
                "kind": kind,
                "title": title,
                "body": body,
                "link": link,
                "read": False,
                "createdAt": now,
            })
        if docs:
            await db.notifications.insert_many(docs)
        return len(docs)
    except Exception as exc:
        logger.warning("notify_course_students failed: %s", exc)
        return 0
