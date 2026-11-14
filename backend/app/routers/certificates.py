import secrets
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.user import UserInDB
from app.services.logger import log_action
from app.services.notifier import notify_user

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _make_certificate_id() -> str:
    year = datetime.now(timezone.utc).year
    return f"CERT-{year}-{secrets.token_hex(4).upper()}"


async def _notify_certificate(student_id: str, course_id: str, cert_id: str) -> None:
    try:
        course = await get_database().courses.find_one({"_id": ObjectId(course_id)})
        course_title = course.get("title", "your course") if course else "your course"
        await notify_user(
            user_id=student_id,
            kind="certificate",
            title="Certificate issued",
            body=f"Your certificate for {course_title} is ready ({cert_id}).",
            link="/student/certificates",
        )
    except Exception:
        pass


async def _is_course_complete(student_id: str, course_id: str) -> bool:
    db = get_database()
    uid = ObjectId(student_id)
    cid = ObjectId(course_id)
    total_sessions = await db.sessions.count_documents({"courseId": cid})
    if total_sessions == 0:
        return False
    passed = await db.progresses.count_documents({
        "studentId": uid, "courseId": cid, "status": "passed",
    })
    return passed >= total_sessions


async def _issue(student_id: str, course_id: str, issued_by: Optional[str] = None) -> dict:
    db = get_database()
    uid = ObjectId(student_id)
    cid = ObjectId(course_id)
    existing = await db.certificates.find_one({"studentId": uid, "courseId": cid})
    if existing:
        return existing

    cert_id = _make_certificate_id()
    now = _utcnow()
    doc = {
        "studentId": uid,
        "courseId": cid,
        "certificateId": cert_id,
        "issuedAt": now,
        "emailSent": False,
    }
    result = await db.certificates.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=issued_by, action="certificate_issued",
        target=cert_id, meta={"studentId": student_id, "courseId": course_id},
    )
    return doc


# ── Claim own certificate (student, after course completion) ────
@router.post("/claim/{course_id}")
async def claim_certificate(
    course_id: str,
    auth: UserInDB = Depends(require_role("student")),
):
    if not await _is_course_complete(auth.id, course_id):
        raise HTTPException(
            status_code=400,
            detail="Course not yet complete — pass every session first",
        )
    cert = await _issue(auth.id, course_id, issued_by=auth.id)
    await _notify_certificate(auth.id, course_id, cert["certificateId"])
    return {
        "certificateId": cert["certificateId"],
        "issuedAt": cert.get("issuedAt"),
    }


# ── Manual issue (admin) ───────────────────────────────────────
@router.post("/admin/issue")
async def admin_issue(
    studentId: str,
    courseId: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    if not await db.users.find_one({"_id": _oid(studentId)}):
        raise HTTPException(status_code=404, detail="Student not found")
    if not await db.courses.find_one({"_id": _oid(courseId)}):
        raise HTTPException(status_code=404, detail="Course not found")

    cert = await _issue(studentId, courseId, issued_by=auth.id)
    await _notify_certificate(studentId, courseId, cert["certificateId"])
    return {
        "certificateId": cert["certificateId"],
        "issuedAt": cert.get("issuedAt"),
    }


# ── List my certificates (student) ─────────────────────────────
@router.get("/my")
async def my_certificates(auth: UserInDB = Depends(require_role("student"))):
    db = get_database()
    cursor = db.certificates.find({"studentId": ObjectId(auth.id)}).sort("issuedAt", -1)
    out = []
    async for c in cursor:
        course = await db.courses.find_one({"_id": c["courseId"]})
        out.append({
            "certificateId": c["certificateId"],
            "courseTitle": course.get("title", "") if course else "",
            "issuedAt": c.get("issuedAt"),
        })
    return out
