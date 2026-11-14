"""Finance — invoices, refunds, summary, CSV."""
from bson import ObjectId
from datetime import datetime, timezone


async def _make_payment(db, student_user, sample_course):
    now = datetime.now(timezone.utc)
    p = {
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "amount": 5000.0,
        "reference": f"REF-{now.timestamp()}",
        "status": "success",
        "verifiedBy": None,
        "verifiedAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.payments.insert_one(p)
    p["_id"] = result.inserted_id
    return p


async def _make_invoice(db, payment, student_user, sample_course):
    from app.services.finance import create_invoice_from_payment
    return await create_invoice_from_payment(payment)


async def test_no_invoices_for_student_initially(student_client):
    r = await student_client.get("/api/finance/invoices/my")
    assert r.status_code == 200
    assert r.json() == []


async def test_invoice_created_from_payment(admin_client, student_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv = await _make_invoice(db, payment, student_user, sample_course)
    assert inv is not None
    assert inv["invoiceNumber"].startswith("INV-")
    assert inv["status"] == "paid"
    assert inv["amount"] == 5000.0

    r = await student_client.get("/api/finance/invoices/my")
    assert len(r.json()) == 1
    assert r.json()[0]["invoiceNumber"] == inv["invoiceNumber"]


async def test_invoice_idempotent(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv1 = await _make_invoice(db, payment, student_user, sample_course)
    inv2 = await _make_invoice(db, payment, student_user, sample_course)
    assert inv1["_id"] == inv2["_id"]
    count = await db.invoices.count_documents({"paymentId": payment["_id"]})
    assert count == 1


async def test_admin_lists_invoices(admin_client, student_user, sample_course, db):
    for _ in range(3):
        payment = await _make_payment(db, student_user, sample_course)
        await _make_invoice(db, payment, student_user, sample_course)

    r = await admin_client.get("/api/finance/invoices")
    assert r.status_code == 200
    assert len(r.json()) == 3


async def test_student_cannot_list_all_invoices(student_client):
    r = await student_client.get("/api/finance/invoices")
    assert r.status_code == 403


async def test_student_cannot_see_other_invoice(
    admin_client, student_client, student_user, staff_user, sample_course, db,
):
    # Create invoice for staff_user
    now = datetime.now(timezone.utc)
    staff_payment = {
        "studentId": ObjectId(staff_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "amount": 1000.0, "reference": "REF-OTHER",
        "status": "success", "verifiedBy": None, "verifiedAt": now,
        "createdAt": now, "updatedAt": now,
    }
    p_result = await db.payments.insert_one(staff_payment)
    staff_payment["_id"] = p_result.inserted_id
    inv = await _make_invoice(db, staff_payment, staff_user, sample_course)

    # Student tries to access
    r = await student_client.get(f"/api/finance/invoices/{inv['_id']}")
    assert r.status_code == 403


async def test_admin_summary(admin_client, student_user, sample_course, db):
    for amount in [1000.0, 2000.0, 3000.0]:
        now = datetime.now(timezone.utc)
        p = {
            "studentId": ObjectId(student_user["_id"]),
            "courseId": ObjectId(sample_course["_id"]),
            "amount": amount, "reference": f"REF-{amount}",
            "status": "success", "verifiedBy": None, "verifiedAt": now,
            "createdAt": now, "updatedAt": now,
        }
        r = await db.payments.insert_one(p)
        p["_id"] = r.inserted_id
        await _make_invoice(db, p, student_user, sample_course)

    r = await admin_client.get("/api/finance/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["totalInvoices"] == 3
    assert body["totalRevenue"] == 6000.0
    assert body["netRevenue"] == 6000.0
    assert body["totalRefunded"] == 0


async def test_refund_partial(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv = await _make_invoice(db, payment, student_user, sample_course)

    r = await admin_client.post(f"/api/finance/invoices/{inv['_id']}/refund", json={
        "amount": 2000.0, "reason": "Partial refund"
    })
    assert r.status_code == 200
    assert r.json()["status"] == "partially_refunded"
    assert r.json()["refundedAmount"] == 2000.0


async def test_refund_full(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv = await _make_invoice(db, payment, student_user, sample_course)

    r = await admin_client.post(f"/api/finance/invoices/{inv['_id']}/refund", json={
        "amount": 5000.0, "reason": "Full refund"
    })
    assert r.status_code == 200
    assert r.json()["status"] == "refunded"
    assert r.json()["refundedAmount"] == 5000.0


async def test_refund_exceeds_amount_rejected(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv = await _make_invoice(db, payment, student_user, sample_course)

    r = await admin_client.post(f"/api/finance/invoices/{inv['_id']}/refund", json={
        "amount": 99999.0
    })
    assert r.status_code == 400
    assert "exceeds" in r.json()["error"].lower()


async def test_refund_already_refunded_rejected(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    inv = await _make_invoice(db, payment, student_user, sample_course)

    await admin_client.post(f"/api/finance/invoices/{inv['_id']}/refund", json={"amount": 5000.0})
    r = await admin_client.post(f"/api/finance/invoices/{inv['_id']}/refund", json={"amount": 100.0})
    assert r.status_code == 400


async def test_csv_export(admin_client, student_user, sample_course, db):
    payment = await _make_payment(db, student_user, sample_course)
    await _make_invoice(db, payment, student_user, sample_course)

    r = await admin_client.get("/api/finance/invoices.csv")
    assert r.status_code == 200
    assert "invoice_number" in r.text
    assert "INV-" in r.text
