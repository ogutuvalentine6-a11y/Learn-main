from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

PaymentStatus = Literal["pending", "success", "failed"]


class PaymentInDB(BaseModel):
    """Mongoose Payment. amount is in NAIRA, not kobo."""
    id: PyObjectId = Field(alias="_id")
    studentId: PyObjectId
    courseId: PyObjectId
    amount: float
    reference: str
    status: PaymentStatus = "pending"
    verifiedBy: Optional[PyObjectId] = None
    verifiedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
