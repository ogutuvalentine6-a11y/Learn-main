import csv
import io
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.invoice import InvoiceInDB, RefundRequest
from app.models.user import UserInDB
from app.services.finance import create_invoice_from_payment, refund_invoice
from app.services.logger import log_action

router = APIRouter(prefix="/api/finance", tags=["finance"])


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ── STUDENT: my invoices ────────────────────────────────────
@router.get("/invoices/my", response_model=list[InvoiceInDB])
async def my_invoices(auth: UserInDB = Depends(require_role("student"))):
    cursor = get_database().invoices.find(
        {"studentId": ObjectId(auth.id)}
    ).sort("issuedAt", -1)
    out = []
    async for inv in cursor:
        out.append(InvoiceInDB(**inv))
    return out


@router.get("/invoices/{invoice_id}", response_model=InvoiceInDB)
async def get_invoice(
    invoice_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    inv = await get_database().invoices.find_one({"_id": _oid(invoice_id)})
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    # Students can only see their own
    if auth.role == "student" and str(inv["studentId"]) != auth.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return InvoiceInDB(**inv)


# ── ADMIN: list + filter ────────────────────────────────────
@router.get("/invoices", response_model=list[InvoiceInDB])
async def admin_list_invoices(
    status: Optional[str] = Query(default=None, pattern="^(paid|refunded|partially_refunded)$"),
    courseId: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
    fromDate: Optional[str] = Query(default=None, max_length=30),
    limit: int = Query(default=200, le=1000),
    _: UserInDB = Depends(require_role("admin")),
):
    filt: dict = {}
    if status:
        filt["status"] = status
    if courseId:
        filt["courseId"] = _oid(courseId)
    if q:
        filt["$or"] = [
            {"invoiceNumber": {"$regex": q, "$options": "i"}},
            {"studentName": {"$regex": q, "$options": "i"}},
            {"studentEmail": {"$regex": q, "$options": "i"}},
            {"reference": {"$regex": q, "$options": "i"}},
        ]
    if fromDate:
        try:
            dt = datetime.fromisoformat(fromDate)
            filt["issuedAt"] = {"$gte": dt}
        except ValueError:
            pass

    cursor = get_database().invoices.find(filt).sort("issuedAt", -1).limit(limit)
    out = []
    async for inv in cursor:
        out.append(InvoiceInDB(**inv))
    return out


# ── ADMIN: summary stats ────────────────────────────────────
@router.get("/summary")
async def finance_summary(_: UserInDB = Depends(require_role("admin"))):
    db = get_database()
    pipe = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"},
            "refunded": {"$sum": "$refundedAmount"},
        }},
    ]
    by_status: dict = {}
    total_revenue = 0.0
    total_refunded = 0.0
    total_invoices = 0
    async for row in db.invoices.aggregate(pipe):
        by_status[row["_id"]] = {
            "count": row["count"],
            "total": row["total"],
            "refunded": row["refunded"],
        }
        total_revenue += row["total"]
        total_refunded += row["refunded"]
        total_invoices += row["count"]

    # Monthly breakdown (last 12 months)
    monthly = []
    cursor = db.invoices.aggregate([
        {"$group": {
            "_id": {
                "year": {"$year": "$issuedAt"},
                "month": {"$month": "$issuedAt"},
            },
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
        {"$limit": 12},
    ])
    async for row in cursor:
        monthly.append({
            "year": row["_id"]["year"],
            "month": row["_id"]["month"],
            "revenue": row["revenue"],
            "count": row["count"],
        })

    return {
        "totalInvoices": total_invoices,
        "totalRevenue": total_revenue,
        "totalRefunded": total_refunded,
        "netRevenue": total_revenue - total_refunded,
        "byStatus": by_status,
        "monthly": monthly,
    }


# ── ADMIN: refund ───────────────────────────────────────────
@router.post("/invoices/{invoice_id}/refund", response_model=InvoiceInDB)
async def admin_refund(
    invoice_id: str,
    payload: RefundRequest,
    auth: UserInDB = Depends(require_role("admin")),
):
    try:
        updated = await refund_invoice(
            invoice_id, payload.amount, payload.reason, auth.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await log_action(
        actorId=auth.id, action="invoice_refund",
        target=invoice_id, meta={"amount": payload.amount, "reason": payload.reason},
    )
    return InvoiceInDB(**updated)


# ── ADMIN: CSV export ───────────────────────────────────────
@router.get("/invoices.csv")
async def export_invoices_csv(
    _: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "invoice_number", "issued_at", "student_name", "student_email",
        "course_title", "amount", "currency", "status",
        "refunded_amount", "reference",
    ])
    async for inv in db.invoices.find({}).sort("issuedAt", -1):
        w.writerow([
            inv.get("invoiceNumber", ""),
            inv.get("issuedAt", ""),
            inv.get("studentName", ""),
            inv.get("studentEmail", ""),
            inv.get("courseTitle", ""),
            inv.get("amount", 0),
            inv.get("currency", "NGN"),
            inv.get("status", ""),
            inv.get("refundedAmount", 0),
            inv.get("reference", ""),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=learn_invoices.csv"},
    )


# ── Internal: create invoice helper for payment wiring ─────
async def trigger_invoice_for_payment(payment_doc: dict) -> None:
    """Called from payment verification + webhook."""
    try:
        await create_invoice_from_payment(payment_doc)
    except Exception:
        pass
