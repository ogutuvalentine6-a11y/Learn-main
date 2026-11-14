from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

ResourceVisibility = Literal["private", "course", "public"]
ResourceStatus = Literal["pending", "approved", "rejected"]
ResourceKind = Literal["document", "image", "video", "audio", "other"]

CATEGORIES = [
    "Programming", "Mathematics", "Science", "Business",
    "Engineering", "Languages", "Career", "Study Skills", "General",
]


class ResourceInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    description: str = ""
    url: str
    publicId: str = ""
    format: str = ""
    bytes: int = 0
    kind: ResourceKind = "other"
    category: str = "General"
    courseId: Optional[str] = None
    ownerId: PyObjectId
    ownerName: str
    ownerRole: Literal["student", "staff", "admin"]
    visibility: ResourceVisibility = "private"
    status: ResourceStatus = "pending"
    rejectionReason: str = ""
    downloads: int = 0
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=2)
    description: str = ""
    url: str
    publicId: str = ""
    format: str = ""
    bytes: int = 0
    kind: ResourceKind = "other"
    category: str = "General"
    courseId: Optional[str] = None
    visibility: ResourceVisibility = "private"
