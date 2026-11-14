from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class AssignmentInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: PyObjectId
    sessionId: Optional[PyObjectId] = None
    title: str
    instructions: str = ""
    dueAt: Optional[datetime] = None
    maxScore: int = 100
    attachments: list[str] = []
    createdBy: PyObjectId
    createdByName: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class AssignmentCreate(BaseModel):
    courseId: str
    sessionId: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=200)
    instructions: str = ""
    dueAt: Optional[datetime] = None
    maxScore: int = Field(default=100, ge=1, le=1000)
    attachments: list[str] = []


class SubmissionInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    assignmentId: PyObjectId
    studentId: PyObjectId
    studentName: str
    fileUrl: str
    note: str = ""
    submittedAt: datetime
    score: Optional[int] = None
    feedback: str = ""
    gradedBy: Optional[PyObjectId] = None
    gradedAt: Optional[datetime] = None

    model_config = {"populate_by_name": True}


class SubmissionCreate(BaseModel):
    fileUrl: str
    note: str = ""


class SubmissionGrade(BaseModel):
    score: int = Field(..., ge=0)
    feedback: str = ""
