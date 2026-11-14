import logging
from datetime import datetime, timezone

from bson import ObjectId

from app.db.mongodb import get_database

logger = logging.getLogger("learn")
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def log_action(
    *, actorId: str | None, action: str, target: str, meta: dict | None = None
) -> None:
    """Mirror of lib/logger.ts logAction — never raises."""
    try:
        actor_oid = ObjectId(actorId) if actorId else None
    except Exception:
        actor_oid = None

    try:
        now = _utcnow()
        await get_database().logs.insert_one(
            {
                "actorId": actor_oid,
                "action": action,
                "target": target,
                "meta": meta or {},
                "createdAt": now,
                "updatedAt": now,
            }
        )
    except Exception as exc:
        logger.error("logAction failed: %s", exc)
