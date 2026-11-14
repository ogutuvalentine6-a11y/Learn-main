"""Notifications — per-user isolation, read/unread."""


async def test_empty_list(student_client):
    r = await student_client.get("/api/notifications")
    assert r.status_code == 200
    assert r.json() == []


async def test_unread_count_zero(student_client):
    r = await student_client.get("/api/notifications/unread-count")
    assert r.status_code == 200
    assert r.json()["count"] == 0


async def test_mark_read_wrong_user_fails(admin_client, student_client):
    # Admin creates a notification for themselves by direct insert
    from app.db.mongodb import get_database
    from bson import ObjectId
    from datetime import datetime, timezone
    db = get_database()
    now = datetime.now(timezone.utc)
    admin = await db.users.find_one({"email": "admin@example.com"})
    result = await db.notifications.insert_one({
        "userId": admin["_id"], "kind": "system", "title": "Admin only",
        "body": "", "link": "", "read": False, "createdAt": now,
    })
    # Student tries to mark it read
    r = await student_client.patch(f"/api/notifications/{result.inserted_id}/read")
    assert r.status_code == 404  # not found for this user


async def test_notifications_require_auth(client):
    r = await client.get("/api/notifications")
    assert r.status_code == 401
