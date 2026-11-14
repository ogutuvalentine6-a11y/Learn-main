"""Module reorder/edit + session module reassignment."""


async def _make_module(admin_client, course_id, title, order):
    r = await admin_client.post("/api/modules", json={
        "courseId": course_id,
        "title": title,
        "orderIndex": order,
    })
    assert r.status_code == 201
    return r.json()


async def test_update_module_title(admin_client, sample_course):
    m = await _make_module(admin_client, sample_course["_id"], "Week 1", 1)
    r = await admin_client.patch(f"/api/modules/{m['_id']}", json={
        "title": "Week 1: Renamed",
        "description": "New desc",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Week 1: Renamed"
    assert body["description"] == "New desc"
    assert body["orderIndex"] == 1  # unchanged


async def test_move_up_swaps_order(admin_client, sample_course):
    m1 = await _make_module(admin_client, sample_course["_id"], "One", 1)
    m2 = await _make_module(admin_client, sample_course["_id"], "Two", 2)

    r = await admin_client.post(f"/api/modules/{m2['_id']}/move-up")
    assert r.status_code == 200
    assert r.json()["orderIndex"] == 1

    # Verify m1 is now at 2
    lst = await admin_client.get(f"/api/modules?courseId={sample_course['_id']}")
    mods = lst.json()["modules"]
    one = next(x for x in mods if x["_id"] == m1["_id"])
    two = next(x for x in mods if x["_id"] == m2["_id"])
    assert one["orderIndex"] == 2
    assert two["orderIndex"] == 1


async def test_move_up_at_top_fails(admin_client, sample_course):
    m = await _make_module(admin_client, sample_course["_id"], "Only", 1)
    r = await admin_client.post(f"/api/modules/{m['_id']}/move-up")
    assert r.status_code == 400
    assert "top" in r.json()["error"].lower()


async def test_move_down_swaps_order(admin_client, sample_course):
    m1 = await _make_module(admin_client, sample_course["_id"], "Module A", 1)
    m2 = await _make_module(admin_client, sample_course["_id"], "Module B", 2)

    r = await admin_client.post(f"/api/modules/{m1['_id']}/move-down")
    assert r.status_code == 200
    assert r.json()["orderIndex"] == 2


async def test_move_down_at_bottom_fails(admin_client, sample_course):
    m = await _make_module(admin_client, sample_course["_id"], "Only", 1)
    r = await admin_client.post(f"/api/modules/{m['_id']}/move-down")
    assert r.status_code == 400
    assert "bottom" in r.json()["error"].lower()


async def test_move_module_requires_staff_assignment(staff_client, sample_course):
    """Staff not assigned to this course cannot move modules."""
    # Course created by admin_client in the fixture — staff_client is not assigned
    # So even creating a module should fail
    r = await staff_client.post("/api/modules", json={
        "courseId": sample_course["_id"], "title": "Module X", "orderIndex": 1,
    })
    assert r.status_code == 403


async def test_session_update_can_set_module(admin_client, sample_course):
    m = await _make_module(admin_client, sample_course["_id"], "Week 1", 1)

    # Create standalone session
    s = await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "orderIndex": 1,
        "title": "Lesson A",
    })
    sid = s.json()["_id"]

    # Assign to module
    u = await admin_client.patch("/api/session-update", json={
        "sessionId": sid,
        "moduleId": m["_id"],
    })
    assert u.status_code == 200
    assert u.json()["moduleId"] == m["_id"]

    # Curriculum reflects it
    curr = await admin_client.get(f"/api/modules/course/{sample_course['_id']}/curriculum")
    assert len(curr.json()["modules"][0]["sessions"]) == 1
    assert curr.json()["standaloneSessions"] == []


async def test_session_update_can_unassign_module(admin_client, sample_course):
    m = await _make_module(admin_client, sample_course["_id"], "Week 1", 1)

    s = await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "moduleId": m["_id"],
        "orderIndex": 1,
        "title": "Lesson A",
    })
    sid = s.json()["_id"]
    assert s.json()["moduleId"] == m["_id"]

    # Unassign — send moduleId: null
    u = await admin_client.patch("/api/session-update", json={
        "sessionId": sid,
        "moduleId": None,
    })
    assert u.status_code == 200
    assert u.json()["moduleId"] is None

    curr = await admin_client.get(f"/api/modules/course/{sample_course['_id']}/curriculum")
    assert curr.json()["standaloneSessions"][0]["title"] == "Lesson A"


async def test_delete_module_preserves_sessions(admin_client, sample_course):
    """Deleting a module should unassign its sessions, not delete them."""
    m = await _make_module(admin_client, sample_course["_id"], "Temp", 1)
    s = await admin_client.post("/api/session-create", json={
        "courseId": sample_course["_id"],
        "moduleId": m["_id"],
        "orderIndex": 1,
        "title": "Orphan",
    })
    sid = s.json()["_id"]

    await admin_client.delete(f"/api/modules/{m['_id']}")

    # Session should still exist and be standalone
    lst = await admin_client.get(f"/api/session-list?courseId={sample_course['_id']}")
    sessions = lst.json()
    assert len(sessions) == 1
    assert sessions[0]["_id"] == sid
    assert sessions[0]["moduleId"] is None
