"""Guardian portal — admin creates + links, guardian sees read-only data."""


async def test_admin_creates_guardian(admin_client, student_user):
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent One",
        "email": "parent1@example.com",
        "phone": "+254700000001",
        "idNumber": "G-001",
        "studentId": student_user["_id"],
        "relationship": "parent",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "parent1@example.com"
    assert len(body["tempPassword"]) >= 10
    assert "guardianId" in body


async def test_guardian_login_works(admin_client, client, student_user):
    await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent One", "email": "p1@example.com",
        "phone": "+254700000001", "idNumber": "G-101",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    # Get the temp password by reading the response again (need to re-create or check DB)
    # Simpler: create a fresh guardian and capture the password
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Two", "email": "p2@example.com",
        "phone": "+254700000002", "idNumber": "G-102",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    temp_pw = r.json()["tempPassword"]

    login = await client.post("/api/auth-login", json={
        "email": "p2@example.com", "password": temp_pw,
    })
    assert login.status_code == 200
    assert login.json()["role"] == "guardian"


async def test_student_cannot_create_guardian(student_client, student_user):
    r = await student_client.post("/api/admin/guardians", json={
        "fullName": "X", "email": "x@example.com",
        "phone": "+254700000009", "idNumber": "G-X",
        "studentId": student_user["_id"],
    })
    assert r.status_code == 403


async def test_guardian_students_list(admin_client, student_user):
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Three", "email": "p3@example.com",
        "phone": "+254700000003", "idNumber": "G-103",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    temp_pw = r.json()["tempPassword"]

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as gc:
        await gc.post("/api/auth-login", json={
            "email": "p3@example.com", "password": temp_pw,
        })
        s = await gc.get("/api/guardian/students")
        assert s.status_code == 200
        body = s.json()
        assert len(body) == 1
        assert body[0]["fullName"] == "Test Student"


async def test_guardian_student_detail(admin_client, student_user):
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Four", "email": "p4@example.com",
        "phone": "+254700000004", "idNumber": "G-104",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    temp_pw = r.json()["tempPassword"]

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as gc:
        await gc.post("/api/auth-login", json={
            "email": "p4@example.com", "password": temp_pw,
        })
        d = await gc.get(f"/api/guardian/students/{student_user['_id']}")
        assert d.status_code == 200
        body = d.json()
        assert body["student"]["fullName"] == "Test Student"
        assert "enrollments" in body
        assert "payments" in body
        assert "scores" in body


async def test_guardian_cannot_view_unlinked_student(
    admin_client, staff_user, student_user,
):
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Five", "email": "p5@example.com",
        "phone": "+254700000005", "idNumber": "G-105",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    temp_pw = r.json()["tempPassword"]

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as gc:
        await gc.post("/api/auth-login", json={
            "email": "p5@example.com", "password": temp_pw,
        })
        # Try accessing staff user as if they were a student
        d = await gc.get(f"/api/guardian/students/{staff_user['_id']}")
        assert d.status_code == 403


async def test_guardian_cannot_admin(admin_client, student_user):
    r = await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Six", "email": "p6@example.com",
        "phone": "+254700000006", "idNumber": "G-106",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    temp_pw = r.json()["tempPassword"]

    from httpx import ASGITransport, AsyncClient
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as gc:
        await gc.post("/api/auth-login", json={
            "email": "p6@example.com", "password": temp_pw,
        })
        r1 = await gc.get("/api/admin-users")
        assert r1.status_code == 403
        r2 = await gc.get("/api/analytics/overview")
        assert r2.status_code == 403


async def test_admin_lists_guardian_links(admin_client, student_user):
    await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Seven", "email": "p7@example.com",
        "phone": "+254700000007", "idNumber": "G-107",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    r = await admin_client.get("/api/admin/guardian-links")
    assert r.status_code == 200
    assert len(r.json()) == 1


async def test_admin_unlinks(admin_client, student_user):
    await admin_client.post("/api/admin/guardians", json={
        "fullName": "Parent Eight", "email": "p8@example.com",
        "phone": "+254700000008", "idNumber": "G-108",
        "studentId": student_user["_id"], "relationship": "parent",
    })
    links = await admin_client.get("/api/admin/guardian-links")
    link_id = links.json()[0]["id"]

    d = await admin_client.delete(f"/api/admin/guardian-links/{link_id}")
    assert d.status_code == 200

    links2 = await admin_client.get("/api/admin/guardian-links")
    assert links2.json() == []


async def test_duplicate_guardian_email_rejected(admin_client, student_user):
    payload = {
        "fullName": "Dup", "email": "dup@example.com",
        "phone": "+254700000010", "idNumber": "G-110",
        "studentId": student_user["_id"], "relationship": "parent",
    }
    await admin_client.post("/api/admin/guardians", json=payload)
    r = await admin_client.post("/api/admin/guardians", json={
        **payload, "idNumber": "G-111",
    })
    assert r.status_code == 409
