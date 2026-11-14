"""Academic — semesters (CRUD, activate/archive) + calendar events."""
from datetime import datetime, timezone, timedelta


def _semester_payload(name="2026 Spring"):
    now = datetime.now(timezone.utc)
    return {
        "name": name,
        "startDate": (now + timedelta(days=30)).isoformat(),
        "endDate": (now + timedelta(days=120)).isoformat(),
        "description": "Test semester",
    }


async def test_public_semester_list_empty(client):
    r = await client.get("/api/academic/semesters")
    assert r.status_code == 200
    assert r.json() == []


async def test_create_semester_requires_admin(student_client):
    r = await student_client.post("/api/academic/semesters", json=_semester_payload())
    assert r.status_code == 403


async def test_create_semester(admin_client, client):
    r = await admin_client.post("/api/academic/semesters", json=_semester_payload())
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "2026 Spring"
    assert body["status"] == "draft"

    lst = await client.get("/api/academic/semesters")
    assert len(lst.json()) == 1


async def test_reject_invalid_dates(admin_client):
    now = datetime.now(timezone.utc)
    r = await admin_client.post("/api/academic/semesters", json={
        "name": "Bad Semester",
        "startDate": (now + timedelta(days=120)).isoformat(),
        "endDate": (now + timedelta(days=30)).isoformat(),  # end before start
        "description": "",
    })
    assert r.status_code == 400
    assert "after" in r.json()["error"].lower()


async def test_activate_semester(admin_client):
    r = await admin_client.post("/api/academic/semesters", json=_semester_payload("Spring"))
    sid = r.json()["_id"]
    a = await admin_client.post(f"/api/academic/semesters/{sid}/activate")
    assert a.status_code == 200
    assert a.json()["status"] == "active"


async def test_activate_archives_previous(admin_client):
    s1 = await admin_client.post("/api/academic/semesters", json=_semester_payload("S1"))
    s2 = await admin_client.post("/api/academic/semesters", json=_semester_payload("S2"))
    id1 = s1.json()["_id"]
    id2 = s2.json()["_id"]

    await admin_client.post(f"/api/academic/semesters/{id1}/activate")
    await admin_client.post(f"/api/academic/semesters/{id2}/activate")

    # Both should be reflectable; s1 should now be archived
    g1 = await admin_client.get(f"/api/academic/semesters/{id1}")
    g2 = await admin_client.get(f"/api/academic/semesters/{id2}")
    assert g1.json()["status"] == "archived"
    assert g2.json()["status"] == "active"


async def test_current_semester_prefers_active(admin_client, client):
    now = datetime.now(timezone.utc)
    # Create and activate one with date range containing now
    r = await admin_client.post("/api/academic/semesters", json={
        "name": "Active Now",
        "startDate": (now - timedelta(days=1)).isoformat(),
        "endDate": (now + timedelta(days=30)).isoformat(),
        "description": "",
    })
    sid = r.json()["_id"]
    await admin_client.post(f"/api/academic/semesters/{sid}/activate")

    c = await client.get("/api/academic/semesters/current")
    assert c.status_code == 200
    assert c.json()["_id"] == sid


async def test_current_semester_null_if_none(client):
    r = await client.get("/api/academic/semesters/current")
    assert r.status_code == 200
    assert r.json() is None


async def test_delete_semester(client, admin_client):
    s = await admin_client.post("/api/academic/semesters", json=_semester_payload())
    sid = s.json()["_id"]
    d = await admin_client.delete(f"/api/academic/semesters/{sid}")
    assert d.status_code == 200
    lst = await client.get("/api/academic/semesters")
    assert lst.json() == []


async def test_create_event(admin_client, client):
    now = datetime.now(timezone.utc)
    r = await admin_client.post("/api/academic/calendar/events", json={
        "title": "Mid-term Exams",
        "description": "All departments",
        "eventType": "exam",
        "startDate": (now + timedelta(days=14)).isoformat(),
        "endDate": (now + timedelta(days=21)).isoformat(),
        "isPublic": True,
    })
    assert r.status_code == 201
    assert r.json()["title"] == "Mid-term Exams"
    assert r.json()["eventType"] == "exam"

    lst = await client.get("/api/academic/calendar/events")
    assert len(lst.json()) == 1


async def test_only_public_events_in_public_list(admin_client, client):
    now = datetime.now(timezone.utc)
    # Public event
    await admin_client.post("/api/academic/calendar/events", json={
        "title": "Public Holiday",
        "eventType": "holiday",
        "startDate": (now + timedelta(days=1)).isoformat(),
        "endDate": (now + timedelta(days=1)).isoformat(),
        "isPublic": True,
    })
    # Private event
    await admin_client.post("/api/academic/calendar/events", json={
        "title": "Staff Only Meeting",
        "eventType": "other",
        "startDate": (now + timedelta(days=2)).isoformat(),
        "endDate": (now + timedelta(days=2)).isoformat(),
        "isPublic": False,
    })

    lst = await client.get("/api/academic/calendar/events?publicOnly=true")
    titles = [e["title"] for e in lst.json()]
    assert "Public Holiday" in titles
    assert "Staff Only Meeting" not in titles

    admin_lst = await admin_client.get("/api/academic/calendar/events?publicOnly=false")
    admin_titles = [e["title"] for e in admin_lst.json()]
    assert "Staff Only Meeting" in admin_titles


async def test_event_upcoming_filter(admin_client):
    now = datetime.now(timezone.utc)
    # Past event
    await admin_client.post("/api/academic/calendar/events", json={
        "title": "Past Event",
        "eventType": "other",
        "startDate": (now - timedelta(days=30)).isoformat(),
        "endDate": (now - timedelta(days=29)).isoformat(),
        "isPublic": True,
    })
    # Future event
    await admin_client.post("/api/academic/calendar/events", json={
        "title": "Future Event",
        "eventType": "other",
        "startDate": (now + timedelta(days=5)).isoformat(),
        "endDate": (now + timedelta(days=6)).isoformat(),
        "isPublic": True,
    })

    lst = await admin_client.get("/api/academic/calendar/events?upcoming=true")
    titles = [e["title"] for e in lst.json()]
    assert "Future Event" in titles
    assert "Past Event" not in titles


async def test_event_link_to_semester(admin_client, client):
    s = await admin_client.post("/api/academic/semesters", json=_semester_payload())
    sid = s.json()["_id"]
    now = datetime.now(timezone.utc)

    r = await admin_client.post("/api/academic/calendar/events", json={
        "title": "Semester Kickoff",
        "eventType": "orientation",
        "startDate": (now + timedelta(days=30)).isoformat(),
        "endDate": (now + timedelta(days=30)).isoformat(),
        "semesterId": sid,
        "isPublic": True,
    })
    assert r.status_code == 201

    # Filter by semester
    lst = await client.get(f"/api/academic/calendar/events?semesterId={sid}")
    assert len(lst.json()) == 1


async def test_delete_event(admin_client):
    now = datetime.now(timezone.utc)
    r = await admin_client.post("/api/academic/calendar/events", json={
        "title": "Temp",
        "eventType": "other",
        "startDate": now.isoformat(),
        "endDate": now.isoformat(),
        "isPublic": True,
    })
    eid = r.json()["_id"]
    d = await admin_client.delete(f"/api/academic/calendar/events/{eid}")
    assert d.status_code == 200
    g = await admin_client.get(f"/api/academic/calendar/events/{eid}")
    assert g.status_code == 404
