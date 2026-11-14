from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

ProgressStatus = Literal[
    "locked",
    "unlocked",
    "in_progress",
    "passed",
    "failed",
    "awaiting_review",
]


class ProgressInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    studentId: PyObjectId
    courseId: PyObjectId
    sessionId: PyObjectId
    status: ProgressStatus = "locked"
    score: Optional[float] = None
    uploadUrl: Optional[str] = None
    quizStartedAt: Optional[datetime] = None
    submittedAt: Optional[datetime] = None
    reviewedBy: Optional[PyObjectId] = None
    reviewNote: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
