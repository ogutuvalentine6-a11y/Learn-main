"""Resource upload signature, create with visibility rules, approval flow."""


async def test_upload_signature_requires_auth(client):
    r = await client.get("/api/resources/upload-signature")
    assert r.status_code == 401


async def test_upload_signature_returns_shape(student_client):
    r = await student_client.get("/api/resources/upload-signature")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"signature", "timestamp", "folder", "apiKey"}
    assert "resources/" in body["folder"]


async def test_student_private_resource_auto_approved(student_client):
    r = await student_client.post(
        "/api/resources",
        json={
            "title": "My Notes",
            "url": "https://res.cloudinary.com/demo/notes.pdf",
            "visibility": "private",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "approved"
    assert body["visibility"] == "private"
    assert body["ownerRole"] == "student"


async def test_student_public_resource_pending(student_client):
    r = await student_client.post(
        "/api/resources",
        json={
            "title": "Public Resource",
            "url": "https://res.cloudinary.com/demo/public.pdf",
            "visibility": "public",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending"


async def test_admin_approve_changes_status(admin_client, student_client):
    create = await student_client.post(
        "/api/resources",
        json={
            "title": "Needs Approval",
            "url": "https://res.cloudinary.com/demo/x.pdf",
            "visibility": "public",
        },
    )
    assert create.status_code == 201
    rid = create.json()["_id"]
    assert create.json()["status"] == "pending"

    approve = await admin_client.patch(f"/api/resources/{rid}/approve")
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"
