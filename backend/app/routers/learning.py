from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.progress import ProgressInDB
from app.models.session import SessionCreate, SessionInDB
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["learning"])


# ── Request models ────────────────────────────────────────────────
class SessionProgressRequest(BaseModel):
    sessionId: str


class QuizSubmitRequest(BaseModel):
    sessionId: str
    selectedIndex: int = Field(..., ge=0)


class SubmissionReviewRequest(BaseModel):
    progressId: str
    approve: bool
    note: str = ""


# ── Helpers ───────────────────────────────────────────────────────
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


async def _staff_must_be_assigned(auth: UserInDB, course_id: str) -> None:
    if auth.role == "admin":
        return
    assigned = await get_database().staffassignments.find_one(
        {"staffId": ObjectId(auth.id), "courseId": ObjectId(course_id)}
    )
    if not assigned:
        raise HTTPException(status_code=403, detail="Not assigned to this course")


# ── session-create ────────────────────────────────────────────────
@router.post("/session-create", response_model=SessionInDB, status_code=201)
async def session_create(
    payload: SessionCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    await _staff_must_be_assigned(auth, payload.courseId)
    now = _utcnow()
    doc = {
        "courseId": ObjectId(payload.courseId),
        "moduleId": payload.moduleId,  # optional, backwards compatible
        "orderIndex": payload.orderIndex,
        "title": payload.title,
        "notes": payload.notes,
        "materialUrls": payload.materialUrls,
        "quiz": payload.quiz.model_dump() if payload.quiz else None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id,
        action="session_create",
        target=str(result.inserted_id),
    )
    return SessionInDB(**doc)


# ── session-list ──────────────────────────────────────────────────
@router.get("/session-list", response_model=list[SessionInDB])
async def session_list(courseId: str):
    oid = _to_oid(courseId)
    cursor = get_database().sessions.find({"courseId": oid}).sort("orderIndex", 1)
    out = []
    async for doc in cursor:
        out.append(SessionInDB(**doc))
    return out


# ── session-update ────────────────────────────────────────────────
@router.patch("/session-update", response_model=SessionInDB)
async def session_update(
    payload: dict,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    session_id = payload.pop("sessionId", None)
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId required")
    oid = _to_oid(session_id)
    session = await get_database().sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Not found")
    await _staff_must_be_assigned(auth, str(session["courseId"]))

    # SECURITY: whitelist. Session update cannot change courseId, _id,
    # createdAt, or any field outside this set.
    ALLOWED = {"title", "notes", "materialUrls", "quiz", "orderIndex", "moduleId"}
    unknown = set(payload.keys()) - ALLOWED
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Fields not allowed for update: {sorted(unknown)}",
        )
    updates = {**{k: payload[k] for k in payload if k in ALLOWED}, "updatedAt": _utcnow()}
    updated = await get_database().sessions.find_one_and_update(
        {"_id": oid}, {"$set": updates}, return_document=True
    )
    return SessionInDB(**updated)


# ── session-progress ──────────────────────────────────────────────
@router.post("/session-progress", response_model=ProgressInDB)
async def session_progress(
    payload: SessionProgressRequest,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    session = await db.sessions.find_one({"_id": _to_oid(payload.sessionId)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    enrollment = await db.enrollments.find_one(
        {
            "studentId": ObjectId(auth.id),
            "courseId": session["courseId"],
            "paymentStatus": "paid",
        }
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="Course not paid")

    prior = await db.progresses.find_one(
        {"studentId": ObjectId(auth.id), "sessionId": session["_id"]}
    )
    if prior and prior.get("status") in ("passed", "awaiting_review"):
        return ProgressInDB(**prior)

    now = _utcnow()
    updated = await db.progresses.find_one_and_update(
        {"studentId": ObjectId(auth.id), "sessionId": session["_id"]},
        {
            "$set": {
                "courseId": session["courseId"],
                "sessionId": session["_id"],
                "status": "in_progress",
                "updatedAt": now,
            },
            "$setOnInsert": {
                "studentId": ObjectId(auth.id),
                "createdAt": now,
            },
        },
        upsert=True,
        return_document=True,
    )
    return ProgressInDB(**updated)


# ── quiz-submit ───────────────────────────────────────────────────
@router.post("/quiz-submit")
async def quiz_submit(
    payload: QuizSubmitRequest,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    session = await db.sessions.find_one({"_id": _to_oid(payload.sessionId)})
    if not session or not session.get("quiz"):
        raise HTTPException(status_code=400, detail="No quiz for session")

    progress = await db.progresses.find_one(
        {"studentId": ObjectId(auth.id), "sessionId": session["_id"]}
    )
    if not progress:
        raise HTTPException(status_code=400, detail="Start session first")

    if progress.get("status") == "passed":
        return {
            "score": progress.get("score"),
            "passed": True,
            "progress": ProgressInDB(**progress),
        }

    quiz = session["quiz"]
    now = _utcnow()

    # First submit starts the timer (legacy: quizStartedAt=null → set now)
    if not progress.get("quizStartedAt"):
        await db.progresses.update_one(
            {"_id": progress["_id"]},
            {"$set": {"quizStartedAt": now, "updatedAt": now}},
        )
        progress["quizStartedAt"] = now

    elapsed = (now - progress["quizStartedAt"]).total_seconds()
    if elapsed > quiz["timerSeconds"]:
        await db.progresses.update_one(
            {"_id": progress["_id"]},
            {
                "$set": {
                    "status": "failed",
                    "score": 0,
                    "quizStartedAt": None,
                    "updatedAt": now,
                }
            },
        )
        fresh = await db.progresses.find_one({"_id": progress["_id"]})
        return {
            "failed": True,
            "reason": "timeout",
            "progress": ProgressInDB(**fresh),
        }

    correct = payload.selectedIndex == quiz["correctIndex"]
    score = 100 if correct else 0
    new_status = "passed" if score >= quiz["passMark"] else "failed"

    await db.progresses.update_one(
        {"_id": progress["_id"]},
        {
            "$set": {
                "score": score,
                "status": new_status,
                "submittedAt": now,
                "quizStartedAt": None,
                "updatedAt": now,
            }
        },
    )

    # Bump enrollment progression on pass (legacy: max(current, orderIndex+1))
    if new_status == "passed":
        enrollment = await db.enrollments.find_one(
            {"studentId": ObjectId(auth.id), "courseId": session["courseId"]}
        )
        if enrollment:
            new_order = max(
                enrollment.get("currentSessionOrder", 1),
                session["orderIndex"] + 1,
            )
            await db.enrollments.update_one(
                {"_id": enrollment["_id"]},
                {"$set": {"currentSessionOrder": new_order, "updatedAt": now}},
            )

    fresh = await db.progresses.find_one({"_id": progress["_id"]})
    return {
        "score": score,
        "passed": new_status == "passed",
        "progress": ProgressInDB(**fresh),
    }


# ── submission-review ─────────────────────────────────────────────
@router.post("/submission-review", response_model=ProgressInDB)
async def submission_review(
    payload: SubmissionReviewRequest,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    progress = await db.progresses.find_one(
        {"_id": _to_oid(payload.progressId)}
    )
    if not progress:
        raise HTTPException(status_code=404, detail="Not found")

    session = await db.sessions.find_one({"_id": progress["sessionId"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await _staff_must_be_assigned(auth, str(session["courseId"]))

    now = _utcnow()
    new_status = "passed" if payload.approve else "failed"
    updated = await db.progresses.find_one_and_update(
        {"_id": progress["_id"]},
        {
            "$set": {
                "status": new_status,
                "reviewedBy": ObjectId(auth.id),
                "reviewNote": payload.note,
                "updatedAt": now,
            }
        },
        return_document=True,
    )

    if payload.approve:
        enrollment = await db.enrollments.find_one(
            {
                "studentId": progress["studentId"],
                "courseId": session["courseId"],
            }
        )
        if enrollment:
            new_order = max(
                enrollment.get("currentSessionOrder", 1),
                session["orderIndex"] + 1,
            )
            await db.enrollments.update_one(
                {"_id": enrollment["_id"]},
                {"$set": {"currentSessionOrder": new_order, "updatedAt": now}},
            )

    return ProgressInDB(**updated)
