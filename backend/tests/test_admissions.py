"""Admissions — public apply, admin approval creates user, status check."""


VALID = {
    "fullName": "Jane Applicant",
    "email": "jane@example.com",
    "phone": "+254700000000",
    "idNumber": "APP-001",
    "location": "Nairobi",
    "school": "Test U",
    "fieldOfStudy": "CS",
    "courseOfStudy": "BSc",
    "motivation": "I want to learn",
}


async def test_apply_succeeds(client):
    r = await client.post("/api/admissions/apply", json=VALID)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "jane@example.com"
    assert body["status"] == "pending"


async def test_apply_duplicate_rejected(client):
    await client.post("/api/admissions/apply", json=VALID)
    r = await client.post("/api/admissions/apply", json=VALID)
    assert r.status_code == 409


async def test_apply_email_with_existing_account_rejected(client, student_user):
    payload = {**VALID, "email": "student@example.com", "idNumber": "APP-X"}
    r = await client.post("/api/admissions/apply", json=payload)
    assert r.status_code == 409


async def test_check_status(client):
    await client.post("/api/admissions/apply", json=VALID)
    r = await client.get("/api/admissions/check?email=jane@example.com")
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


async def test_check_status_missing(client):
    r = await client.get("/api/admissions/check?email=nobody@example.com")
    assert r.status_code == 404


async def test_admin_list_requires_admin(client, student_client):
    r1 = await client.get("/api/admissions")
    assert r1.status_code == 401
    r2 = await student_client.get("/api/admissions")
    assert r2.status_code == 403


async def test_admin_approve_creates_user(admin_client, client):
    await client.post("/api/admissions/apply", json=VALID)
    lst = await admin_client.get("/api/admissions?status=pending")
    app_id = lst.json()[0]["_id"]

    r = await admin_client.patch(f"/api/admissions/{app_id}/approve")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["email"] == "jane@example.com"
    assert len(body["tempPassword"]) >= 10
    assert "userId" in body

    # Verify user can now login with temp password
    login = await client.post("/api/auth-login", json={
        "email": "jane@example.com",
        "password": body["tempPassword"],
    })
    assert login.status_code == 200
    assert login.json()["role"] == "student"


async def test_admin_approve_twice_fails(admin_client, client):
    await client.post("/api/admissions/apply", json=VALID)
    lst = await admin_client.get("/api/admissions?status=pending")
    app_id = lst.json()[0]["_id"]

    await admin_client.patch(f"/api/admissions/{app_id}/approve")
    r2 = await admin_client.patch(f"/api/admissions/{app_id}/approve")
    assert r2.status_code == 400


async def test_admin_reject(admin_client, client):
    await client.post("/api/admissions/apply", json=VALID)
    lst = await admin_client.get("/api/admissions?status=pending")
    app_id = lst.json()[0]["_id"]

    r = await admin_client.patch(f"/api/admissions/{app_id}/reject?reason=Incomplete")
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert r.json()["reviewNote"] == "Incomplete"
