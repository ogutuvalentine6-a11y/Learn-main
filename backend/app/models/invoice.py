"""Invoice model — auto-generated when a payment is confirmed.

An invoice is the immutable record of a transaction. Refunds reference
the invoice but never delete it (financial audit trail).
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

InvoiceStatus = Literal["paid", "refunded", "partially_refunded"]


class InvoiceInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    invoiceNumber: str  # human-readable, unique, e.g. INV-2026-000123
    paymentId: PyObjectId
    studentId: PyObjectId
    studentName: str
    studentEmail: str
    courseId: PyObjectId
    courseTitle: str
    amount: float
    currency: str = "NGN"
    status: InvoiceStatus = "paid"
    reference: str  # paystack reference
    refundedAmount: float = 0.0
    refundedAt: Optional[datetime] = None
    refundReason: str = ""
    issuedAt: datetime
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class RefundRequest(BaseModel):
    amount: float = Field(..., gt=0)
    reason: str = Field(default="", max_length=500)
