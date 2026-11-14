from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

MediaVisibility = Literal["public", "private", "course"]
MediaContext = Literal["homepage", "course", "submission", "avatar", "other"]


class MediaAssetInDB(BaseModel):
    """Cloudinary-backed media asset record. The actual bytes live on
    Cloudinary; this document tracks ownership, visibility, and usage."""
    id: PyObjectId = Field(alias="_id")
    filename: str
    url: str
    publicId: str = ""
    resourceType: Literal["image", "video", "raw"] = "image"
    format: str = ""
    bytes: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    folder: str = ""
    uploadedBy: PyObjectId
    visibility: MediaVisibility = "private"
    context: MediaContext = "other"
    contextId: Optional[str] = None  # e.g. course id, homepage
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
