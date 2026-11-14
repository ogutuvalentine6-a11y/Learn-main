"""Courses: public list, admin create, role gates, whitelist, soft-delete."""


async def test_public_list_empty(client):
    r = await client.get("/api/course-list")
    assert r.status_code == 200
    assert r.json() == []


async def test_create_course_as_admin(admin_client):
    r = await admin_client.post(
        "/api/course-create",
        json={
            "title": "Python 101",
            "description": "Learn Python basics",
            "price": 5000,
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Python 101"
    assert body["isActive"] is True
    assert body["price"] == 5000


async def test_create_course_as_student_forbidden(student_client):
    r = await student_client.post(
        "/api/course-create",
        json={
            "title": "Hack Course",
            "description": "Should fail",
            "price": 1,
        },
    )
    assert r.status_code == 403


async def test_update_course_title(admin_client, sample_course):
    r = await admin_client.patch(
        "/api/course-update",
        json={"courseId": sample_course["_id"], "title": "Renamed Course"},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Renamed Course"


async def test_update_course_blocks_mass_assignment(admin_client, sample_course):
    r = await admin_client.patch(
        "/api/course-update",
        json={
            "courseId": sample_course["_id"],
            "_id": "hacked",
            "createdBy": "evil",
            "title": "Hacked",
        },
    )
    assert r.status_code == 400
    assert "error" in r.json()


async def test_soft_delete_hides_from_list(admin_client, sample_course):
    r = await admin_client.request(
        "DELETE",
        "/api/course-delete",
        json={"courseId": sample_course["_id"]},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Public list should now be empty
    r2 = await admin_client.get("/api/course-list")
    assert r2.json() == []
