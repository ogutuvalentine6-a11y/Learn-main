"""Public API endpoints — courses search, instructors, events, certificate verify."""


async def test_courses_search_returns_empty(client):
    r = await client.get("/api/courses/search")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
    assert body["items"] == []


async def test_courses_search_finds_by_title(client, admin_client):
    await admin_client.post(
        "/api/course-create",
        json={"title": "Advanced Python", "description": "Deep dive into Python", "price": 2000},
    )
    await admin_client.post(
        "/api/course-create",
        json={"title": "JavaScript Basics", "description": "Learn JS", "price": 1500},
    )
    r = await client.get("/api/courses/search?q=python")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Advanced Python"


async def test_instructors_empty(client):
    r = await client.get("/api/instructors")
    assert r.status_code == 200
    assert r.json() == []


async def test_instructors_lists_staff(client, staff_user):
    r = await client.get("/api/instructors")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["fullName"] == "Test Staff"
    assert "password" not in items[0]


async def test_events_empty(client):
    r = await client.get("/api/events/upcoming")
    assert r.status_code == 200
    assert r.json() == []


async def test_certificate_verify_404(client):
    r = await client.get("/api/certificates/verify/NONEXISTENT")
    assert r.status_code == 404
