"""Multi-question quizzes — creation, auto-grading, manual grading."""


QUIZ_PAYLOAD = {
    "courseId": "",
    "title": "Python Basics Quiz",
    "description": "Test your knowledge",
    "questions": [
        {
            "id": "q1", "type": "mcq", "prompt": "2 + 2 = ?",
            "options": ["3", "4", "5"], "correctAnswers": [1],
            "points": 1, "expectedText": "", "explanation": "",
        },
        {
            "id": "q2", "type": "truefalse", "prompt": "Python is dynamically typed",
            "options": ["True", "False"], "correctAnswers": [0],
            "points": 1, "expectedText": "", "explanation": "",
        },
        {
            "id": "q3", "type": "short", "prompt": "What keyword defines a function?",
            "options": [], "correctAnswers": [], "expectedText": "def",
            "points": 1, "explanation": "",
        },
    ],
    "timerSeconds": 0,
    "passMark": 50,
    "maxAttempts": 2,
    "published": True,
}


async def _enroll_student(db, student_id, course_id):
    from bson import ObjectId
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    await db.enrollments.insert_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id),
        "paymentStatus": "paid",
        "currentSessionOrder": 1,
        "completedAt": None,
        "createdAt": now,
        "updatedAt": now,
    })


async def test_student_cannot_create_quiz(student_client, sample_course):
    r = await student_client.post("/api/quizzes", json={
        **QUIZ_PAYLOAD, "courseId": sample_course["_id"],
    })
    assert r.status_code == 403


async def test_staff_creates_quiz(admin_client, sample_course):
    r = await admin_client.post("/api/quizzes", json={
        **QUIZ_PAYLOAD, "courseId": sample_course["_id"],
    })
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Python Basics Quiz"
    assert len(body["questions"]) == 3


async def test_mcq_with_multiple_correct_rejected(admin_client, sample_course):
    payload = {**QUIZ_PAYLOAD, "courseId": sample_course["_id"]}
    payload["questions"] = [{
        "id": "q1", "type": "mcq", "prompt": "Bad",
        "options": ["A", "B"], "correctAnswers": [0, 1],
        "points": 1, "expectedText": "", "explanation": "",
    }]
    r = await admin_client.post("/api/quizzes", json=payload)
    assert r.status_code == 400


async def test_student_sees_quiz_without_answers(
    admin_client, student_client, sample_course, student_user, db,
):
    create = await admin_client.post("/api/quizzes", json={
        **QUIZ_PAYLOAD, "courseId": sample_course["_id"],
    })
    qid = create.json()["_id"]
    await _enroll_student(db, student_user["_id"], sample_course["_id"])

    r = await student_client.get(f"/api/quizzes/{qid}")
    assert r.status_code == 200
    for q in r.json()["questions"]:
        assert "correctAnswers" not in q
        assert "expectedText" not in q


async def test_quiz_auto_grading(
    admin_client, student_client, sample_course, student_user, db,
):
    create = await admin_client.post("/api/quizzes", json={
        **QUIZ_PAYLOAD, "courseId": sample_course["_id"],
    })
    qid = create.json()["_id"]
    await _enroll_student(db, student_user["_id"], sample_course["_id"])

    # Start
    start = await student_client.post(f"/api/quizzes/{qid}/start")
    assert start.status_code == 201

    # Submit perfect answers
    submit = await student_client.post(f"/api/quizzes/{qid}/submit", json={
        "answers": [
            {"questionId": "q1", "selected": [1], "text": ""},
            {"questionId": "q2", "selected": [0], "text": ""},
            {"questionId": "q3", "selected": [], "text": "def"},
        ],
    })
    assert submit.status_code == 200
    body = submit.json()
    assert body["autoScore"] == 3
    assert body["percent"] == 100.0
    assert body["passed"] is True
    assert body["status"] == "graded"


async def test_max_attempts_enforced(
    admin_client, student_client, sample_course, student_user, db,
):
    payload = {**QUIZ_PAYLOAD, "courseId": sample_course["_id"], "maxAttempts": 1}
    create = await admin_client.post("/api/quizzes", json=payload)
    qid = create.json()["_id"]
    await _enroll_student(db, student_user["_id"], sample_course["_id"])

    # Attempt 1
    await student_client.post(f"/api/quizzes/{qid}/start")
    await student_client.post(f"/api/quizzes/{qid}/submit", json={
        "answers": [
            {"questionId": "q1", "selected": [1]},
            {"questionId": "q2", "selected": [0]},
            {"questionId": "q3", "text": "def"},
        ],
    })

    # Attempt 2 should fail
    r = await student_client.post(f"/api/quizzes/{qid}/start")
    assert r.status_code == 400
    assert "Max attempts" in r.json()["error"]


async def test_essay_pending_manual(
    admin_client, student_client, sample_course, student_user, db,
):
    payload = {**QUIZ_PAYLOAD, "courseId": sample_course["_id"]}
    payload["questions"] = [
        {
            "id": "e1", "type": "essay", "prompt": "Explain closures",
            "options": [], "correctAnswers": [], "expectedText": "",
            "points": 10, "explanation": "",
        }
    ]
    create = await admin_client.post("/api/quizzes", json=payload)
    qid = create.json()["_id"]
    await _enroll_student(db, student_user["_id"], sample_course["_id"])

    await student_client.post(f"/api/quizzes/{qid}/start")
    submit = await student_client.post(f"/api/quizzes/{qid}/submit", json={
        "answers": [{"questionId": "e1", "selected": [], "text": "A closure captures..."}],
    })
    assert submit.status_code == 200
    assert submit.json()["status"] == "pending_manual"
    assert submit.json()["percent"] is None

    # Staff grades it
    attempt_id = submit.json()["_id"]
    grade = await admin_client.patch(
        f"/api/quizzes/attempts/{attempt_id}/grade",
        json={"manualScore": 8, "feedback": "Good"},
    )
    assert grade.status_code == 200
    assert grade.json()["status"] == "graded"
    assert grade.json()["percent"] == 80.0
    assert grade.json()["passed"] is True
