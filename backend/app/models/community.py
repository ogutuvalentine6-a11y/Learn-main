from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

ThreadKind = Literal["question", "discussion", "announcement"]


class ThreadInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: Optional[str] = None
    title: str
    body: str
    kind: ThreadKind = "discussion"
    authorId: PyObjectId
    authorName: str
    authorRole: Literal["student", "staff", "admin"]
    pinned: bool = False
    locked: bool = False
    views: int = 0
    replyCount: int = 0
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class ThreadCreate(BaseModel):
    courseId: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=5, max_length=10000)
    kind: ThreadKind = "discussion"


class ReplyInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    threadId: PyObjectId
    parentReplyId: Optional[PyObjectId] = None
    body: str
    authorId: PyObjectId
    authorName: str
    authorRole: Literal["student", "staff", "admin"]
    createdAt: datetime

    model_config = {"populate_by_name": True}


class ReplyCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    parentReplyId: Optional[str] = None


class StudyGroupInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    courseId: Optional[str] = None
    name: str
    description: str = ""
    ownerId: PyObjectId
    ownerName: str
    memberIds: list[str] = []
    maxMembers: int = 10
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class StudyGroupCreate(BaseModel):
    courseId: Optional[str] = None
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(default="", max_length=2000)
    maxMembers: int = Field(default=10, ge=2, le=100)
