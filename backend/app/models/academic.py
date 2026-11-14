"""Academic calendar domain — semesters and calendar events."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

SemesterStatus = Literal["draft", "active", "archived"]
EventType = Literal["holiday", "exam", "registration", "deadline", "orientation", "other"]


class SemesterInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str  # e.g. "2026 Spring", "Semester 1 2026"
    startDate: datetime
    endDate: datetime
    status: SemesterStatus = "draft"
    description: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class SemesterCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    startDate: datetime
    endDate: datetime
    description: str = Field(default="", max_length=2000)


class SemesterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    description: Optional[str] = Field(default=None, max_length=2000)


class CalendarEventInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    description: str = ""
    eventType: EventType = "other"
    startDate: datetime
    endDate: datetime
    semesterId: Optional[PyObjectId] = None  # None = global/always visible
    isPublic: bool = True
    createdBy: PyObjectId
    createdByName: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(default="", max_length=2000)
    eventType: EventType = "other"
    startDate: datetime
    endDate: datetime
    semesterId: Optional[str] = None
    isPublic: bool = True


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    eventType: Optional[EventType] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    semesterId: Optional[str] = None
    isPublic: Optional[bool] = None
