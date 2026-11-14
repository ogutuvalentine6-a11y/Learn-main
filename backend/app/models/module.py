from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class ModuleInDB(BaseModel):
    """A Module groups Sessions within a Course.

    Backward compatibility: existing Sessions have no moduleId and
    continue to work as standalone. New Sessions can optionally
    belong to a Module.
    """
    id: PyObjectId = Field(alias="_id")
    courseId: PyObjectId
    title: str
    description: str = ""
    orderIndex: int
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class ModuleCreate(BaseModel):
    courseId: str
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(default="", max_length=2000)
    orderIndex: int = Field(..., ge=1)


class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    # orderIndex intentionally excluded — use /move-up /move-down
