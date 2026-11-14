"""Welfare — tickets, replies, privacy (counseling admin-only), stats."""


async def test_student_creates_ticket(student_client):
    r = await student_client.post("/api/welfare/tickets", json={
        "category": "academic",
        "subject": "Grade dispute",
        "body": "I think my quiz 2 grade is wrong.",
        "priority": "normal",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["subject"] == "Grade dispute"
    assert body["status"] == "open"
    assert len(body["messages"]) == 1
    assert body["messages"][0]["authorRole"] == "student"


async def test_counseling_auto_escalated(student_client):
    r = await student_client.post("/api/welfare/tickets", json={
        "category": "counseling",
        "subject": "Need to talk",
        "body": "I'm struggling with stress.",
        "priority": "normal",
    })
    assert r.status_code == 201
    # Counseling auto-escalates to high priority
    assert r.json()["priority"] == "high"


async def test_staff_cannot_create_ticket(staff_client):
    r = await staff_client.post("/api/welfare/tickets", json={
        "category": "academic",
        "subject": "Test",
        "body": "Test body",
    })
    assert r.status_code == 403


async def test_student_sees_own_tickets(student_client):
    await student_client.post("/api/welfare/tickets", json={
        "category": "technical", "subject": "Login issue", "body": "Cannot log in",
    })
    await student_client.post("/api/welfare/tickets", json={
        "category": "financial", "subject": "Refund request", "body": "Need refund",
    })
    r = await student_client.get("/api/welfare/tickets/my")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_student_cannot_see_other_ticket(
    admin_client, student_client, db, staff_user,
):
    # Create ticket by a staff (we simulate by inserting directly)
    from bson import ObjectId
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    other_ticket = {
        "studentId": ObjectId(staff_user["_id"]),
        "studentName": "Other Person",
        "studentEmail": "other@example.com",
        "category": "academic",
        "subject": "Not mine",
        "status": "open",
        "priority": "normal",
        "messages": [],
        "assignedTo": None,
        "assignedToName": "",
        "resolvedAt": None,
        "createdAt": now, "updatedAt": now,
    }
    r = await db.welfare_tickets.insert_one(other_ticket)

    resp = await student_client.get(f"/api/welfare/tickets/{r.inserted_id}")
    assert resp.status_code == 403


async def test_student_replies_to_own(student_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "technical", "subject": "Test", "body": "Initial",
    })
    tid = t.json()["_id"]

    r = await student_client.post(f"/api/welfare/tickets/{tid}/reply", json={
        "body": "More context",
    })
    assert r.status_code == 200
    assert len(r.json()["messages"]) == 2


async def test_admin_replies_to_ticket(admin_client, student_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Help", "body": "I need help",
    })
    tid = t.json()["_id"]

    r = await admin_client.post(f"/api/welfare/admin/tickets/{tid}/reply", json={
        "body": "We're looking into it",
        "internalNote": False,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "in_progress"
    assert body["assignedToName"]  # auto-assigned to admin
    assert len(body["messages"]) == 2


async def test_internal_note_hidden_from_student(admin_client, student_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "welfare", "subject": "Test", "body": "Body content",
    })
    tid = t.json()["_id"]

    # Admin adds internal note
    await admin_client.post(f"/api/welfare/admin/tickets/{tid}/reply", json={
        "body": "Student may need counseling referral",
        "internalNote": True,
    })

    # Student views — should not see the internal note
    r = await student_client.get(f"/api/welfare/tickets/{tid}")
    body = r.json()
    assert len(body["messages"]) == 1  # only the original
    assert body["messages"][0]["body"] == "Body content"


async def test_staff_forbidden_from_counseling(admin_client, student_client, staff_client, db, staff_user):
    """Staff cannot see counseling tickets even by ID."""
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "counseling",
        "subject": "Personal issue",
        "body": "Private matter",
    })
    tid = t.json()["_id"]

    # Give staff access to the course so they'd normally see tickets — but
    # sensitive categories are still hidden by _staff_can_see()
    r = await staff_client.get(f"/api/welfare/tickets/{tid}")
    assert r.status_code == 403


async def test_staff_can_see_non_sensitive(admin_client, student_client, staff_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Non-sensitive", "body": "Body content",
    })
    tid = t.json()["_id"]

    r = await staff_client.get(f"/api/welfare/tickets/{tid}")
    assert r.status_code == 200


async def test_staff_list_excludes_sensitive(admin_client, student_client, staff_client):
    # Create one of each
    await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Academic issue", "body": "Body content",
    })
    await student_client.post("/api/welfare/tickets", json={
        "category": "counseling", "subject": "Counseling", "body": "Body content",
    })

    # Staff sees only academic
    r = await staff_client.get("/api/welfare/admin/tickets")
    assert r.status_code == 200
    cats = [t["category"] for t in r.json()]
    assert "academic" in cats
    assert "counseling" not in cats

    # Admin sees both
    r = await admin_client.get("/api/welfare/admin/tickets")
    cats = [t["category"] for t in r.json()]
    assert "academic" in cats
    assert "counseling" in cats


async def test_update_status(admin_client, student_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Status test", "body": "Body content",
    })
    tid = t.json()["_id"]

    r = await admin_client.patch(f"/api/welfare/admin/tickets/{tid}/status", json={
        "status": "resolved",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"
    assert r.json()["resolvedAt"] is not None


async def test_student_reopen_by_replying(admin_client, student_client):
    """If admin resolves and student replies, status goes back to in_progress."""
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Reopen", "body": "Body content",
    })
    tid = t.json()["_id"]

    await admin_client.patch(f"/api/welfare/admin/tickets/{tid}/status", json={
        "status": "resolved",
    })
    # Student replies
    r = await student_client.post(f"/api/welfare/tickets/{tid}/reply", json={
        "body": "Actually, still an issue",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


async def test_closed_ticket_cannot_be_replied(admin_client, student_client):
    t = await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Closed", "body": "Body content",
    })
    tid = t.json()["_id"]
    await admin_client.patch(f"/api/welfare/admin/tickets/{tid}/status", json={
        "status": "closed",
    })
    r = await student_client.post(f"/api/welfare/tickets/{tid}/reply", json={
        "body": "Try again",
    })
    assert r.status_code == 400
    assert "closed" in r.json()["error"].lower()


async def test_admin_stats(admin_client, student_client):
    await student_client.post("/api/welfare/tickets", json={
        "category": "academic", "subject": "Academic issue", "body": "Body content",
    })
    await student_client.post("/api/welfare/tickets", json={
        "category": "counseling", "subject": "Counseling", "body": "Body content",
    })
    r = await admin_client.get("/api/welfare/admin/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert body["byStatus"]["open"] == 2
    assert body["byCategory"]["academic"] == 1
    assert body["byCategory"]["counseling"] == 1
