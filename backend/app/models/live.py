from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator
from app.core.validators import validate_http_url

from app.models._types import PyObjectId

LiveProvider = Literal["jitsi", "livekit", "custom"]
LiveStatus = Literal["scheduled", "cancelled", "ended"]


class LiveSessionInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    description: str = ""
    courseId: Optional[str] = None
    hostId: PyObjectId
    hostName: str
    scheduledAt: datetime
    durationMinutes: int = 60
    provider: LiveProvider = "jitsi"
    roomName: str
    joinUrl: str
    status: LiveStatus = "scheduled"
    materials: list[str] = []  # Cloudinary urls
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class LiveSessionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=140)
    description: str = ""
    courseId: Optional[str] = None
    scheduledAt: datetime
    durationMinutes: int = Field(default=60, ge=15, le=480)
    materials: list[str] = []

    @field_validator("materials")
    @classmethod
    def _check_materials(cls, v: list[str]) -> list[str]:
        return [validate_http_url(u) for u in v]


class LiveSessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduledAt: Optional[datetime] = None
    durationMinutes: Optional[int] = None
    materials: Optional[list[str]] = None


class LiveAttendanceInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    sessionId: PyObjectId
    userId: PyObjectId
    userName: str
    userRole: Literal["student", "staff", "admin"]
    joinedAt: datetime
    leftAt: Optional[datetime] = None
    durationSeconds: int = 0

    model_config = {"populate_by_name": True}
