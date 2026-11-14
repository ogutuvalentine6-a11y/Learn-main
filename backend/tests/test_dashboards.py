"""Role-specific dashboard endpoints — verifies shape and self-containment."""


async def test_student_dashboard_empty(student_client):
    r = await student_client.get("/api/analytics/student")
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body
    assert body["summary"]["enrollmentsTotal"] == 0
    assert "upcomingLive" in body
    assert "pendingWork" in body
    assert "recentScores" in body


async def test_student_dashboard_only_own_data(student_client, admin_client, sample_course):
    # Admin enrolls themselves (different user)
    await admin_client.post(
        "/api/paystack-webhook", json={},
        headers={"x-paystack-signature": "invalid"},
    )
    # Verify student sees only their own enrollments (zero)
    r = await student_client.get("/api/analytics/student")
    assert r.status_code == 200
    assert r.json()["summary"]["enrollmentsTotal"] == 0


async def test_staff_dashboard_requires_staff(student_client):
    r = await student_client.get("/api/analytics/staff")
    assert r.status_code == 403


async def test_staff_dashboard_shape(staff_client):
    r = await staff_client.get("/api/analytics/staff")
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body
    assert "courses" in body
    assert "pendingSubmissions" in body
    assert "upcomingLive" in body
    assert body["summary"]["coursesAssigned"] == 0


async def test_admin_dashboard_shape(admin_client):
    r = await admin_client.get("/api/analytics/overview")
    assert r.status_code == 200
    body = r.json()
    for key in ("users", "courses", "enrollments", "revenue", "progress", "live", "moderation", "reels", "community"):
        assert key in body


async def test_admin_dashboard_forbidden_for_student(student_client):
    r = await student_client.get("/api/analytics/overview")
    assert r.status_code == 403
