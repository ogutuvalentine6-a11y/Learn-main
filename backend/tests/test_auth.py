"""Auth flow: register, login, me, logout."""
from tests.conftest import _create_user


async def test_register_happy_path(client):
    r = await client.post(
        "/api/auth-register",
        json={
            "idNumber": "STU-100",
            "fullName": "New Student",
            "email": "new@example.com",
            "phone": "+254711000100",
            "location": "Nairobi",
            "school": "Test U",
            "fieldOfStudy": "CS",
            "courseOfStudy": "BSc",
            "password": "Passw0rd!",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert "id" in body
    assert body["email"] == "new@example.com"


async def test_register_duplicate_email(client):
    payload = {
        "idNumber": "STU-200",
        "fullName": "Dup Student",
        "email": "dup@example.com",
        "phone": "+254711000200",
        "location": "Nairobi",
        "school": "Test U",
        "fieldOfStudy": "CS",
        "courseOfStudy": "BSc",
        "password": "Passw0rd!",
    }
    r1 = await client.post("/api/auth-register", json=payload)
    assert r1.status_code == 201

    # Second attempt: same email, different idNumber
    payload["idNumber"] = "STU-201"
    r2 = await client.post("/api/auth-register", json=payload)
    assert r2.status_code == 409
    assert "error" in r2.json()


async def test_login_wrong_password(client, student_user):
    r = await client.post(
        "/api/auth-login",
        json={"email": "student@example.com", "password": "WrongPass1!"},
    )
    assert r.status_code == 401
    assert "error" in r.json()


async def test_login_correct(client, student_user):
    r = await client.post(
        "/api/auth-login",
        json={"email": "student@example.com", "password": "Passw0rd!"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "student@example.com"
    assert body["role"] == "student"
    assert "token" in r.cookies


async def test_me_requires_cookie(client):
    r = await client.get("/api/auth-me")
    assert r.status_code == 401


async def test_me_with_cookie(student_client):
    r = await student_client.get("/api/auth-me")
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "student@example.com"
    assert "password" not in body


async def test_logout_clears_cookie(student_client):
    r = await student_client.post("/api/auth-logout")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    # After logout, /me should 401
    r2 = await student_client.get("/api/auth-me")
    assert r2.status_code == 401
