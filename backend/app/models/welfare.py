"""Student welfare — support tickets and counseling requests."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

TicketCategory = Literal["academic", "financial", "welfare", "counseling", "technical", "other"]
TicketStatus = Literal["open", "in_progress", "resolved", "closed"]
TicketPriority = Literal["low", "normal", "high", "urgent"]

# Categories where only admins can respond — protects privacy
SENSITIVE_CATEGORIES = {"counseling", "welfare"}


class TicketMessageInDB(BaseModel):
    """One message in a ticket thread."""
    id: str  # local uuid
    authorId: PyObjectId
    authorName: str
    authorRole: Literal["student", "staff", "admin"]
    body: str
    internalNote: bool = False  # staff-only note, hidden from student
    createdAt: datetime


class TicketInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    studentId: PyObjectId
    studentName: str
    studentEmail: str
    category: TicketCategory
    subject: str
    status: TicketStatus = "open"
    priority: TicketPriority = "normal"
    messages: list[TicketMessageInDB] = []
    assignedTo: Optional[PyObjectId] = None
    assignedToName: str = ""
    resolvedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class TicketCreate(BaseModel):
    category: TicketCategory = "other"
    subject: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=5, max_length=5000)
    priority: TicketPriority = "normal"


class TicketReply(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    internalNote: bool = False


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    assignedTo: Optional[str] = None  # admin id, optional
