"""i18n — user language preference storage and update."""


async def test_user_has_default_language(student_user, student_client):
    r = await student_client.get("/api/auth-me")
    assert r.status_code == 200
    # language field may be absent in old docs, defaults to en
    body = r.json()
    assert body.get("language", "en") == "en"


async def test_update_language(student_client):
    r = await student_client.patch("/api/auth-me/language", json={"language": "sw"})
    assert r.status_code == 200
    assert r.json()["language"] == "sw"

    # Verify persisted
    me = await student_client.get("/api/auth-me")
    assert me.json()["language"] == "sw"


async def test_update_language_to_french(student_client):
    r = await student_client.patch("/api/auth-me/language", json={"language": "fr"})
    assert r.status_code == 200
    assert r.json()["language"] == "fr"


async def test_reject_invalid_language(student_client):
    r = await student_client.patch("/api/auth-me/language", json={"language": "de"})
    assert r.status_code == 422


async def test_requires_auth(client):
    r = await client.patch("/api/auth-me/language", json={"language": "sw"})
    assert r.status_code == 401


async def test_language_survives_relogin(client):
    # Register
    reg = await client.post("/api/auth-register", json={
        "idNumber": "LANG-001",
        "fullName": "Lang Test",
        "email": "lang@example.com",
        "phone": "+254700000001",
        "location": "Nairobi",
        "school": "Test U",
        "fieldOfStudy": "CS",
        "courseOfStudy": "BSc",
        "password": "Passw0rd!",
    })
    assert reg.status_code == 201

    # Login
    await client.post("/api/auth-login", json={
        "email": "lang@example.com",
        "password": "Passw0rd!",
    })

    # Update language
    await client.patch("/api/auth-me/language", json={"language": "fr"})

    # Logout, log back in
    await client.post("/api/auth-logout")
    await client.post("/api/auth-login", json={
        "email": "lang@example.com",
        "password": "Passw0rd!",
    })

    # Language should persist
    me = await client.get("/api/auth-me")
    assert me.json()["language"] == "fr"
