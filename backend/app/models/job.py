from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

JobStatus = Literal["draft", "published", "closed"]
JobType = Literal["internship", "full-time", "part-time", "contract", "volunteer"]


class JobInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    company: str
    location: str = ""
    jobType: JobType = "internship"
    description: str = ""
    requirements: list[str] = []
    salary: str = ""
    applyUrl: str
    deadline: Optional[datetime] = None
    featured: bool = False
    status: JobStatus = "draft"
    postedBy: PyObjectId
    postedByName: str = ""
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)
    jobType: JobType = "internship"
    description: str = Field(default="", max_length=5000)
    requirements: list[str] = []
    salary: str = Field(default="", max_length=100)
    applyUrl: str = Field(..., min_length=5, max_length=500)
    deadline: Optional[datetime] = None
    featured: bool = False
    status: JobStatus = "draft"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    jobType: Optional[JobType] = None
    description: Optional[str] = None
    requirements: Optional[list[str]] = None
    salary: Optional[str] = None
    applyUrl: Optional[str] = None
    deadline: Optional[datetime] = None
    featured: Optional[bool] = None
    status: Optional[JobStatus] = None
