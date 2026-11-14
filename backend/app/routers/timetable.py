from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.timetable import (
    TimetableSlotCreate,
    TimetableSlotInDB,
    TimetableSlotUpdate,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _minutes(t: str) -> int:
    return int(t[:2]) * 60 + int(t[3:])


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


async def _check_conflicts(
    day: int, start: str, end: str, room: str,
    instructor_id: ObjectId, exclude_id: Optional[ObjectId] = None,
) -> None:
    """Reject if room or instructor already booked at overlapping time."""
    db = get_database()
    same_day = {"dayOfWeek": day, "isActive": True}
    if exclude_id:
        same_day["_id"] = {"$ne": exclude_id}

    # Conflict via room
    if room:
        cursor = db.timetable_slots.find({**same_day, "room": room})
        async for existing in cursor:
            if (
                _minutes(start) < _minutes(existing["endTime"])
                and _minutes(end) > _minutes(existing["startTime"])
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Room '{room}' already booked "
                        f"{existing['startTime']}-{existing['endTime']} on this day"
                    ),
                )

    # Conflict via instructor
    cursor = db.timetable_slots.find({**same_day, "instructorId": instructor_id})
    async for existing in cursor:
        if (
            _minutes(start) < _minutes(existing["endTime"])
            and _minutes(end) > _minutes(existing["startTime"])
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Instructor already teaching "
                    f"{existing['startTime']}-{existing['endTime']} on this day"
                ),
            )


# ── CREATE (staff/admin assigned to course) ─────────────────
@router.post("/slots", response_model=TimetableSlotInDB, status_code=201)
async def slot_create(
    payload: TimetableSlotCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    if not await _staff_can_manage(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="Not assigned to that course")

    course = await db.courses.find_one({"_id": _oid(payload.courseId)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Instructor defaults to course creator
    instr_oid = _oid(payload.instructorId) if payload.instructorId else course["createdBy"]
    instr = await db.users.find_one({"_id": instr_oid, "role": "staff"})
    if not instr:
        instr = await db.users.find_one({"_id": instr_oid})
    if not instr:
        raise HTTPException(status_code=404, detail="Instructor not found")

    await _check_conflicts(
        payload.dayOfWeek, payload.startTime, payload.endTime,
        payload.room, instr_oid,
    )

    now = _utcnow()
    doc = {
        "courseId": _oid(payload.courseId),
        "courseTitle": course.get("title", ""),
        "instructorId": instr_oid,
        "instructorName": instr.get("fullName", ""),
        "dayOfWeek": payload.dayOfWeek,
        "startTime": payload.startTime,
        "endTime": payload.endTime,
        "room": payload.room,
        "semesterId": _oid(payload.semesterId) if payload.semesterId else None,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.timetable_slots.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="timetable_slot_create",
        target=str(result.inserted_id), meta={"courseId": payload.courseId},
    )
    return TimetableSlotInDB(**doc)


# ── LIST (public — filtered) ────────────────────────────────
@router.get("/slots", response_model=list[TimetableSlotInDB])
async def slot_list(
    courseId: Optional[str] = Query(default=None),
    semesterId: Optional[str] = Query(default=None),
    dayOfWeek: Optional[int] = Query(default=None, ge=0, le=6),
    instructorId: Optional[str] = Query(default=None),
    includeInactive: bool = Query(default=False),
    limit: int = Query(default=200, le=500),
):
    filt: dict = {}
    if not includeInactive:
        filt["isActive"] = True
    if courseId:
        filt["courseId"] = _oid(courseId)
    if semesterId:
        filt["semesterId"] = _oid(semesterId)
    if dayOfWeek is not None:
        filt["dayOfWeek"] = dayOfWeek
    if instructorId:
        filt["instructorId"] = _oid(instructorId)

    cursor = (
        get_database().timetable_slots.find(filt)
        .sort([("dayOfWeek", 1), ("startTime", 1)])
        .limit(limit)
    )
    out = []
    async for s in cursor:
        out.append(TimetableSlotInDB(**s))
    return out


# ── GET one ─────────────────────────────────────────────────
@router.get("/slots/{slot_id}", response_model=TimetableSlotInDB)
async def slot_get(slot_id: str):
    s = await get_database().timetable_slots.find_one({"_id": _oid(slot_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return TimetableSlotInDB(**s)


# ── UPDATE ──────────────────────────────────────────────────
@router.patch("/slots/{slot_id}", response_model=TimetableSlotInDB)
async def slot_update(
    slot_id: str,
    payload: TimetableSlotUpdate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    s = await db.timetable_slots.find_one({"_id": _oid(slot_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(s["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)

    # Resolve instructor if changed
    if "instructorId" in updates:
        instr_oid = _oid(updates["instructorId"])
        instr = await db.users.find_one({"_id": instr_oid})
        if not instr:
            raise HTTPException(status_code=404, detail="Instructor not found")
        updates["instructorId"] = instr_oid
        updates["instructorName"] = instr.get("fullName", "")
    else:
        instr_oid = s["instructorId"]

    if "semesterId" in updates:
        updates["semesterId"] = _oid(updates["semesterId"])

    # Validate time range after partial update
    start = updates.get("startTime", s["startTime"])
    end = updates.get("endTime", s["endTime"])
    if _minutes(end) <= _minutes(start):
        raise HTTPException(status_code=400, detail="endTime must be after startTime")

    day = updates.get("dayOfWeek", s["dayOfWeek"])
    room = updates.get("room", s["room"])
    await _check_conflicts(day, start, end, room, instr_oid, exclude_id=s["_id"])

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updatedAt"] = _utcnow()

    updated = await db.timetable_slots.find_one_and_update(
        {"_id": s["_id"]}, {"$set": updates}, return_document=True,
    )
    await log_action(actorId=auth.id, action="timetable_slot_update", target=slot_id)
    return TimetableSlotInDB(**updated)


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/slots/{slot_id}")
async def slot_delete(
    slot_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    s = await db.timetable_slots.find_one({"_id": _oid(slot_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(s["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.timetable_slots.delete_one({"_id": s["_id"]})
    await log_action(actorId=auth.id, action="timetable_slot_delete", target=slot_id)
    return {"ok": True}


# ── STUDENT: my weekly schedule ─────────────────────────────
@router.get("/my-schedule", response_model=list[TimetableSlotInDB])
async def my_schedule(
    semesterId: Optional[str] = Query(default=None),
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    enrolled = await db.enrollments.distinct(
        "courseId",
        {"studentId": ObjectId(auth.id), "paymentStatus": "paid"},
    )
    if not enrolled:
        return []
    filt: dict = {"courseId": {"$in": enrolled}, "isActive": True}
    if semesterId:
        filt["semesterId"] = _oid(semesterId)
    cursor = (
        db.timetable_slots.find(filt)
        .sort([("dayOfWeek", 1), ("startTime", 1)])
    )
    out = []
    async for s in cursor:
        out.append(TimetableSlotInDB(**s))
    return out


# ── STAFF: my teaching schedule ─────────────────────────────
@router.get("/my-teaching", response_model=list[TimetableSlotInDB])
async def my_teaching(
    semesterId: Optional[str] = Query(default=None),
    auth: UserInDB = Depends(require_role("staff")),
):
    filt: dict = {"instructorId": ObjectId(auth.id), "isActive": True}
    if semesterId:
        filt["semesterId"] = _oid(semesterId)
    cursor = (
        get_database().timetable_slots.find(filt)
        .sort([("dayOfWeek", 1), ("startTime", 1)])
    )
    out = []
    async for s in cursor:
        out.append(TimetableSlotInDB(**s))
    return out
