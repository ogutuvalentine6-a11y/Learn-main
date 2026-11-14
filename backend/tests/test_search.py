"""Global search — courses, instructors, resources, reels, jobs."""


async def test_search_requires_query_param(client):
    r = await client.get("/api/search")
    assert r.status_code == 422  # missing required q


async def test_search_short_query_rejected(client):
    r = await client.get("/api/search?q=a")
    assert r.status_code == 422  # min_length=2


async def test_search_empty_result(client):
    r = await client.get("/api/search?q=zzzznothing")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert body["results"]["courses"] == []


async def test_search_finds_course(client, admin_client):
    await admin_client.post("/api/course-create", json={
        "title": "Advanced Python",
        "description": "Deep dive into Python internals",
        "price": 5000,
    })
    await admin_client.post("/api/course-create", json={
        "title": "JavaScript Basics",
        "description": "Front-end foundations",
        "price": 3000,
    })
    r = await client.get("/api/search?q=python")
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]["courses"]) == 1
    assert body["results"]["courses"][0]["title"] == "Advanced Python"
    assert body["results"]["courses"][0]["href"].startswith("/courses/")


async def test_search_finds_instructor(client, staff_user):
    r = await client.get("/api/search?q=staff")
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]["instructors"]) == 1
    assert body["results"]["instructors"][0]["title"] == "Test Staff"


async def test_search_only_public_resources(client, admin_client, db):
    # Insert one public-approved resource, one private
    await db.resources.insert_one({
        "title": "Public PDF",
        "description": "Shared notes",
        "url": "https://example.com/a.pdf",
        "visibility": "public",
        "status": "approved",
        "category": "Programming",
    })
    await db.resources.insert_one({
        "title": "Private PDF",
        "description": "Secret notes",
        "url": "https://example.com/b.pdf",
        "visibility": "private",
        "status": "approved",
        "category": "Programming",
    })

    r = await client.get("/api/search?q=pdf")
    body = r.json()
    titles = [x["title"] for x in body["results"]["resources"]]
    assert "Public PDF" in titles
    assert "Private PDF" not in titles


async def test_search_only_published_jobs(client, admin_client):
    await admin_client.post("/api/jobs", json={
        "title": "Python Developer",
        "company": "Acme",
        "applyUrl": "https://acme.example.com/apply",
        "status": "published",
    })
    await admin_client.post("/api/jobs", json={
        "title": "Python Intern",
        "company": "Beta",
        "applyUrl": "https://beta.example.com/apply",
        "status": "draft",
    })
    r = await client.get("/api/search?q=python")
    body = r.json()
    titles = [x["title"] for x in body["results"]["jobs"]]
    assert "Python Developer" in titles
    assert "Python Intern" not in titles


async def test_search_respects_limit(client, admin_client):
    for i in range(8):
        await admin_client.post("/api/course-create", json={
            "title": f"Course {i}",
            "description": "matching",
            "price": 100,
        })
    r = await client.get("/api/search?q=course&limit=3")
    body = r.json()
    assert len(body["results"]["courses"]) == 3
