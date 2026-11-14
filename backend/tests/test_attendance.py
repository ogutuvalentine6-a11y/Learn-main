"""Attendance — mark, batch, idempotency, validation, summaries."""
from bson import ObjectId
from datetime import datetime, timezone, date, timedelta


async def _enroll(db, student_id, course_id):
    now = datetime.now(timezone.utc)
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id),
        "paymentStatus": "paid",
        "currentSessionOrder": 1,
        "completedAt": None,
        "createdAt": now, "updatedAt": now,
    })


async def _make_slot(db, course_id, instructor_id):
    now = datetime.now(timezone.utc)
    doc = {
        "courseId": ObjectId(course_id),
        "courseTitle": "Test Course",
        "instructorId": ObjectId(instructor_id),
        "instructorName": "Instructor",
        "dayOfWeek": 0,
        "startTime": "09:00",
        "endTime": "10:30",
        "room": "Room A",
        "semesterId": None,
        "isActive": True,
        "createdAt": now, "updatedAt": now,
    }
    r = await db.timetable_slots.insert_one(doc)
    doc["_id"] = r.inserted_id
    return doc


async def test_empty_attendance(admin_client, sample_course, admin_user, db):
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    r = await admin_client.get(f"/api/attendance/slot/{slot['_id']}")
    assert r.status_code == 200
    assert r.json() == []


async def test_student_cannot_mark(student_client, sample_course, admin_user, db, student_user):
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()
    r = await student_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })
    assert r.status_code == 403


async def test_staff_unassigned_cannot_mark(staff_client, sample_course, admin_user, db, student_user):
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()
    r = await staff_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })
    assert r.status_code == 403


async def test_admin_marks_single_student(
    admin_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()

    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })
    assert r.status_code == 200
    assert r.json()["written"] == 1

    lst = await admin_client.get(f"/api/attendance/slot/{slot['_id']}")
    assert len(lst.json()) == 1
    assert lst.json()[0]["status"] == "present"
    assert lst.json()[0]["studentName"] == "Test Student"


async def test_reject_future_date(
    admin_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    future = (date.today() + timedelta(days=5)).isoformat()

    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": future,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })
    assert r.status_code == 400
    assert "future" in r.json()["error"].lower()


async def test_reject_non_enrolled_student(
    admin_client, sample_course, admin_user, student_user, db,
):
    # NOT enrolled — only slot created
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()

    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })
    assert r.status_code == 400
    assert "not enrolled" in r.json()["error"].lower()


async def test_reject_invalid_status(
    admin_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()

    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "bogus"}],
    })
    assert r.status_code == 422


async def test_batch_mark_multiple(
    admin_client, sample_course, admin_user, db,
):
    # Create 3 students
    student_ids = []
    now = datetime.now(timezone.utc)
    for i in range(3):
        sid = ObjectId()
        await db.users.insert_one({
            "_id": sid,
            "idNumber": f"B-{i}",
            "fullName": f"Student {i}",
            "email": f"batch{i}@example.com",
            "phone": "+254700000000",
            "location": "Nairobi",
            "school": "U",
            "fieldOfStudy": "CS",
            "courseOfStudy": "BSc",
            "password": "x",
            "role": "student",
            "status": "active",
            "emailVerified": True,
            "createdAt": now, "updatedAt": now,
        })
        await _enroll(db, str(sid), sample_course["_id"])
        student_ids.append(str(sid))

    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()

    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [
            {"studentId": student_ids[0], "status": "present"},
            {"studentId": student_ids[1], "status": "absent"},
            {"studentId": student_ids[2], "status": "late"},
        ],
    })
    assert r.status_code == 200
    assert r.json()["written"] == 3

    lst = await admin_client.get(f"/api/attendance/slot/{slot['_id']}/date/{today}")
    assert len(lst.json()) == 3


async def test_re_mark_updates_record(
    admin_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])
    today = date.today().isoformat()

    # First mark: present
    await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "present"}],
    })

    # Second mark: absent (should update, not duplicate)
    r = await admin_client.post("/api/attendance/mark", json={
        "slotId": str(slot["_id"]),
        "date": today,
        "records": [{"studentId": student_user["_id"], "status": "absent"}],
    })
    assert r.status_code == 200

    lst = await admin_client.get(f"/api/attendance/slot/{slot['_id']}")
    assert len(lst.json()) == 1
    assert lst.json()[0]["status"] == "absent"


async def test_my_attendance_summary(
    admin_client, student_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])

    # Mark 3 dates
    for days_ago in (1, 2, 3):
        d = (date.today() - timedelta(days=days_ago)).isoformat()
        await admin_client.post("/api/attendance/mark", json={
            "slotId": str(slot["_id"]),
            "date": d,
            "records": [{"studentId": student_user["_id"], "status": "present"}],
        })

    r = await student_client.get("/api/attendance/my-summary")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["present"] == 3
    assert body[0]["percent"] == 100.0


async def test_summary_forbidden_for_unassigned_staff(
    staff_client, sample_course,
):
    r = await staff_client.get(f"/api/attendance/summary/{sample_course['_id']}")
    assert r.status_code == 403


async def test_admin_course_summary(
    admin_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])

    # Mark present twice, absent once
    for days_ago, status in [(1, "present"), (2, "present"), (3, "absent")]:
        d = (date.today() - timedelta(days=days_ago)).isoformat()
        await admin_client.post("/api/attendance/mark", json={
            "slotId": str(slot["_id"]),
            "date": d,
            "records": [{"studentId": student_user["_id"], "status": status}],
        })

    r = await admin_client.get(f"/api/attendance/summary/{sample_course['_id']}")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["present"] == 2
    assert body[0]["absent"] == 1
    assert body[0]["percent"] == 66.7  # 2/3


async def test_excused_does_not_count_against(
    admin_client, student_client, sample_course, admin_user, student_user, db,
):
    await _enroll(db, student_user["_id"], sample_course["_id"])
    slot = await _make_slot(db, sample_course["_id"], admin_user["_id"])

    # Present, present, excused → 100% (excused excluded from denominator)
    for days_ago, status in [(1, "present"), (2, "present"), (3, "excused")]:
        d = (date.today() - timedelta(days=days_ago)).isoformat()
        await admin_client.post("/api/attendance/mark", json={
            "slotId": str(slot["_id"]),
            "date": d,
            "records": [{"studentId": student_user["_id"], "status": status}],
        })

    r = await student_client.get("/api/attendance/my-summary")
    body = r.json()
    assert body[0]["present"] == 2
    assert body[0]["excused"] == 1
    assert body[0]["percent"] == 100.0
