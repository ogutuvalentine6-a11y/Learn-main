"""Verify notifications fire on the 5 real events:
- payment confirmed
- assignment created
- submission graded
- live session scheduled
- certificate issued
"""

from bson import ObjectId
from datetime import datetime, timezone, timedelta


async def _enroll(db, student_id, course_id):
    now = datetime.now(timezone.utc)
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id),
        "paymentStatus": "paid",
        "currentSessionOrder": 1,
        "completedAt": None,
        "createdAt": now,
        "updatedAt": now,
    })


async def test_assignment_create_notifies_enrolled(admin_client, student_user, sample_course, db):
    await _enroll(db, student_user["_id"], sample_course["_id"])

    r = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"],
        "title": "Essay 1",
        "instructions": "Write something",
        "dueAt": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "maxScore": 100,
    })
    assert r.status_code == 201

    notifs = await db.notifications.find({"userId": ObjectId(student_user["_id"])}).to_list(length=10)
    assert len(notifs) == 1
    assert notifs[0]["kind"] == "assignment"
    assert "Essay 1" in notifs[0]["title"]
    assert "/assignments/" in notifs[0]["link"]


async def test_submission_graded_notifies_student(
    admin_client, student_client, student_user, sample_course, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])

    # Create assignment
    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Quiz Essay", "maxScore": 100,
    })
    aid = a.json()["_id"]

    # Student submits
    s = await student_client.post(f"/api/assignments/{aid}/submit", json={
        "fileUrl": "https://res.cloudinary.com/demo/essay.pdf",
    })
    sid = s.json()["_id"]

    # Clear assignment-created notif so we can isolate the grade notif
    await db.notifications.delete_many({"userId": ObjectId(student_user["_id"])})

    # Admin grades
    await admin_client.patch(f"/api/assignments/submissions/{sid}/grade", json={
        "score": 85, "feedback": "Good work",
    })

    notifs = await db.notifications.find({"userId": ObjectId(student_user["_id"])}).to_list(length=10)
    assert len(notifs) == 1
    assert notifs[0]["kind"] == "grade"
    assert "Quiz Essay" in notifs[0]["title"]
    assert "85" in notifs[0]["body"]


async def test_live_session_notifies_enrolled(
    admin_client, student_user, sample_course, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])

    r = await admin_client.post("/api/live/sessions", json={
        "title": "Python Live Class",
        "description": "Interactive session",
        "courseId": sample_course["_id"],
        "scheduledAt": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "durationMinutes": 60,
    })
    assert r.status_code == 201

    notifs = await db.notifications.find({"userId": ObjectId(student_user["_id"])}).to_list(length=10)
    assert len(notifs) == 1
    assert notifs[0]["kind"] == "live"
    assert "Python Live Class" in notifs[0]["title"]


async def test_webhook_payment_notifies_student(
    admin_client, student_user, sample_course, db,
):
    """Simulate a payment webhook → notify student."""
    # Seed pending payment
    ref = "LP-TEST-NOTIFY-001"
    now = datetime.now(timezone.utc)
    await db.payments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "amount": 1000.0,
        "reference": ref,
        "status": "pending",
        "verifiedBy": None,
        "verifiedAt": None,
        "createdAt": now,
        "updatedAt": now,
    })

    # Send webhook with valid signature
    import hmac, hashlib, json as _json
    from app.core.config import get_settings
    s = get_settings()
    body_dict = {
        "event": "charge.success",
        "data": {
            "reference": ref,
            "metadata": {
                "studentId": student_user["_id"],
                "courseId": sample_course["_id"],
            },
        },
    }
    body_bytes = _json.dumps(body_dict).encode()
    sig = hmac.new(s.PAYSTACK_SECRET_KEY.encode(), body_bytes, hashlib.sha512).hexdigest()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post(
            "/api/paystack-webhook",
            content=body_bytes,
            headers={
                "Content-Type": "application/json",
                "x-paystack-signature": sig,
            },
        )
    assert r.status_code == 200

    notifs = await db.notifications.find({"userId": ObjectId(student_user["_id"])}).to_list(length=10)
    assert len(notifs) == 1
    assert notifs[0]["kind"] == "payment"
    assert "Payment confirmed" in notifs[0]["title"]


async def test_webhook_idempotent_no_duplicate_notification(
    admin_client, student_user, sample_course, db,
):
    """Replaying the same webhook should not create a second notification."""
    ref = "LP-TEST-NOTIFY-DUP"
    now = datetime.now(timezone.utc)
    await db.payments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "amount": 1000.0,
        "reference": ref,
        "status": "pending",
        "verifiedBy": None, "verifiedAt": None,
        "createdAt": now, "updatedAt": now,
    })

    import hmac, hashlib, json as _json
    from app.core.config import get_settings
    s = get_settings()
    body_dict = {
        "event": "charge.success",
        "data": {
            "reference": ref,
            "metadata": {
                "studentId": student_user["_id"],
                "courseId": sample_course["_id"],
            },
        },
    }
    body_bytes = _json.dumps(body_dict).encode()
    sig = hmac.new(s.PAYSTACK_SECRET_KEY.encode(), body_bytes, hashlib.sha512).hexdigest()

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post(
            "/api/paystack-webhook",
            content=body_bytes,
            headers={"Content-Type": "application/json", "x-paystack-signature": sig},
        )
        await c.post(
            "/api/paystack-webhook",
            content=body_bytes,
            headers={"Content-Type": "application/json", "x-paystack-signature": sig},
        )

    notifs = await db.notifications.find({
        "userId": ObjectId(student_user["_id"]),
        "kind": "payment",
    }).to_list(length=10)
    assert len(notifs) == 1


async def test_certificate_claim_notifies_student(
    admin_client, student_client, student_user, sample_course, db,
):
    from bson import ObjectId
    uid = ObjectId(student_user["_id"])
    cid = ObjectId(sample_course["_id"])

    await _enroll(db, student_user["_id"], sample_course["_id"])

    now = datetime.now(timezone.utc)
    for order in (1, 2):
        await db.sessions.insert_one({
            "courseId": cid, "orderIndex": order, "title": f"S{order}",
            "notes": "", "materialUrls": [], "quiz": None,
            "createdAt": now, "updatedAt": now,
        })
    sessions = await db.sessions.find({"courseId": cid}).to_list(length=10)
    for s in sessions:
        await db.progresses.insert_one({
            "studentId": uid, "courseId": cid, "sessionId": s["_id"],
            "status": "passed", "score": 100,
            "createdAt": now, "updatedAt": now,
        })

    # Clear existing notifs
    await db.notifications.delete_many({"userId": uid})

    r = await student_client.post(f"/api/certificates/claim/{sample_course['_id']}")
    assert r.status_code == 200

    notifs = await db.notifications.find({"userId": uid}).to_list(length=10)
    assert len(notifs) == 1
    assert notifs[0]["kind"] == "certificate"
    assert "Certificate issued" in notifs[0]["title"]


async def test_notification_has_correct_shape(student_user, sample_course, db):
    """Any notification we create should match the model schema."""
    from app.models.notification import NotificationInDB
    from app.services.notifier import notify_user

    await notify_user(
        user_id=student_user["_id"],
        kind="system",
        title="Test",
        body="Body",
        link="/test",
    )
    doc = await db.notifications.find_one({"userId": ObjectId(student_user["_id"])})
    assert doc is not None
    # Should validate without error
    n = NotificationInDB(**doc)
    assert n.title == "Test"
    assert n.read is False
