from datetime import datetime

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class StaffAssignmentInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    staffId: PyObjectId
    courseId: PyObjectId
    assignedBy: PyObjectId
    assignedAt: datetime
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
