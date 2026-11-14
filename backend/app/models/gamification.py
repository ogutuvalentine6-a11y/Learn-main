"""Gamification domain — badges, points, leaderboard."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

# ── Badge catalogue (definitions are static, not admin-editable) ──
BADGE_DEFINITIONS: dict[str, dict] = {
    "first_enrollment": {
        "name": "First Steps",
        "description": "Enrolled in your first course",
        "icon": "🎓",
    },
    "first_quiz_pass": {
        "name": "Quiz Champion",
        "description": "Passed your first quiz",
        "icon": "🏆",
    },
    "perfect_score": {
        "name": "Perfectionist",
        "description": "Scored 100% on a quiz",
        "icon": "💯",
    },
    "first_submission": {
        "name": "Dedicated Learner",
        "description": "Submitted your first assignment",
        "icon": "📝",
    },
    "course_complete": {
        "name": "Course Graduate",
        "description": "Completed your first course",
        "icon": "🎉",
    },
    "three_courses": {
        "name": "Multi-Skilled",
        "description": "Completed three courses",
        "icon": "🌟",
    },
    "discussion_starter": {
        "name": "Community Voice",
        "description": "Started your first discussion",
        "icon": "💬",
    },
    "helpful_peer": {
        "name": "Helpful Peer",
        "description": "Replied to five discussions",
        "icon": "🤝",
    },
}

# Points awarded per action (persisted as points_events, unique per entity)
POINT_VALUES = {
    "quiz_pass": 20,
    "quiz_perfect_bonus": 50,
    "assignment_submission": 10,
    "assignment_high_grade": 30,
    "discussion_thread": 5,
    "discussion_reply": 2,
    "course_complete": 100,
}


class PointsEventInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    userId: PyObjectId
    reason: str  # e.g. "quiz_pass"
    points: int
    entityId: str  # e.g. quiz_attempt_id — makes awards idempotent
    createdAt: datetime

    model_config = {"populate_by_name": True}


class UserBadgeInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    userId: PyObjectId
    badgeId: str
    earnedAt: datetime

    model_config = {"populate_by_name": True}


class BadgeView(BaseModel):
    """Enriched badge view for API responses."""
    badgeId: str
    name: str
    description: str
    icon: str
    earned: bool
    earnedAt: Optional[datetime] = None
