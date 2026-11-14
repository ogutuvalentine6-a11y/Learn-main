import json
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.payment import PaymentInDB
from app.models.user import UserInDB
from app.services import paystack_service as paystack
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["payments"])
settings = get_settings()


class PaystackInitRequest(BaseModel):
    courseId: str


class PaystackVerifyRequest(BaseModel):
    reference: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── paystack-initialize ────────────────────────────────────────────
@router.post("/paystack-initialize")
async def paystack_initialize(
    payload: PaystackInitRequest,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    try:
        course_oid = ObjectId(payload.courseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid courseId")

    course = await db.courses.find_one({"_id": course_oid})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    user = await db.users.find_one({"_id": ObjectId(auth.id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Legacy reference format
    reference = f"LP-{int(_utcnow().timestamp() * 1000)}-{auth.id[-6:]}"
    amount_naira = float(course["price"])
    amount_kobo = int(round(amount_naira * 100))

    callback_url = f"{settings.FRONTEND_URL}/student/courses?ref={reference}"
    metadata = {"courseId": str(course["_id"]), "studentId": auth.id}

    init = await paystack.initialize_payment(
        email=user["email"],
        amount_kobo=amount_kobo,
        reference=reference,
        callback_url=callback_url,
        metadata=metadata,
    )

    now = _utcnow()
    await db.payments.insert_one(
        {
            "studentId": ObjectId(auth.id),
            "courseId": course["_id"],
            "amount": amount_naira,  # NAIRA in DB
            "reference": reference,
            "status": "pending",
            "verifiedBy": None,
            "verifiedAt": None,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    await db.enrollments.update_one(
        {"studentId": ObjectId(auth.id), "courseId": course["_id"]},
        {
            "$set": {"paymentStatus": "pending", "updatedAt": now},
            "$setOnInsert": {
                "studentId": ObjectId(auth.id),
                "courseId": course["_id"],
                "currentSessionOrder": 1,
                "completedAt": None,
                "createdAt": now,
            },
        },
        upsert=True,
    )

    return {
        "authorization_url": init["data"]["authorization_url"],
        "reference": reference,
    }


# ── paystack-verify ────────────────────────────────────────────────
@router.post("/paystack-verify")
async def paystack_verify(
    payload: PaystackVerifyRequest,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    payment = await db.payments.find_one(
        {"reference": payload.reference, "studentId": ObjectId(auth.id)}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    result = await paystack.verify_payment(payload.reference)
    now = _utcnow()

    if not result.get("status") or result["data"]["status"] != "success":
        await db.payments.update_one(
            {"_id": payment["_id"]},
            {"$set": {"status": "failed", "updatedAt": now}},
        )
        raise HTTPException(status_code=400, detail="Payment not successful")

    await db.payments.update_one(
        {"_id": payment["_id"]},
        {
            "$set": {
                "status": "success",
                "verifiedAt": now,
                "updatedAt": now,
            }
        },
    )
    await db.enrollments.update_one(
        {"studentId": ObjectId(auth.id), "courseId": payment["courseId"]},
        {
            "$set": {
                "paymentStatus": "paid",
                "currentSessionOrder": 1,
                "updatedAt": now,
            }
        },
        upsert=True,
    )
    return {"ok": True}


# ── paystack-webhook (unauthenticated, HMAC-verified) ─────────────
@router.post("/paystack-webhook", status_code=200)
async def paystack_webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("x-paystack-signature")
    if not paystack.verify_webhook_signature(raw, sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature"
        )

    try:
        event = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if event.get("event") != "charge.success":
        return {"ok": True}

    data = event.get("data", {})
    reference = data.get("reference")
    metadata = data.get("metadata") or {}
    if not reference or not metadata.get("studentId") or not metadata.get("courseId"):
        return {"ok": True}

    db = get_database()
    payment = await db.payments.find_one({"reference": reference})
    if not payment or payment.get("status") == "success":
        return {"ok": True}  # idempotent

    now = _utcnow()
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": "success", "verifiedAt": now, "updatedAt": now}},
    )
    await db.enrollments.update_one(
        {
            "studentId": ObjectId(metadata["studentId"]),
            "courseId": ObjectId(metadata["courseId"]),
        },
        {
            "$set": {
                "paymentStatus": "paid",
                "currentSessionOrder": 1,
                "updatedAt": now,
            }
        },
        upsert=True,
    )
    return {"ok": True}
