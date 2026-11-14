"""Modules — create, list, curriculum tree, backward compat with standalone sessions."""


async def test_create_module_requires_staff(student_client, sample_course):
    r = await student_client.post("/api/modules", json={
        "courseId": sample_course["_id"],
        "title": "Week 1",
        "orderIndex": 1,
    })
    assert r.status_code == 403


async def test_create_module_as_admin(admin_client, sample_course):
    r = await admin_client.post("/api/modules", json={
        "courseId": sample_course["_id"],
        "title": "Week 1: Foundations",
        "description": "Introductory material",
        "orderIndex": 1,
    })
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Week 1: Foundations"
    assert body["orderIndex"] == 1


async def test_list_modules(admin_client, sample_course):
    await admin_client.post("/api/modules", json={
        "courseId": sample_course["_id"], "title": "Week 1", "orderIndex": 1,
    })
    await admin_client.post("/api/modules", json={
        "courseId": sample_course["_id"], "title": "Week 2", "orderIndex": 2,
    })
    r = await admin_client.get(f"/api/modules?courseId={sample_course['_id']}")
    assert r.status_code == 200
    body = r.json()
    assert len(body["modules"]) == 2
    assert body["standaloneSessions"] == 0


async def test_delete_module_unassigns_sessions(admin_client, sample_course):
    m = await admin_client.post("/api/modules", json={
        "courseId": sample_course["_id"], "title": "Temp", "orderIndex": 1,
    })
    mid = m.json()["_id"]

    # Create a session within the module
    s = await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "moduleId": mid,
        "orderIndex": 1,
        "title": "Lesson 1",
    })
    assert s.status_code == 201
    assert s.json()["moduleId"] == mid

    # Delete the module
    d = await admin_client.delete(f"/api/modules/{mid}")
    assert d.status_code == 200

    # Session should still exist, now standalone
    from app.db.mongodb import get_database
    from bson import ObjectId
    db = get_database()
    session = await db.sessions.find_one({"_id": ObjectId(s.json()["_id"])})
    assert session is not None
    assert session.get("moduleId") is None


async def test_curriculum_tree(admin_client, sample_course):
    m = await admin_client.post("/api/modules", json={
        "courseId": sample_course["_id"], "title": "Week 1", "orderIndex": 1,
    })
    mid = m.json()["_id"]

    # Add 2 sessions in module
    for i, title in enumerate(["Intro", "Setup"], start=1):
        await admin_client.post("/api/session-create", json={
            "courseId": sample_course["_id"],
            "moduleId": mid,
            "orderIndex": i,
            "title": title,
        })

    # Add 1 standalone session
    await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "orderIndex": 3,
        "title": "Bonus",
    })

    r = await admin_client.get(f"/api/modules/course/{sample_course['_id']}/curriculum")
    assert r.status_code == 200
    body = r.json()
    assert len(body["modules"]) == 1
    assert len(body["modules"][0]["sessions"]) == 2
    assert len(body["standaloneSessions"]) == 1
    assert body["standaloneSessions"][0]["title"] == "Bonus"


async def test_backward_compat_session_without_moduleId(admin_client, sample_course):
    """Existing sessions (no moduleId) still work."""
    r = await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "orderIndex": 1,
        "title": "Old Style Lesson",
    })
    assert r.status_code == 201
    # moduleId should be None or absent
    body = r.json()
    assert body.get("moduleId") is None


async def test_curriculum_404_for_missing_course(client):
    r = await client.get("/api/modules/course/000000000000000000000000/curriculum")
    assert r.status_code == 404
