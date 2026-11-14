"""Careers — public listing filters expired/draft, admin CRUD."""
from datetime import datetime, timezone, timedelta


def _job_payload(**overrides):
    base = {
        "title": "Software Engineer Intern",
        "company": "Acme Corp",
        "location": "Remote",
        "jobType": "internship",
        "description": "Work on real projects.",
        "requirements": ["Python", "Git"],
        "salary": "KES 30,000/month",
        "applyUrl": "https://acme.example.com/apply",
        "deadline": None,
        "featured": False,
        "status": "published",
    }
    base.update(overrides)
    return base


async def test_public_list_empty(client):
    r = await client.get("/api/jobs/public")
    assert r.status_code == 200
    assert r.json() == []


async def test_admin_create_published(admin_client, client):
    r = await admin_client.post("/api/jobs", json=_job_payload())
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Software Engineer Intern"
    assert body["status"] == "published"

    # Public list shows it
    pub = await client.get("/api/jobs/public")
    assert len(pub.json()) == 1


async def test_create_requires_admin(student_client):
    r = await student_client.post("/api/jobs", json=_job_payload())
    assert r.status_code == 403


async def test_draft_hidden_from_public(admin_client, client):
    r = await admin_client.post("/api/jobs", json=_job_payload(status="draft"))
    assert r.status_code == 201

    pub = await client.get("/api/jobs/public")
    assert pub.json() == []


async def test_expired_hidden_from_public(admin_client, client):
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    r = await admin_client.post("/api/jobs", json=_job_payload(deadline=past))
    assert r.status_code == 201

    pub = await client.get("/api/jobs/public")
    assert pub.json() == []


async def test_public_detail_404_for_draft(admin_client, client):
    r = await admin_client.post("/api/jobs", json=_job_payload(status="draft"))
    job_id = r.json()["_id"]

    pub = await client.get(f"/api/jobs/public/{job_id}")
    assert pub.status_code == 404


async def test_admin_update(admin_client):
    r = await admin_client.post("/api/jobs", json=_job_payload())
    job_id = r.json()["_id"]

    u = await admin_client.patch(f"/api/jobs/{job_id}", json={
        "title": "Updated Title",
        "featured": True,
    })
    assert u.status_code == 200
    assert u.json()["title"] == "Updated Title"
    assert u.json()["featured"] is True


async def test_admin_close(admin_client):
    r = await admin_client.post("/api/jobs", json=_job_payload())
    job_id = r.json()["_id"]

    c = await admin_client.patch(f"/api/jobs/{job_id}", json={"status": "closed"})
    assert c.status_code == 200
    assert c.json()["status"] == "closed"


async def test_admin_delete(admin_client, client):
    r = await admin_client.post("/api/jobs", json=_job_payload())
    job_id = r.json()["_id"]

    d = await admin_client.delete(f"/api/jobs/{job_id}")
    assert d.status_code == 200

    pub = await client.get("/api/jobs/public")
    assert pub.json() == []


async def test_reject_invalid_apply_url(admin_client):
    r = await admin_client.post("/api/jobs", json=_job_payload(applyUrl="javascript:alert(1)"))
    assert r.status_code == 422


async def test_search_by_title(admin_client, client):
    await admin_client.post("/api/jobs", json=_job_payload(title="Python Developer"))
    await admin_client.post("/api/jobs", json=_job_payload(title="Marketing Assistant"))

    r = await client.get("/api/jobs/public?q=python")
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Python Developer"
