"""Finance helpers — invoice generation, refunds."""
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.db.mongodb import get_database

logger = logging.getLogger("learn.finance")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _next_invoice_number() -> str:
    """Generate the next sequential invoice number.

    Uses an atomic counter collection so parallel writes never collide.
    Format: INV-{year}-{6-digit sequence}
    """
    year = datetime.now(timezone.utc).year
    db = get_database()
    counter_key = f"invoice_{year}"
    result = await db.counters.find_one_and_update(
        {"_id": counter_key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = result["seq"]
    return f"INV-{year}-{seq:06d}"


async def create_invoice_from_payment(payment: dict) -> Optional[dict]:
    """Create an invoice for a successful payment. Idempotent.

    Returns the invoice document or None if payment is not eligible.
    """
    if payment.get("status") != "success":
        return None

    db = get_database()
    pid = payment["_id"]

    existing = await db.invoices.find_one({"paymentId": pid})
    if existing:
        return existing

    student = await db.users.find_one({"_id": payment["studentId"]})
    course = await db.courses.find_one({"_id": payment["courseId"]})
    if not student or not course:
        logger.warning(f"Cannot build invoice for payment {pid}: missing user/course")
        return None

    try:
        number = await _next_invoice_number()
    except Exception as exc:
        logger.error(f"Invoice number generation failed: {exc}")
        return None

    now = _utcnow()
    doc = {
        "invoiceNumber": number,
        "paymentId": pid,
        "studentId": payment["studentId"],
        "studentName": student.get("fullName", ""),
        "studentEmail": student.get("email", ""),
        "courseId": payment["courseId"],
        "courseTitle": course.get("title", ""),
        "amount": float(payment.get("amount", 0)),
        "currency": "NGN",
        "status": "paid",
        "reference": payment.get("reference", ""),
        "refundedAmount": 0.0,
        "refundedAt": None,
        "refundReason": "",
        "issuedAt": payment.get("verifiedAt") or now,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.invoices.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def refund_invoice(
    invoice_id: str, amount: float, reason: str, refunded_by: str,
) -> dict:
    """Record a refund against an invoice. Idempotency: invoice status
    must be 'paid' or 'partially_refunded', and cumulative refunds cannot
    exceed the original amount."""
    db = get_database()
    inv = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not inv:
        raise ValueError("Invoice not found")
    if inv["status"] == "refunded":
        raise ValueError("Invoice already fully refunded")

    already = inv.get("refundedAmount", 0.0)
    new_total = already + amount
    if new_total > inv["amount"] + 0.01:  # 1-cent tolerance
        raise ValueError(
            f"Refund {amount} exceeds remaining {inv['amount'] - already}"
        )

    now = _utcnow()
    is_full = abs(new_total - inv["amount"]) < 0.01
    new_status = "refunded" if is_full else "partially_refunded"

    updated = await db.invoices.find_one_and_update(
        {"_id": inv["_id"]},
        {"$set": {
            "refundedAmount": new_total,
            "refundedAt": now,
            "refundReason": reason or inv.get("refundReason", ""),
            "status": new_status,
            "updatedAt": now,
        }},
        return_document=True,
    )
    return updated
