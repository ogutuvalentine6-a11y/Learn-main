import secrets
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role, write_rate_guard
from app.models.live import (
    LiveAttendanceInDB,
    LiveSessionCreate,
    LiveSessionInDB,
    LiveSessionUpdate,
)
from app.models.user import UserInDB
from app.services.logger import log_action
from app.services.notifier import notify_course_students

router = APIRouter(prefix="/api/live", tags=["live"])
settings = get_settings()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _make_room() -> tuple[str, str]:
    """Generate a unique room name and join URL for the default provider."""
    room = f"learn-{secrets.token_urlsafe(9)}"
    # Provider-agnostic — swap this line to point at self-hosted or LiveKit.
    join_url = f"https://meet.jit.si/{room}"
    return room, join_url


def _compute_status(session: dict) -> str:
    """Derive live status from scheduledAt + durationMinutes."""
    if session["status"] != "scheduled":
        return session["status"]
    now = _utcnow()
    start = session["scheduledAt"]
    if isinstance(start, str):
        start = datetime.fromisoformat(start.replace("Z", "+00:00"))
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    end = start + __import__("datetime").timedelta(minutes=session["durationMinutes"])
    if now > end:
        return "ended"
    return "scheduled"


async def _can_manage(session: dict, user: UserInDB) -> bool:
    if user.role == "admin":
        return True
    if str(session["hostId"]) != user.id:
        return False
    return True


async def _can_join(session: dict, user: UserInDB) -> bool:
    """Students must be paid-enrolled in the session's course (if scoped)."""
    if user.role == "admin":
        return True
    if str(session["hostId"]) == user.id:
        return True
    if user.role == "staff":
        # staff can join any session for a course they're assigned to
        if not session.get("courseId"):
            return True
        a = await get_database().staffassignments.find_one({
            "staffId": ObjectId(user.id),
            "courseId": ObjectId(session["courseId"]),
        })
        return bool(a)
    # student
    if not session.get("courseId"):
        return True  # open session — anyone logged in
    e = await get_database().enrollments.find_one({
        "studentId": ObjectId(user.id),
        "courseId": ObjectId(session["courseId"]),
        "paymentStatus": "paid",
    })
    return bool(e)


# ── CREATE ──────────────────────────────────────────────────────
@router.post("/sessions", response_model=LiveSessionInDB, status_code=201)
async def session_create(
    payload: LiveSessionCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
    _rl: None = Depends(write_rate_guard),
):
    # staff can only create for courses they're assigned to
    if auth.role == "staff" and payload.courseId:
        a = await get_database().staffassignments.find_one({
            "staffId": ObjectId(auth.id),
            "courseId": ObjectId(payload.courseId),
        })
        if not a:
            raise HTTPException(status_code=403, detail="Not assigned to that course")

    room, join_url = _make_room()
    now = _utcnow()
    doc = {
        "title": payload.title,
        "description": payload.description,
        "courseId": payload.courseId,
        "hostId": ObjectId(auth.id),
        "hostName": auth.fullName,
        "scheduledAt": payload.scheduledAt,
        "durationMinutes": payload.durationMinutes,
        "provider": "jitsi",
        "roomName": room,
        "joinUrl": join_url,
        "status": "scheduled",
        "materials": payload.materials,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().live_sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="live_session_create",
        target=str(result.inserted_id), meta={"title": payload.title},
    )

    # Notify enrolled students if the session is course-scoped
    if payload.courseId:
        when = payload.scheduledAt.strftime("%Y-%m-%d %H:%M UTC")
        await notify_course_students(
            course_id=payload.courseId,
            kind="live",
            title=f"Live class scheduled: {payload.title}",
            body=f"{auth.fullName} scheduled a live class on {when}.",
            link=f"/live/sessions/{result.inserted_id}",
        )
    return LiveSessionInDB(**doc)


# ── LIST ────────────────────────────────────────────────────────
@router.get("/sessions", response_model=list[LiveSessionInDB])
async def session_list(
    scope: str = Query(default="upcoming", pattern="^(upcoming|past|all|mine)$"),
    courseId: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=100),
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    filt: dict = {}
    if courseId:
        filt["courseId"] = courseId

    if scope == "mine":
        filt["hostId"] = ObjectId(auth.id)
    elif scope == "upcoming":
        filt["status"] = "scheduled"
    elif scope == "past":
        filt["status"] = {"$in": ["ended", "cancelled"]}

    if auth.role == "student":
        # students see: sessions for courses they're enrolled in + open sessions
        enrolled = await db.enrollments.distinct(
            "courseId",
            {"studentId": ObjectId(auth.id), "paymentStatus": "paid"},
        )
        course_ids = [str(c) for c in enrolled]
        filt["$or"] = [
            {"courseId": None},
            {"courseId": {"$in": course_ids}},
        ]
    elif auth.role == "staff" and scope != "mine":
        # staff sees sessions for their assigned courses + open
        assigned = await db.staffassignments.distinct(
            "courseId", {"staffId": ObjectId(auth.id)},
        )
        course_ids = [str(c) for c in assigned]
        filt["$or"] = [
            {"courseId": None},
            {"courseId": {"$in": course_ids}},
            {"hostId": ObjectId(auth.id)},
        ]

    cursor = (
        db.live_sessions.find(filt)
        .sort("scheduledAt", -1 if scope == "past" else 1)
        .limit(limit)
    )
    out = []
    async for doc in cursor:
        # Overwrite status with computed value for display
        doc["status"] = _compute_status(doc)
        out.append(LiveSessionInDB(**doc))
    return out


# ── GET ONE ─────────────────────────────────────────────────────
@router.get("/sessions/{session_id}", response_model=LiveSessionInDB)
async def session_get(
    session_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    doc = await get_database().live_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_join(doc, auth):
        raise HTTPException(status_code=403, detail="Forbidden")
    doc["status"] = _compute_status(doc)
    return LiveSessionInDB(**doc)


# ── UPDATE ──────────────────────────────────────────────────────
@router.patch("/sessions/{session_id}", response_model=LiveSessionInDB)
async def session_update(
    session_id: str,
    payload: LiveSessionUpdate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    doc = await db.live_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_manage(doc, auth):
        raise HTTPException(status_code=403, detail="Forbidden")

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    updates["updatedAt"] = _utcnow()
    updated = await db.live_sessions.find_one_and_update(
        {"_id": doc["_id"]}, {"$set": updates}, return_document=True
    )
    await log_action(
        actorId=auth.id, action="live_session_update",
        target=session_id, meta={"fields": list(updates.keys())},
    )
    updated["status"] = _compute_status(updated)
    return LiveSessionInDB(**updated)


# ── CANCEL ──────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/cancel", response_model=LiveSessionInDB)
async def session_cancel(
    session_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    doc = await db.live_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_manage(doc, auth):
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = await db.live_sessions.find_one_and_update(
        {"_id": doc["_id"]},
        {"$set": {"status": "cancelled", "updatedAt": _utcnow()}},
        return_document=True,
    )
    await log_action(
        actorId=auth.id, action="live_session_cancel", target=session_id,
    )
    return LiveSessionInDB(**updated)


# ── JOIN ────────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/join")
async def session_join(
    session_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    doc = await db.live_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Session cancelled")
    if not await _can_join(doc, auth):
        raise HTTPException(status_code=403, detail="Forbidden")

    now = _utcnow()
    # Upsert attendance: if existing open record, keep it (idempotent)
    existing = await db.live_attendance.find_one({
        "sessionId": doc["_id"],
        "userId": ObjectId(auth.id),
        "leftAt": None,
    })
    if existing:
        att_id = str(existing["_id"])
    else:
        ins = await db.live_attendance.insert_one({
            "sessionId": doc["_id"],
            "userId": ObjectId(auth.id),
            "userName": auth.fullName,
            "userRole": auth.role,
            "joinedAt": now,
            "leftAt": None,
            "durationSeconds": 0,
        })
        att_id = str(ins.inserted_id)

    return {
        "joinUrl": doc["joinUrl"],
        "roomName": doc["roomName"],
        "attendanceId": att_id,
        "sessionTitle": doc["title"],
    }


# ── LEAVE ───────────────────────────────────────────────────────
@router.post("/sessions/{session_id}/leave")
async def session_leave(
    session_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    sid = _oid(session_id)
    now = _utcnow()
    att = await db.live_attendance.find_one({
        "sessionId": sid,
        "userId": ObjectId(auth.id),
        "leftAt": None,
    })
    if not att:
        return {"ok": True, "already_left": True}

    joined = att["joinedAt"]
    if isinstance(joined, str):
        joined = datetime.fromisoformat(joined.replace("Z", "+00:00"))
    if joined.tzinfo is None:
        joined = joined.replace(tzinfo=timezone.utc)
    duration = int((now - joined).total_seconds())

    await db.live_attendance.update_one(
        {"_id": att["_id"]},
        {"$set": {"leftAt": now, "durationSeconds": duration}},
    )
    return {"ok": True, "durationSeconds": duration}


# ── ATTENDANCE REPORT ───────────────────────────────────────────
@router.get(
    "/sessions/{session_id}/attendance",
    response_model=list[LiveAttendanceInDB],
)
async def session_attendance(
    session_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    doc = await db.live_sessions.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_manage(doc, auth):
        raise HTTPException(status_code=403, detail="Forbidden")

    cursor = db.live_attendance.find({"sessionId": doc["_id"]}).sort("joinedAt", 1)
    out = []
    async for a in cursor:
        out.append(LiveAttendanceInDB(**a))
    return out
