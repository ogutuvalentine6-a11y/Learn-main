from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator
from app.core.validators import validate_http_url

from app.models._types import PyObjectId

ReelStatus = Literal["pending", "approved", "rejected"]


class ReelInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    description: str = ""
    videoUrl: str
    thumbnailUrl: str = ""
    publicId: str = ""
    durationSeconds: int = 0
    category: str = "General"
    tags: list[str] = []
    courseId: Optional[str] = None

    @field_validator("videoUrl", "thumbnailUrl")
    @classmethod
    def _check_urls(cls, v: str) -> str:
        return validate_http_url(v)
    ownerId: PyObjectId
    ownerName: str
    ownerRole: Literal["student", "staff", "admin"]
    status: ReelStatus = "pending"
    rejectionReason: str = ""
    views: int = 0
    likes: int = 0
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class ReelCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=140)
    description: str = Field(default="", max_length=1000)
    videoUrl: str
    thumbnailUrl: str = ""
    publicId: str = ""
    durationSeconds: int = 0
    category: str = "General"
    tags: list[str] = []
    courseId: Optional[str] = None

    @field_validator("videoUrl", "thumbnailUrl")
    @classmethod
    def _check_urls(cls, v: str) -> str:
        return validate_http_url(v)
