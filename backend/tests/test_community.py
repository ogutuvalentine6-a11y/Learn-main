"""Community: thread create, reply counter, study group ownership."""


async def test_create_thread(admin_client):
    r = await admin_client.post(
        "/api/discussions/threads",
        json={
            "title": "Welcome",
            "body": "This is a welcome thread with enough content to pass validation.",
            "kind": "discussion",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Welcome"
    assert body["replyCount"] == 0
    assert body["authorRole"] == "admin"


async def test_reply_increments_counter(admin_client):
    t = await admin_client.post(
        "/api/discussions/threads",
        json={"title": "Reply Test", "body": "Body content here."},
    )
    tid = t.json()["_id"]

    r = await admin_client.post(
        f"/api/discussions/threads/{tid}/replies",
        json={"body": "First reply"},
    )
    assert r.status_code == 201

    # Fetch thread, verify counter
    get = await admin_client.get(f"/api/discussions/threads/{tid}")
    assert get.status_code == 200
    assert get.json()["thread"]["replyCount"] == 1


async def test_study_group_owner_auto_joined(admin_client, admin_user):
    r = await admin_client.post(
        "/api/study-groups",
        json={"name": "Test Group", "description": "Test desc", "maxMembers": 5},
    )
    assert r.status_code == 201
    body = r.json()
    assert len(body["memberIds"]) == 1
    assert body["ownerName"] == "Test Admin"


async def test_unauth_cannot_create_thread(client):
    r = await client.post(
        "/api/discussions/threads",
        json={"title": "Anon", "body": "Anonymous attempt"},
    )
    assert r.status_code == 401
