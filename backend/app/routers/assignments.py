from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.assignment import (
    AssignmentCreate,
    AssignmentInDB,
    SubmissionCreate,
    SubmissionGrade,
    SubmissionInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action
from app.services.notifier import notify_course_students, notify_user

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


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


# ── CREATE assignment (staff/admin) ──────────────────────────────
@router.post("", response_model=AssignmentInDB, status_code=201)
async def assignment_create(
    payload: AssignmentCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    if not await _staff_can_manage(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="Not assigned to that course")

    now = _utcnow()
    doc = {
        "courseId": _oid(payload.courseId),
        "sessionId": _oid(payload.sessionId) if payload.sessionId else None,
        "title": payload.title,
        "instructions": payload.instructions,
        "dueAt": payload.dueAt,
        "maxScore": payload.maxScore,
        "attachments": payload.attachments,
        "createdBy": ObjectId(auth.id),
        "createdByName": auth.fullName,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="assignment_create",
        target=str(result.inserted_id), meta={"courseId": payload.courseId},
    )

    due = ""
    if payload.dueAt:
        due = f" — due {payload.dueAt.strftime('%Y-%m-%d')}"
    await notify_course_students(
        course_id=payload.courseId,
        kind="assignment",
        title=f"New assignment: {payload.title}",
        body=f"{auth.fullName} posted a new assignment{due}.",
        link=f"/assignments/{result.inserted_id}",
    )
    return AssignmentInDB(**doc)


# ── LIST assignments (role-filtered) ─────────────────────────────
@router.get("", response_model=list[AssignmentInDB])
async def assignment_list(
    courseId: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=100),
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    filt: dict = {}
    if courseId:
        filt["courseId"] = _oid(courseId)
        if auth.role == "student" and not await _student_enrolled(auth, courseId):
            raise HTTPException(status_code=403, detail="Not enrolled")
    elif auth.role == "student":
        # show only from enrolled courses
        enrolled = await db.enrollments.distinct(
            "courseId", {"studentId": ObjectId(auth.id), "paymentStatus": "paid"},
        )
        filt["courseId"] = {"$in": enrolled}
    elif auth.role == "staff":
        # show only from assigned courses
        assigned = await db.staffassignments.distinct(
            "courseId", {"staffId": ObjectId(auth.id)},
        )
        filt["courseId"] = {"$in": assigned}

    cursor = db.assignments.find(filt).sort("createdAt", -1).limit(limit)
    out = []
    async for a in cursor:
        out.append(AssignmentInDB(**a))
    return out


# ── GET assignment + my submission (student) ────────────────────
@router.get("/{assignment_id}")
async def assignment_detail(
    assignment_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    a = await db.assignments.find_one({"_id": _oid(assignment_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")

    course_str = str(a["courseId"])
    if auth.role == "student" and not await _student_enrolled(auth, course_str):
        raise HTTPException(status_code=403, detail="Not enrolled")
    if auth.role == "staff" and not await _staff_can_manage(auth, course_str):
        raise HTTPException(status_code=403, detail="Not assigned")

    my_submission = None
    if auth.role == "student":
        s = await db.submissions.find_one({
            "assignmentId": a["_id"], "studentId": ObjectId(auth.id),
        })
        if s:
            my_submission = SubmissionInDB(**s).model_dump()

    return {"assignment": AssignmentInDB(**a), "mySubmission": my_submission}


# ── DELETE assignment ──────────────────────────────────────────
@router.delete("/{assignment_id}")
async def assignment_delete(
    assignment_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    a = await db.assignments.find_one({"_id": _oid(assignment_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(a["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.assignments.delete_one({"_id": a["_id"]})
    await db.submissions.delete_many({"assignmentId": a["_id"]})
    await log_action(actorId=auth.id, action="assignment_delete", target=assignment_id)
    return {"ok": True}


# ── SUBMIT (student) ────────────────────────────────────────────
@router.post("/{assignment_id}/submit", response_model=SubmissionInDB, status_code=201)
async def assignment_submit(
    assignment_id: str,
    payload: SubmissionCreate,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    a = await db.assignments.find_one({"_id": _oid(assignment_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _student_enrolled(auth, str(a["courseId"])):
        raise HTTPException(status_code=403, detail="Not enrolled")

    existing = await db.submissions.find_one({
        "assignmentId": a["_id"], "studentId": ObjectId(auth.id),
    })
    now = _utcnow()
    if existing:
        await db.submissions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "fileUrl": payload.fileUrl,
                "note": payload.note,
                "submittedAt": now,
                "score": None,
                "feedback": "",
                "gradedBy": None,
                "gradedAt": None,
            }},
        )
        updated = await db.submissions.find_one({"_id": existing["_id"]})
        return SubmissionInDB(**updated)

    doc = {
        "assignmentId": a["_id"],
        "studentId": ObjectId(auth.id),
        "studentName": auth.fullName,
        "fileUrl": payload.fileUrl,
        "note": payload.note,
        "submittedAt": now,
        "score": None,
        "feedback": "",
        "gradedBy": None,
        "gradedAt": None,
    }
    result = await db.submissions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return SubmissionInDB(**doc)


# ── LIST submissions (staff grading view) ──────────────────────
@router.get("/{assignment_id}/submissions", response_model=list[SubmissionInDB])
async def assignment_submissions(
    assignment_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    a = await db.assignments.find_one({"_id": _oid(assignment_id)})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(a["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor = db.submissions.find({"assignmentId": a["_id"]}).sort("submittedAt", 1)
    out = []
    async for s in cursor:
        out.append(SubmissionInDB(**s))
    return out


# ── GRADE submission (staff) ───────────────────────────────────
@router.patch("/submissions/{submission_id}/grade", response_model=SubmissionInDB)
async def submission_grade(
    submission_id: str,
    payload: SubmissionGrade,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    s = await db.submissions.find_one({"_id": _oid(submission_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    a = await db.assignments.find_one({"_id": s["assignmentId"]})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment gone")

    if not await _staff_can_manage(auth, str(a["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")
    if payload.score > a["maxScore"]:
        raise HTTPException(status_code=400, detail=f"Score exceeds max {a['maxScore']}")

    updated = await db.submissions.find_one_and_update(
        {"_id": s["_id"]},
        {"$set": {
            "score": payload.score,
            "feedback": payload.feedback,
            "gradedBy": ObjectId(auth.id),
            "gradedAt": _utcnow(),
        }},
        return_document=True,
    )

    await notify_user(
        user_id=str(s["studentId"]),
        kind="grade",
        title=f"Your submission was graded: {a['title']}",
        body=(
            f"Score: {payload.score}/{a['maxScore']}."
            + (f" Feedback: {payload.feedback[:100]}" if payload.feedback else "")
        ),
        link=f"/assignments/{a['_id']}",
    )
    return SubmissionInDB(**updated)
