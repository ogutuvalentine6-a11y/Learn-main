from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models._types import PyObjectId

AdmissionStatus = Literal["pending", "approved", "rejected"]


class AdmissionApplicationInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    fullName: str
    email: EmailStr
    phone: str
    idNumber: str
    location: str
    school: str
    fieldOfStudy: str
    courseOfStudy: str
    desiredCourseId: Optional[str] = None
    motivation: str = ""
    status: AdmissionStatus = "pending"
    reviewedBy: Optional[PyObjectId] = None
    reviewedAt: Optional[datetime] = None
    reviewNote: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class AdmissionApplicationCreate(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=30)
    idNumber: str = Field(..., min_length=3, max_length=30)
    location: str = Field(..., min_length=2, max_length=100)
    school: str = Field(..., min_length=2, max_length=150)
    fieldOfStudy: str = Field(..., min_length=2, max_length=100)
    courseOfStudy: str = Field(..., min_length=2, max_length=100)
    desiredCourseId: Optional[str] = None
    motivation: str = Field(default="", max_length=2000)
