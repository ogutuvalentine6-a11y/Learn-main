from datetime import datetime

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    price: float = Field(..., ge=0)
    learningOutcomes: list[str] | None = None
    category: str | None = None


class CourseInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    title: str
    description: str
    price: float
    createdBy: PyObjectId
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
