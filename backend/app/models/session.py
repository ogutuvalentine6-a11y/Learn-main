from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class Quiz(BaseModel):
    question: str
    options: list[str] = Field(..., min_length=2)
    correctIndex: int = Field(..., ge=0)
    timerSeconds: int = Field(default=300, gt=0)
    passMark: int = Field(default=50, ge=0, le=100)


class SessionCreate(BaseModel):
    courseId: str
    moduleId: Optional[str] = None  # added by v1.5.0
    orderIndex: int = Field(..., gt=0)
    title: str = Field(..., min_length=2)
    notes: str = ""
    materialUrls: list[str] = []
    quiz: Optional[Quiz] = None


class SessionInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: PyObjectId
    moduleId: Optional[str] = None  # added by v1.5.0
    moduleId: Optional[str] = None
    orderIndex: int
    title: str
    notes: str = ""
    materialUrls: list[str] = []
    quiz: Optional[Quiz] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
