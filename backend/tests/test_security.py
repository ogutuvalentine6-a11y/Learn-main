"""Security headers, URL scheme rejection, write rate limiter."""


async def test_security_headers_present(client):
    r = await client.get("/health")
    assert r.status_code == 200
    h = r.headers
    assert h.get("x-content-type-options") == "nosniff"
    assert h.get("x-frame-options") == "DENY"
    assert "referrer-policy" in h
    assert "permissions-policy" in h
    assert "content-security-policy" in h


async def test_javascript_url_rejected(admin_client):
    r = await admin_client.post(
        "/api/resources",
        json={
            "title": "XSS Test",
            "url": "javascript:alert(1)",
            "visibility": "private",
        },
    )
    assert r.status_code == 422
    body = r.json()
    assert body["error"] == "Invalid input"
    # Validator message mentions scheme
    fields = body.get("fields", [])
    assert any("scheme" in f.get("msg", "").lower() for f in fields)


async def test_https_url_accepted(admin_client):
    r = await admin_client.post(
        "/api/resources",
        json={
            "title": "Good Resource",
            "url": "https://res.cloudinary.com/demo/sample.pdf",
            "visibility": "private",
        },
    )
    assert r.status_code == 201


async def test_write_rate_limit_fires(admin_client):
    """20/min write bucket should reject the 21st request from same IP."""
    payload = {
        "title": "Rate Limit Test",
        "videoUrl": "https://res.cloudinary.com/demo/video/upload/dog.mp4",
        "category": "General",
    }
    codes = []
    for _ in range(25):
        r = await admin_client.post("/api/reels", json=payload)
        codes.append(r.status_code)

    # First 20 should succeed, rest should 429
    assert all(c == 201 for c in codes[:20]), f"codes[:20]={codes[:20]}"
    assert any(c == 429 for c in codes[20:]), f"codes[20:]={codes[20:]}"
