"""Reels: auto-approve for staff, pending for student, public feed, like toggle."""

PAYLOAD = {
    "title": "Test Reel",
    "description": "A short educational video",
    "videoUrl": "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    "category": "Programming",
}


async def test_staff_reel_auto_approved(staff_client):
    r = await staff_client.post("/api/reels", json=PAYLOAD)
    assert r.status_code == 201
    assert r.json()["status"] == "approved"


async def test_student_reel_pending(student_client):
    r = await student_client.post("/api/reels", json=PAYLOAD)
    assert r.status_code == 201
    assert r.json()["status"] == "pending"


async def test_public_feed_only_approved(client, staff_client, student_client):
    # Staff → auto-approved, visible
    r1 = await staff_client.post("/api/reels", json={**PAYLOAD, "title": "Staff Reel"})
    assert r1.status_code == 201
    # Student → pending, hidden from public feed
    r2 = await student_client.post("/api/reels", json={**PAYLOAD, "title": "Student Reel"})
    assert r2.status_code == 201

    feed = await client.get("/api/reels")
    assert feed.status_code == 200
    titles = [x["title"] for x in feed.json()]
    assert "Staff Reel" in titles
    assert "Student Reel" not in titles


async def test_like_toggle(staff_client, student_client):
    # Create approved reel by staff
    created = await staff_client.post("/api/reels", json={**PAYLOAD, "title": "Likeable"})
    rid = created.json()["_id"]
    assert created.json()["likes"] == 0

    # Like
    like = await student_client.post(f"/api/reels/{rid}/like")
    assert like.status_code == 200
    assert like.json()["liked"] is True

    # Fetch and check count
    feed = await student_client.get("/api/reels")
    reel = next(x for x in feed.json() if x["_id"] == rid)
    assert reel["likes"] == 1

    # Unlike (toggle)
    unlike = await student_client.post(f"/api/reels/{rid}/like")
    assert unlike.status_code == 200
    assert unlike.json()["liked"] is False
