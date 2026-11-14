"""Attendance records — one per student per slot per date."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

AttendanceStatus = Literal["present", "absent", "late", "excused"]


class AttendanceRecordInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    slotId: PyObjectId
    courseId: PyObjectId
    date: str  # YYYY-MM-DD — string for cheap uniqueness + day queries
    studentId: PyObjectId
    studentName: str
    status: AttendanceStatus
    note: str = ""
    markedBy: PyObjectId
    markedByName: str = ""
    markedAt: datetime

    model_config = {"populate_by_name": True}


class AttendanceMarkItem(BaseModel):
    studentId: str
    status: AttendanceStatus
    note: str = Field(default="", max_length=500)


class AttendanceMarkRequest(BaseModel):
    slotId: str
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    records: list[AttendanceMarkItem] = Field(..., min_length=1)
