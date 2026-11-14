"""Gamification service — award points and badges idempotently.

Every call is safe to retry: points_events has a unique index on
(userId, reason, entityId), and user_badges has a unique index on
(userId, badgeId). Duplicate awards are silently swallowed.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import get_database
from app.models.gamification import BADGE_DEFINITIONS, POINT_VALUES

logger = logging.getLogger("learn.gamification")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def award_points(
    user_id: str, reason: str, entity_id: str, points: int | None = None,
) -> bool:
    """Idempotent point award. Returns True if newly awarded."""
    if points is None:
        points = POINT_VALUES.get(reason, 0)
    if points <= 0:
        return False
    try:
        await get_database().points_events.insert_one({
            "userId": ObjectId(user_id),
            "reason": reason,
            "points": points,
            "entityId": str(entity_id),
            "createdAt": _utcnow(),
        })
        return True
    except DuplicateKeyError:
        return False
    except Exception as exc:
        logger.warning("award_points failed: %s", exc)
        return False


async def award_badge(user_id: str, badge_id: str) -> bool:
    """Idempotent badge award. Returns True if newly earned."""
    if badge_id not in BADGE_DEFINITIONS:
        logger.warning("Unknown badge: %s", badge_id)
        return False
    try:
        await get_database().user_badges.insert_one({
            "userId": ObjectId(user_id),
            "badgeId": badge_id,
            "earnedAt": _utcnow(),
        })
        return True
    except DuplicateKeyError:
        return False
    except Exception as exc:
        logger.warning("award_badge failed: %s", exc)
        return False


async def get_total_points(user_id: str) -> int:
    result = await get_database().points_events.aggregate([
        {"$match": {"userId": ObjectId(user_id)}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}},
    ]).to_list(1)
    return int(result[0]["total"]) if result else 0


async def get_user_badges(user_id: str) -> set[str]:
    ids = await get_database().user_badges.distinct(
        "badgeId", {"userId": ObjectId(user_id)}
    )
    return set(ids)


async def count_user_certificates(user_id: str) -> int:
    return await get_database().certificates.count_documents(
        {"studentId": ObjectId(user_id)}
    )


async def count_user_replies(user_id: str) -> int:
    return await get_database().replies.count_documents(
        {"authorId": ObjectId(user_id)}
    )
