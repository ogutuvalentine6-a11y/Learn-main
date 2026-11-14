"""Gamification — idempotent awards, badges, leaderboard."""
from bson import ObjectId
from datetime import datetime, timezone, timedelta


async def test_empty_state(student_client):
    r = await student_client.get("/api/gamification/me")
    assert r.status_code == 200
    body = r.json()
    assert body["points"] == 0
    assert body["earnedCount"] == 0
    assert body["totalBadges"] == 8
    assert len(body["badges"]) == 8
    for b in body["badges"]:
        assert b["earned"] is False


async def test_award_points_idempotent(student_user):
    from app.services.gamification import award_points, get_total_points

    first = await award_points(student_user["_id"], "quiz_pass", "entity-1")
    assert first is True
    second = await award_points(student_user["_id"], "quiz_pass", "entity-1")
    assert second is False  # idempotent

    points = await get_total_points(student_user["_id"])
    assert points == 20  # only once


async def test_award_different_entities_accumulates(student_user):
    from app.services.gamification import award_points, get_total_points

    await award_points(student_user["_id"], "quiz_pass", "entity-A")
    await award_points(student_user["_id"], "quiz_pass", "entity-B")
    await award_points(student_user["_id"], "quiz_pass", "entity-C")

    points = await get_total_points(student_user["_id"])
    assert points == 60  # 20 * 3


async def test_award_badge_idempotent(student_user):
    from app.services.gamification import award_badge, get_user_badges

    first = await award_badge(student_user["_id"], "first_quiz_pass")
    assert first is True
    second = await award_badge(student_user["_id"], "first_quiz_pass")
    assert second is False

    badges = await get_user_badges(student_user["_id"])
    assert badges == {"first_quiz_pass"}


async def test_award_unknown_badge_rejected(student_user):
    from app.services.gamification import award_badge

    result = await award_badge(student_user["_id"], "nonexistent_badge")
    assert result is False


async def test_assignment_submission_awards_points(
    admin_client, student_client, student_user, sample_course, db,
):
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "paymentStatus": "paid",
        "currentSessionOrder": 1,
        "completedAt": None,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    })
    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Essay", "maxScore": 100,
    })
    aid = a.json()["_id"]
    await student_client.post(f"/api/assignments/{aid}/submit", json={
        "fileUrl": "https://res.cloudinary.com/demo/x.pdf",
    })

    r = await student_client.get("/api/gamification/me")
    assert r.json()["points"] == 10  # assignment_submission
    assert any(b["badgeId"] == "first_submission" and b["earned"] for b in r.json()["badges"])


async def test_assignment_high_grade_bonus(
    admin_client, student_client, student_user, sample_course, db,
):
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "paymentStatus": "paid",
        "currentSessionOrder": 1, "completedAt": None,
        "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc),
    })
    a = await admin_client.post("/api/assignments", json={
        "courseId": sample_course["_id"], "title": "Essay", "maxScore": 100,
    })
    aid = a.json()["_id"]
    s = await student_client.post(f"/api/assignments/{aid}/submit", json={
        "fileUrl": "https://res.cloudinary.com/demo/x.pdf",
    })
    sid = s.json()["_id"]

    # Grade 90%+ → bonus
    await admin_client.patch(f"/api/assignments/submissions/{sid}/grade", json={
        "score": 90, "feedback": "Excellent",
    })

    r = await student_client.get("/api/gamification/me")
    # 10 (submission) + 30 (high grade) = 40
    assert r.json()["points"] == 40


async def test_discussion_thread_awards(student_client):
    r = await student_client.post("/api/discussions/threads", json={
        "title": "My first question",
        "body": "How do I get started with Python?",
    })
    assert r.status_code == 201

    me = await student_client.get("/api/gamification/me")
    assert me.json()["points"] == 5
    assert any(b["badgeId"] == "discussion_starter" and b["earned"] for b in me.json()["badges"])


async def test_leaderboard_empty(client):
    r = await client.get("/api/gamification/leaderboard")
    assert r.status_code == 200
    assert r.json() == []


async def test_leaderboard_ordered_by_points(
    admin_client, staff_client, student_user, staff_user, db,
):
    from app.services.gamification import award_points
    await award_points(student_user["_id"], "quiz_pass", "a1")
    await award_points(student_user["_id"], "quiz_pass", "a2")
    await award_points(student_user["_id"], "quiz_pass", "a3")  # 60
    await award_points(staff_user["_id"], "quiz_pass", "b1")    # 20

    r = await admin_client.get("/api/gamification/leaderboard")
    rows = r.json()
    assert len(rows) == 2
    assert rows[0]["points"] == 60
    assert rows[1]["points"] == 20
    assert rows[0]["rank"] == 1


async def test_leaderboard_anonymous_ok(client, student_user):
    """Leaderboard is public — no auth needed."""
    from app.services.gamification import award_points
    await award_points(student_user["_id"], "quiz_pass", "x")
    r = await client.get("/api/gamification/leaderboard")
    assert r.status_code == 200
    assert len(r.json()) == 1


async def test_quiz_pass_awards_points(
    admin_client, student_client, student_user, sample_course, db,
):
    """End-to-end: create quiz, student passes, check points awarded."""
    from bson import ObjectId
    # Enroll
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_user["_id"]),
        "courseId": ObjectId(sample_course["_id"]),
        "paymentStatus": "paid",
        "currentSessionOrder": 1, "completedAt": None,
        "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc),
    })
    # Create quiz
    q = await admin_client.post("/api/quizzes", json={
        "courseId": sample_course["_id"],
        "title": "Gami Quiz",
        "questions": [{
            "id": "q1", "type": "mcq", "prompt": "2+2?",
            "options": ["3", "4", "5"], "correctAnswers": [1],
            "points": 1, "expectedText": "", "explanation": "",
        }],
        "timerSeconds": 0, "passMark": 50, "maxAttempts": 1, "published": True,
    })
    qid = q.json()["_id"]

    await student_client.post(f"/api/quizzes/{qid}/start")
    await student_client.post(f"/api/quizzes/{qid}/submit", json={
        "answers": [{"questionId": "q1", "selected": [1]}],
    })

    me = await student_client.get("/api/gamification/me")
    # 20 (quiz_pass) + 50 (perfect) = 70
    assert me.json()["points"] == 70
    earned = {b["badgeId"] for b in me.json()["badges"] if b["earned"]}
    assert "first_quiz_pass" in earned
    assert "perfect_score" in earned
