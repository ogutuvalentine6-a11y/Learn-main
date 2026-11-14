"""Assignments — create, submit, grade, authorization."""


async def test_create_assignment_requires_staff(student_client, sample_course):
    r = await student_client.post("/api/assignments", json={
        "courseId": sample_course["_id"],
        "title": "Should fail",
    })
    assert r.status_code == 403


async def test_create_assignment_as_admin(admin_client, sample_course):
    r = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"],
        "title": "Essay 1",
        "instructions": "Write 500 words",
        "maxScore": 50,
    })
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Essay 1"
    assert body["maxScore"] == 50


async def test_student_cannot_see_unenrolled(admin_client, student_client, sample_course):
    # Admin creates assignment
    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Hidden",
    })
    # Student not enrolled → 403
    r = await student_client.get(f"/api/assignments/{a.json()['_id']}")
    assert r.status_code == 403


async def test_submit_and_grade(admin_client, staff_client, student_client, sample_course, student_user):
    # Enroll student manually
    from app.db.mongodb import get_database
    from bson import ObjectId
    from datetime import datetime, timezone
    db = get_database()
    now = datetime.now(timezone.utc)
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "paymentStatus": "paid",
        "currentSessionOrder": 1,
        "completedAt": None,
        "createdAt": now,
        "updatedAt": now,
    })

    # Admin creates assignment
    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Quiz Essay", "maxScore": 100,
    })
    aid = a.json()["_id"]

    # Student submits
    s = await student_client.post(f"/api/assignments/{aid}/submit", json={
        "fileUrl": "https://res.cloudinary.com/demo/essay.pdf",
        "note": "Here is my essay",
    })
    assert s.status_code == 201
    sid = s.json()["_id"]

    # Admin grades
    g = await admin_client.patch(f"/api/assignments/submissions/{sid}/grade", json={
        "score": 85, "feedback": "Good work",
    })
    assert g.status_code == 200
    assert g.json()["score"] == 85

    # Student sees grade
    d = await student_client.get(f"/api/assignments/{aid}")
    assert d.json()["mySubmission"]["score"] == 85


async def test_grade_rejects_score_over_max(admin_client, staff_client, student_client, sample_course, student_user):
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

    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Small", "maxScore": 10,
    })
    aid = a.json()["_id"]

    s = await student_client.post(f"/api/assignments/{aid}/submit", json={
        "fileUrl": "https://res.cloudinary.com/demo/x.pdf",
    })
    sid = s.json()["_id"]

    g = await admin_client.patch(f"/api/assignments/submissions/{sid}/grade", json={
        "score": 99,  # exceeds max 10
    })
    assert g.status_code == 400
