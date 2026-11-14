from bson import ObjectId
from fastapi import APIRouter, Depends, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user
from app.models.gamification import BADGE_DEFINITIONS, BadgeView
from app.models.user import UserInDB
from app.services.gamification import get_total_points, get_user_badges

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/me")
async def my_gamification(auth: UserInDB = Depends(get_current_user)):
    """Current user's points and badge progress."""
    db = get_database()
    uid = ObjectId(auth.id)

    earned = await get_user_badges(auth.id)
    points = await get_total_points(auth.id)

    # Build full badge catalogue with earned state
    badges: list[BadgeView] = []
    for badge_id, defn in BADGE_DEFINITIONS.items():
        earned_doc = None
        if badge_id in earned:
            earned_doc = await db.user_badges.find_one({
                "userId": uid, "badgeId": badge_id,
            })
        badges.append(BadgeView(
            badgeId=badge_id,
            name=defn["name"],
            description=defn["description"],
            icon=defn["icon"],
            earned=badge_id in earned,
            earnedAt=earned_doc["earnedAt"] if earned_doc else None,
        ))

    return {
        "points": points,
        "badges": [b.model_dump() for b in badges],
        "earnedCount": len(earned),
        "totalBadges": len(BADGE_DEFINITIONS),
    }


@router.get("/leaderboard")
async def leaderboard(
    limit: int = Query(default=20, le=100),
):
    """Top users by total points. Public read.

    Only shows fullName + points + badge count — no email, no PII.
    """
    db = get_database()
    pipe = [
        {"$group": {"_id": "$userId", "points": {"$sum": "$points"}}},
        {"$sort": {"points": -1}},
        {"$limit": limit},
    ]
    rows = await db.points_events.aggregate(pipe).to_list(length=limit)

    out = []
    for rank, row in enumerate(rows, start=1):
        user = await db.users.find_one(
            {"_id": row["_id"]}, {"fullName": 1, "role": 1, "school": 1},
        )
        if not user:
            continue
        badge_count = await db.user_badges.count_documents({"userId": row["_id"]})
        out.append({
            "rank": rank,
            "userId": str(row["_id"]),
            "fullName": user.get("fullName", "Anonymous"),
            "role": user.get("role", ""),
            "school": user.get("school", ""),
            "points": int(row["points"]),
            "badgeCount": badge_count,
        })
    return out
