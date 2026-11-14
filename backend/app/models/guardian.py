from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class GuardianLinkInDB(BaseModel):
    """Links a guardian user to a student user. Read-only relationship."""
    id: PyObjectId = Field(alias="_id")
    guardianId: PyObjectId
    studentId: PyObjectId
    relationship: str = "parent"  # parent | guardian | sponsor | other
    linkedBy: PyObjectId  # admin who created the link
    linkedAt: datetime

    model_config = {"populate_by_name": True}


class GuardianLinkCreate(BaseModel):
    guardianId: str
    studentId: str
    relationship: str = Field(default="parent", max_length=30)


class GuardianCreate(BaseModel):
    """Admin creates a guardian account + first link in one call."""
    fullName: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=200)
    phone: str = Field(..., min_length=7, max_length=30)
    idNumber: str = Field(..., min_length=3, max_length=30)
    studentId: str  # initial student to link
    relationship: str = Field(default="parent", max_length=30)
