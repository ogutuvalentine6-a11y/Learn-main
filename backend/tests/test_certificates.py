"""Certificates — claim requires course completion, admin can override."""


async def test_claim_fails_if_not_complete(student_client, sample_course, student_user):
    from app.db.mongodb import get_database
    from bson import ObjectId
    from datetime import datetime, timezone
    db = get_database()
    now = datetime.now(timezone.utc)
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "paymentStatus": "paid", "currentSessionOrder": 1, "completedAt": None,
        "createdAt": now, "updatedAt": now,
    })
    # No sessions, no progress — course can't be "complete"
    r = await student_client.post(f"/api/certificates/claim/{sample_course['_id']}")
    assert r.status_code == 400
    assert "not yet complete" in r.json()["error"].lower()


async def test_claim_succeeds_after_all_sessions_passed(
    admin_client, student_client, sample_course, student_user,
):
    from app.db.mongodb import get_database
    from bson import ObjectId
    from datetime import datetime, timezone
    db = get_database()
    now = datetime.now(timezone.utc)
    uid = ObjectId(student_user["_id"])
    cid = ObjectId(sample_course["_id"])

    await db.enrollments.insert_one({
        "studentId": uid, "courseId": cid, "paymentStatus": "paid",
        "currentSessionOrder": 1, "completedAt": None,
        "createdAt": now, "updatedAt": now,
    })

    # Create 2 sessions
    for order in (1, 2):
        await db.sessions.insert_one({
            "courseId": cid, "orderIndex": order, "title": f"S{order}",
            "notes": "", "materialUrls": [], "quiz": None,
            "createdAt": now, "updatedAt": now,
        })

    # Create 2 passed progresses
    sessions = await db.sessions.find({"courseId": cid}).to_list(length=10)
    for s in sessions:
        await db.progresses.insert_one({
            "studentId": uid, "courseId": cid, "sessionId": s["_id"],
            "status": "passed", "score": 100,
            "createdAt": now, "updatedAt": now,
        })

    r = await student_client.post(f"/api/certificates/claim/{sample_course['_id']}")
    assert r.status_code == 200
    assert r.json()["certificateId"].startswith("CERT-")


async def test_admin_manual_issue(admin_client, student_user, sample_course):
    r = await admin_client.post(
        f"/api/certificates/admin/issue?studentId={student_user['_id']}&courseId={sample_course['_id']}"
    )
    assert r.status_code == 200
    assert "certificateId" in r.json()


async def test_my_certificates_lists(student_client):
    r = await student_client.get("/api/certificates/my")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
