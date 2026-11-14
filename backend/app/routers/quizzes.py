from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.quiz import (
    AnswerInDB,
    AttemptGrade,
    AttemptInDB,
    AttemptSubmit,
    QuizCreate,
    QuizInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action
from app.services.gamification import award_badge, award_points

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


async def _staff_can_manage(user: UserInDB, course_id: str) -> bool:
    if user.role == "admin":
        return True
    a = await get_database().staffassignments.find_one({
        "staffId": ObjectId(user.id),
        "courseId": ObjectId(course_id),
    })
    return bool(a)


async def _student_enrolled(user: UserInDB, course_id: str) -> bool:
    e = await get_database().enrollments.find_one({
        "studentId": ObjectId(user.id),
        "courseId": ObjectId(course_id),
        "paymentStatus": "paid",
    })
    return bool(e)


# ── CREATE quiz ─────────────────────────────────────────────────
@router.post("", response_model=QuizInDB, status_code=201)
async def quiz_create(
    payload: QuizCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    if not await _staff_can_manage(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="Not assigned to that course")

    # Validate question shapes
    for q in payload.questions:
        if q.type in ("mcq", "multi", "truefalse"):
            if not q.options:
                raise HTTPException(status_code=400, detail=f"Question {q.id} needs options")
            if not q.correctAnswers:
                raise HTTPException(status_code=400, detail=f"Question {q.id} needs correctAnswers")
            if any(i < 0 or i >= len(q.options) for i in q.correctAnswers):
                raise HTTPException(status_code=400, detail=f"Question {q.id} correctAnswers out of range")
            if q.type == "mcq" and len(q.correctAnswers) != 1:
                raise HTTPException(status_code=400, detail=f"Question {q.id} is MCQ but has multiple correct")

    now = _utcnow()
    doc = {
        "courseId": _oid(payload.courseId),
        "sessionId": _oid(payload.sessionId) if payload.sessionId else None,
        "title": payload.title,
        "description": payload.description,
        "questions": [q.model_dump() for q in payload.questions],
        "timerSeconds": payload.timerSeconds,
        "passMark": payload.passMark,
        "maxAttempts": payload.maxAttempts,
        "published": payload.published,
        "createdBy": ObjectId(auth.id),
        "createdByName": auth.fullName,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().quizzes.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="quiz_create",
        target=str(result.inserted_id), meta={"title": payload.title},
    )
    return QuizInDB(**doc)


# ── LIST quizzes ────────────────────────────────────────────────
@router.get("", response_model=list[QuizInDB])
async def quiz_list(
    courseId: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=100),
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    filt: dict = {}
    if courseId:
        filt["courseId"] = _oid(courseId)

    # Students only see published quizzes in enrolled courses
    if auth.role == "student":
        if courseId and not await _student_enrolled(auth, courseId):
            raise HTTPException(status_code=403, detail="Not enrolled")
        enrolled = await db.enrollments.distinct(
            "courseId", {"studentId": ObjectId(auth.id), "paymentStatus": "paid"},
        )
        filt["courseId"] = {"$in": enrolled}
        filt["published"] = True
    elif auth.role == "staff":
        if not courseId:
            assigned = await db.staffassignments.distinct(
                "courseId", {"staffId": ObjectId(auth.id)},
            )
            filt["courseId"] = {"$in": assigned}

    cursor = db.quizzes.find(filt).sort("createdAt", -1).limit(limit)
    out = []
    async for q in cursor:
        out.append(QuizInDB(**q))
    return out


# ── GET quiz (student sees questions WITHOUT answers) ──────────
@router.get("/{quiz_id}")
async def quiz_get(
    quiz_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    q = await db.quizzes.find_one({"_id": _oid(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if auth.role == "student":
        if not q.get("published"):
            raise HTTPException(status_code=404, detail="Not found")
        if not await _student_enrolled(auth, str(q["courseId"])):
            raise HTTPException(status_code=403, detail="Not enrolled")

    full = QuizInDB(**q)
    if auth.role == "student":
        # Strip answers
        stripped_questions = []
        for qd in full.questions:
            stripped_questions.append({
                "id": qd.id,
                "type": qd.type,
                "prompt": qd.prompt,
                "options": qd.options,
                "points": qd.points,
            })
        data = full.model_dump()
        data["questions"] = stripped_questions
        return data
    return full


# ── START attempt (student) ────────────────────────────────────
@router.post("/{quiz_id}/start", response_model=AttemptInDB, status_code=201)
async def quiz_start(
    quiz_id: str,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    q = await db.quizzes.find_one({"_id": _oid(quiz_id), "published": True})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz not available")
    if not await _student_enrolled(auth, str(q["courseId"])):
        raise HTTPException(status_code=403, detail="Not enrolled")

    # Count prior attempts
    prior = await db.quiz_attempts.count_documents({
        "quizId": q["_id"], "studentId": ObjectId(auth.id),
    })
    if prior >= q["maxAttempts"]:
        raise HTTPException(
            status_code=400,
            detail=f"Max attempts ({q['maxAttempts']}) reached",
        )

    # If there's an in-progress attempt, resume it
    existing = await db.quiz_attempts.find_one({
        "quizId": q["_id"], "studentId": ObjectId(auth.id),
        "status": "in_progress",
    })
    if existing:
        return AttemptInDB(**existing)

    now = _utcnow()
    max_score = sum(qd["points"] for qd in q["questions"])
    doc = {
        "quizId": q["_id"],
        "courseId": q["courseId"],
        "studentId": ObjectId(auth.id),
        "studentName": auth.fullName,
        "attemptNumber": prior + 1,
        "answers": [],
        "autoScore": 0,
        "manualScore": None,
        "maxScore": max_score,
        "percent": None,
        "passed": None,
        "status": "in_progress",
        "startedAt": now,
        "submittedAt": None,
        "gradedBy": None,
        "gradedAt": None,
    }
    result = await db.quiz_attempts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return AttemptInDB(**doc)


# ── SUBMIT attempt (student) ───────────────────────────────────
@router.post("/{quiz_id}/submit", response_model=AttemptInDB)
async def quiz_submit(
    quiz_id: str,
    payload: AttemptSubmit,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    q = await db.quizzes.find_one({"_id": _oid(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Not found")

    attempt = await db.quiz_attempts.find_one({
        "quizId": q["_id"], "studentId": ObjectId(auth.id),
        "status": "in_progress",
    })
    if not attempt:
        raise HTTPException(status_code=400, detail="No in-progress attempt")

    now = _utcnow()

    # Server-enforced timer
    if q["timerSeconds"] > 0:
        started = attempt["startedAt"]
        if isinstance(started, str):
            started = datetime.fromisoformat(started.replace("Z", "+00:00"))
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = (now - started).total_seconds()
        if elapsed > q["timerSeconds"]:
            # Force-timeout: mark as graded with 0
            await db.quiz_attempts.update_one(
                {"_id": attempt["_id"]},
                {"$set": {
                    "answers": [a.model_dump() for a in payload.answers],
                    "autoScore": 0, "percent": 0.0, "passed": False,
                    "status": "graded", "submittedAt": now,
                }},
            )
            fresh = await db.quiz_attempts.find_one({"_id": attempt["_id"]})
            return AttemptInDB(**fresh)

    # Grade auto-answerable questions
    answers_by_id = {a.questionId: a for a in payload.answers}
    auto_score = 0
    has_manual = False

    for qd in q["questions"]:
        ans = answers_by_id.get(qd["id"])
        if qd["type"] in ("mcq", "multi", "truefalse"):
            if ans and set(ans.selected) == set(qd["correctAnswers"]):
                auto_score += qd["points"]
        elif qd["type"] == "short":
            if ans and ans.text.strip().lower() == qd["expectedText"].strip().lower():
                auto_score += qd["points"]
        elif qd["type"] == "essay":
            has_manual = True  # requires staff grading

    max_score = sum(qd["points"] for qd in q["questions"])
    percent = round((auto_score / max_score) * 100, 1) if max_score else 0
    passed = percent >= q["passMark"] and not has_manual

    status = "pending_manual" if has_manual else "graded"

    updated = await db.quiz_attempts.find_one_and_update(
        {"_id": attempt["_id"]},
        {"$set": {
            "answers": [a.model_dump() for a in payload.answers],
            "autoScore": auto_score,
            "percent": None if has_manual else percent,
            "passed": None if has_manual else passed,
            "status": status,
            "submittedAt": now,
        }},
        return_document=True,
    )

    # ── Gamification awards (idempotent — safe on retry) ──
    if passed:
        entity = str(attempt["_id"])
        await award_points(auth.id, "quiz_pass", entity)
        await award_badge(auth.id, "first_quiz_pass")
        if percent == 100.0:
            await award_points(auth.id, "quiz_perfect_bonus", entity)
            await award_badge(auth.id, "perfect_score")
    return AttemptInDB(**updated)


# ── LIST attempts (staff grading view) ─────────────────────────
@router.get("/{quiz_id}/attempts", response_model=list[AttemptInDB])
async def quiz_attempts(
    quiz_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    q = await db.quizzes.find_one({"_id": _oid(quiz_id)})
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(q["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor = db.quiz_attempts.find({"quizId": q["_id"]}).sort("submittedAt", -1)
    out = []
    async for a in cursor:
        out.append(AttemptInDB(**a))
    return out


# ── MY attempts (student history) ──────────────────────────────
@router.get("/my-attempts")
async def my_attempts(
    courseId: Optional[str] = Query(default=None),
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    filt: dict = {"studentId": ObjectId(auth.id)}
    if courseId:
        filt["courseId"] = _oid(courseId)
    cursor = db.quiz_attempts.find(filt).sort("startedAt", -1).limit(100)

    out = []
    async for a in cursor:
        quiz = await db.quizzes.find_one({"_id": a["quizId"]})
        out.append({
            "attemptId": str(a["_id"]),
            "quizTitle": quiz.get("title", "") if quiz else "",
            "attemptNumber": a.get("attemptNumber", 1),
            "autoScore": a.get("autoScore", 0),
            "manualScore": a.get("manualScore"),
            "maxScore": a.get("maxScore", 0),
            "percent": a.get("percent"),
            "passed": a.get("passed"),
            "status": a.get("status", ""),
            "submittedAt": a.get("submittedAt"),
        })
    return out


# ── GRADE (staff manual grading for essays) ────────────────────
@router.patch("/attempts/{attempt_id}/grade", response_model=AttemptInDB)
async def attempt_grade(
    attempt_id: str,
    payload: AttemptGrade,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    attempt = await db.quiz_attempts.find_one({"_id": _oid(attempt_id)})
    if not attempt:
        raise HTTPException(status_code=404, detail="Not found")

    q = await db.quizzes.find_one({"_id": attempt["quizId"]})
    if not q:
        raise HTTPException(status_code=404, detail="Quiz gone")
    if not await _staff_can_manage(auth, str(q["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    if payload.manualScore > attempt["maxScore"]:
        raise HTTPException(status_code=400, detail=f"manualScore exceeds max {attempt['maxScore']}")

    # Manual score is additive to autoScore for essay/short (staff enters total essay points)
    # Combined = autoScore + manualScore (capped at maxScore)
    total = min(attempt["autoScore"] + payload.manualScore, attempt["maxScore"])
    percent = round((total / attempt["maxScore"]) * 100, 1) if attempt["maxScore"] else 0
    passed = percent >= q["passMark"]

    updated = await db.quiz_attempts.find_one_and_update(
        {"_id": attempt["_id"]},
        {"$set": {
            "manualScore": payload.manualScore,
            "percent": percent,
            "passed": passed,
            "status": "graded",
            "gradedBy": ObjectId(auth.id),
            "gradedAt": _utcnow(),
        }},
        return_document=True,
    )
    await log_action(
        actorId=auth.id, action="quiz_attempt_grade", target=attempt_id,
    )
    return AttemptInDB(**updated)
