from datetime import datetime, date, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.attendance import (
    AttendanceMarkRequest,
    AttendanceRecordInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


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


# ── MARK (batch) ─────────────────────────────────────────────
@router.post("/mark")
async def mark_attendance(
    payload: AttendanceMarkRequest,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    slot = await db.timetable_slots.find_one({"_id": _oid(payload.slotId)})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if not await _staff_can_manage(auth, str(slot["courseId"])):
        raise HTTPException(status_code=403, detail="Not assigned to that course")

    # Date validation — cannot mark future, cannot be more than 90 days past
    try:
        mark_date = date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    today = datetime.now(timezone.utc).date()
    if mark_date > today:
        raise HTTPException(status_code=400, detail="Cannot mark future attendance")
    if (today - mark_date).days > 90:
        raise HTTPException(status_code=400, detail="Cannot mark attendance more than 90 days in the past")

    # Validate all students are enrolled in this course (fail whole batch if not)
    student_ids = [_oid(r.studentId) for r in payload.records]
    enrolled = await db.enrollments.distinct(
        "studentId",
        {
            "courseId": slot["courseId"],
            "paymentStatus": "paid",
            "studentId": {"$in": student_ids},
        },
    )
    enrolled_set = set(str(s) for s in enrolled)
    missing = [r.studentId for r in payload.records if r.studentId not in enrolled_set]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Students not enrolled in course: {missing}",
        )

    # Build all records, upsert atomically-ish
    now = _utcnow()
    written = 0
    errors = []
    for rec in payload.records:
        student = await db.users.find_one({"_id": _oid(rec.studentId)})
        if not student:
            errors.append(rec.studentId)
            continue
        try:
            await db.attendance.update_one(
                {
                    "slotId": slot["_id"],
                    "date": payload.date,
                    "studentId": _oid(rec.studentId),
                },
                {
                    "$set": {
                        "status": rec.status,
                        "note": rec.note,
                        "markedBy": ObjectId(auth.id),
                        "markedByName": auth.fullName,
                        "markedAt": now,
                    },
                    "$setOnInsert": {
                        "slotId": slot["_id"],
                        "courseId": slot["courseId"],
                        "date": payload.date,
                        "studentId": _oid(rec.studentId),
                        "studentName": student.get("fullName", ""),
                    },
                },
                upsert=True,
            )
            written += 1
        except Exception as e:
            errors.append(f"{rec.studentId}: {e}")

    await log_action(
        actorId=auth.id, action="attendance_mark",
        target=str(slot["_id"]),
        meta={"date": payload.date, "count": written},
    )

    return {
        "ok": True,
        "date": payload.date,
        "slotId": str(slot["_id"]),
        "written": written,
        "errors": errors,
    }


# ── SLOT: all attendance for a slot ────────────────────────
@router.get("/slot/{slot_id}", response_model=list[AttendanceRecordInDB])
async def slot_attendance(
    slot_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    slot = await db.timetable_slots.find_one({"_id": _oid(slot_id)})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if not await _staff_can_manage(auth, str(slot["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor = db.attendance.find({"slotId": slot["_id"]}).sort([("date", -1), ("studentName", 1)])
    out = []
    async for a in cursor:
        out.append(AttendanceRecordInDB(**a))
    return out


# ── SLOT + DATE: attendance for a specific date ────────────
@router.get("/slot/{slot_id}/date/{date_str}", response_model=list[AttendanceRecordInDB])
async def slot_date_attendance(
    slot_id: str,
    date_str: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    slot = await db.timetable_slots.find_one({"_id": _oid(slot_id)})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if not await _staff_can_manage(auth, str(slot["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor = db.attendance.find({"slotId": slot["_id"], "date": date_str}).sort("studentName", 1)
    out = []
    async for a in cursor:
        out.append(AttendanceRecordInDB(**a))
    return out


# ── STUDENT: my attendance ─────────────────────────────────
@router.get("/my")
async def my_attendance(
    courseId: Optional[str] = Query(default=None),
    auth: UserInDB = Depends(require_role("student")),
):
    """Student's own attendance records, optionally filtered by course."""
    filt: dict = {"studentId": ObjectId(auth.id)}
    if courseId:
        filt["courseId"] = _oid(courseId)
    cursor = get_database().attendance.find(filt).sort([("date", -1)]).limit(500)
    out = []
    async for a in cursor:
        out.append(AttendanceRecordInDB(**a).model_dump(by_alias=True))
    return out


# ── STUDENT: summary per course (percentages) ──────────────
@router.get("/my-summary")
async def my_summary(auth: UserInDB = Depends(require_role("student"))):
    """Per-course attendance summary for the current student."""
    db = get_database()
    uid = ObjectId(auth.id)

    # Enrolled courses
    enrolled_cids = await db.enrollments.distinct(
        "courseId",
        {"studentId": uid, "paymentStatus": "paid"},
    )

    summaries = []
    for cid in enrolled_cids:
        course = await db.courses.find_one({"_id": cid})
        total = await db.attendance.count_documents({"studentId": uid, "courseId": cid})
        present = await db.attendance.count_documents({
            "studentId": uid, "courseId": cid, "status": "present",
        })
        late = await db.attendance.count_documents({
            "studentId": uid, "courseId": cid, "status": "late",
        })
        absent = await db.attendance.count_documents({
            "studentId": uid, "courseId": cid, "status": "absent",
        })
        excused = await db.attendance.count_documents({
            "studentId": uid, "courseId": cid, "status": "excused",
        })
        # Percent = (present + late) / (total - excused)  — excused doesn't count against
        denominator = total - excused
        percent = round(((present + late) / denominator) * 100, 1) if denominator > 0 else None
        summaries.append({
            "courseId": str(cid),
            "courseTitle": course.get("title", "") if course else "",
            "total": total,
            "present": present,
            "late": late,
            "absent": absent,
            "excused": excused,
            "percent": percent,
        })
    return summaries


# ── SUMMARY per course (staff/admin view) ──────────────────
@router.get("/summary/{course_id}")
async def course_summary(
    course_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    cid = _oid(course_id)
    if not await _staff_can_manage(auth, course_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    # All enrolled students + their attendance
    enrolled = await db.enrollments.find(
        {"courseId": cid, "paymentStatus": "paid"}, {"studentId": 1},
    ).to_list(length=500)
    student_ids = [e["studentId"] for e in enrolled]

    rows = []
    for sid in student_ids:
        student = await db.users.find_one({"_id": sid}, {"fullName": 1, "email": 1})
        if not student:
            continue
        total = await db.attendance.count_documents({"studentId": sid, "courseId": cid})
        present = await db.attendance.count_documents({
            "studentId": sid, "courseId": cid, "status": "present",
        })
        late = await db.attendance.count_documents({
            "studentId": sid, "courseId": cid, "status": "late",
        })
        absent = await db.attendance.count_documents({
            "studentId": sid, "courseId": cid, "status": "absent",
        })
        excused = await db.attendance.count_documents({
            "studentId": sid, "courseId": cid, "status": "excused",
        })
        denominator = total - excused
        percent = round(((present + late) / denominator) * 100, 1) if denominator > 0 else None
        rows.append({
            "studentId": str(sid),
            "fullName": student.get("fullName", ""),
            "email": student.get("email", ""),
            "total": total,
            "present": present,
            "late": late,
            "absent": absent,
            "excused": excused,
            "percent": percent,
        })

    rows.sort(key=lambda r: (r["percent"] if r["percent"] is not None else -1))
    return rows


# ── STUDENT detail (staff/admin) ───────────────────────────
@router.get("/student/{student_id}/course/{course_id}", response_model=list[AttendanceRecordInDB])
async def student_detail(
    student_id: str,
    course_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    if not await _staff_can_manage(auth, course_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    cursor = get_database().attendance.find({
        "studentId": _oid(student_id),
        "courseId": _oid(course_id),
    }).sort("date", -1)
    out = []
    async for a in cursor:
        out.append(AttendanceRecordInDB(**a))
    return out
