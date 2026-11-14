"""Weekly timetable slots.

A slot is a recurring weekly event: "CS101 meets Mon 09:00-10:30 in Room A
with Dr. Ogutu during the 2026 Spring semester."
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models._types import PyObjectId


def _validate_time(v: str) -> str:
    """HH:MM 24-hour format."""
    if not isinstance(v, str) or len(v) != 5 or v[2] != ":":
        raise ValueError("Time must be HH:MM (24-hour)")
    try:
        hh = int(v[:2])
        mm = int(v[3:])
    except ValueError:
        raise ValueError("Time must be HH:MM with numeric parts")
    if not (0 <= hh <= 23):
        raise ValueError("Hour must be 00-23")
    if not (0 <= mm <= 59):
        raise ValueError("Minute must be 00-59")
    return v


def _time_to_minutes(t: str) -> int:
    return int(t[:2]) * 60 + int(t[3:])


class TimetableSlotInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: PyObjectId
    courseTitle: str  # denormalized for fast reads
    instructorId: PyObjectId
    instructorName: str  # denormalized
    dayOfWeek: int  # 0=Monday ... 6=Sunday (ISO)
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    room: str = ""
    semesterId: Optional[PyObjectId] = None
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class TimetableSlotCreate(BaseModel):
    courseId: str
    instructorId: Optional[str] = None  # defaults to course creator
    dayOfWeek: int = Field(..., ge=0, le=6)
    startTime: str
    endTime: str
    room: str = Field(default="", max_length=100)
    semesterId: Optional[str] = None

    @field_validator("startTime", "endTime")
    @classmethod
    def _check_time(cls, v: str) -> str:
        return _validate_time(v)

    def model_post_init(self, __context) -> None:
        if _time_to_minutes(self.endTime) <= _time_to_minutes(self.startTime):
            raise ValueError("endTime must be after startTime")


class TimetableSlotUpdate(BaseModel):
    instructorId: Optional[str] = None
    dayOfWeek: Optional[int] = Field(default=None, ge=0, le=6)
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    room: Optional[str] = Field(default=None, max_length=100)
    semesterId: Optional[str] = None
    isActive: Optional[bool] = None

    @field_validator("startTime", "endTime")
    @classmethod
    def _check_time(cls, v: Optional[str]) -> Optional[str]:
        return _validate_time(v) if v is not None else v
