from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

EnrollmentPaymentStatus = Literal["pending", "paid", "failed"]


class EnrollmentInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    studentId: PyObjectId
    courseId: PyObjectId
    paymentStatus: EnrollmentPaymentStatus = "pending"
    currentSessionOrder: int = 1
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
