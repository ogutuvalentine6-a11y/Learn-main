from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.academic import (
    CalendarEventCreate,
    CalendarEventInDB,
    CalendarEventUpdate,
    SemesterCreate,
    SemesterInDB,
    SemesterUpdate,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/academic", tags=["academic"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _ensure_aware(dt: datetime) -> datetime:
    """Normalize to UTC-aware. Pydantic accepts naive; store consistently."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ══════════════════════════════════════════════════════════════
# SEMESTERS
# ══════════════════════════════════════════════════════════════

@router.post("/semesters", response_model=SemesterInDB, status_code=201)
async def semester_create(
    payload: SemesterCreate,
    auth: UserInDB = Depends(require_role("admin")),
):
    start = _ensure_aware(payload.startDate)
    end = _ensure_aware(payload.endDate)
    if end <= start:
        raise HTTPException(status_code=400, detail="endDate must be after startDate")

    now = _utcnow()
    doc = {
        "name": payload.name,
        "startDate": start,
        "endDate": end,
        "description": payload.description,
        "status": "draft",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().semesters.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="semester_create",
        target=str(result.inserted_id), meta={"name": payload.name},
    )
    return SemesterInDB(**doc)


@router.get("/semesters", response_model=list[SemesterInDB])
async def semester_list(
    status: Optional[str] = Query(default=None, pattern="^(draft|active|archived)$"),
):
    """Public list of semesters. Drafts are admin-only in theory but
    this endpoint returns all — client filters by status."""
    filt: dict = {}
    if status:
        filt["status"] = status
    cursor = get_database().semesters.find(filt).sort("startDate", -1)
    out = []
    async for s in cursor:
        out.append(SemesterInDB(**s))
    return out


@router.get("/semesters/current", response_model=Optional[SemesterInDB])
async def semester_current():
    """The currently-active semester. Prefers explicit isActive; falls
    back to date-range match. Returns null if none match."""
    db = get_database()
    now = _utcnow()

    # Prefer a semester explicitly marked active whose date range contains now
    active = await db.semesters.find_one({
        "status": "active",
        "startDate": {"$lte": now},
        "endDate": {"$gte": now},
    })
    if active:
        return SemesterInDB(**active)

    # Fallback — any active status regardless of date
    any_active = await db.semesters.find_one({"status": "active"})
    if any_active:
        return SemesterInDB(**any_active)

    # Last resort — semester whose date range contains now (even if draft)
    in_range = await db.semesters.find_one({
        "startDate": {"$lte": now},
        "endDate": {"$gte": now},
    })
    return SemesterInDB(**in_range) if in_range else None


@router.get("/semesters/{semester_id}", response_model=SemesterInDB)
async def semester_get(semester_id: str):
    s = await get_database().semesters.find_one({"_id": _oid(semester_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return SemesterInDB(**s)


@router.patch("/semesters/{semester_id}", response_model=SemesterInDB)
async def semester_update(
    semester_id: str,
    payload: SemesterUpdate,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    s = await db.semesters.find_one({"_id": _oid(semester_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key in ("startDate", "endDate"):
        if key in updates:
            updates[key] = _ensure_aware(updates[key])

    if "startDate" in updates or "endDate" in updates:
        start = updates.get("startDate", s["startDate"])
        end = updates.get("endDate", s["endDate"])
        if end <= start:
            raise HTTPException(status_code=400, detail="endDate must be after startDate")

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updatedAt"] = _utcnow()

    updated = await db.semesters.find_one_and_update(
        {"_id": s["_id"]}, {"$set": updates}, return_document=True,
    )
    await log_action(actorId=auth.id, action="semester_update", target=semester_id)
    return SemesterInDB(**updated)


@router.post("/semesters/{semester_id}/activate", response_model=SemesterInDB)
async def semester_activate(
    semester_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    """Mark as active. Archives any other active semesters atomically."""
    db = get_database()
    s = await db.semesters.find_one({"_id": _oid(semester_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    now = _utcnow()
    # Archive all currently-active semesters (excluding target)
    await db.semesters.update_many(
        {"status": "active", "_id": {"$ne": s["_id"]}},
        {"$set": {"status": "archived", "updatedAt": now}},
    )
    updated = await db.semesters.find_one_and_update(
        {"_id": s["_id"]},
        {"$set": {"status": "active", "updatedAt": now}},
        return_document=True,
    )
    await log_action(actorId=auth.id, action="semester_activate", target=semester_id)
    return SemesterInDB(**updated)


@router.post("/semesters/{semester_id}/archive", response_model=SemesterInDB)
async def semester_archive(
    semester_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    s = await db.semesters.find_one({"_id": _oid(semester_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    updated = await db.semesters.find_one_and_update(
        {"_id": s["_id"]},
        {"$set": {"status": "archived", "updatedAt": _utcnow()}},
        return_document=True,
    )
    await log_action(actorId=auth.id, action="semester_archive", target=semester_id)
    return SemesterInDB(**updated)


@router.delete("/semesters/{semester_id}")
async def semester_delete(
    semester_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    """Delete a semester. Calendar events stay but lose their semester link."""
    db = get_database()
    s = await db.semesters.find_one({"_id": _oid(semester_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    await db.calendar_events.update_many(
        {"semesterId": s["_id"]}, {"$set": {"semesterId": None}},
    )
    await db.semesters.delete_one({"_id": s["_id"]})
    await log_action(actorId=auth.id, action="semester_delete", target=semester_id)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# CALENDAR EVENTS
# ══════════════════════════════════════════════════════════════

@router.post("/calendar/events", response_model=CalendarEventInDB, status_code=201)
async def event_create(
    payload: CalendarEventCreate,
    auth: UserInDB = Depends(require_role("admin")),
):
    start = _ensure_aware(payload.startDate)
    end = _ensure_aware(payload.endDate)
    if end < start:
        raise HTTPException(status_code=400, detail="endDate must be >= startDate")

    if payload.semesterId:
        sem = await get_database().semesters.find_one({"_id": _oid(payload.semesterId)})
        if not sem:
            raise HTTPException(status_code=404, detail="Semester not found")

    now = _utcnow()
    doc = {
        "title": payload.title,
        "description": payload.description,
        "eventType": payload.eventType,
        "startDate": start,
        "endDate": end,
        "semesterId": ObjectId(payload.semesterId) if payload.semesterId else None,
        "isPublic": payload.isPublic,
        "createdBy": ObjectId(auth.id),
        "createdByName": auth.fullName,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().calendar_events.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="calendar_event_create",
        target=str(result.inserted_id), meta={"title": payload.title},
    )
    return CalendarEventInDB(**doc)


@router.get("/calendar/events", response_model=list[CalendarEventInDB])
async def event_list(
    semesterId: Optional[str] = Query(default=None),
    upcoming: bool = Query(default=False),
    publicOnly: bool = Query(default=True),
    limit: int = Query(default=100, le=500),
):
    """Public calendar events. Filters: semesterId, upcoming (start >= now),
    publicOnly (default true — hides internal-only events)."""
    filt: dict = {}
    if publicOnly:
        filt["isPublic"] = True
    if semesterId:
        filt["semesterId"] = _oid(semesterId)
    if upcoming:
        filt["startDate"] = {"$gte": _utcnow()}

    cursor = get_database().calendar_events.find(filt).sort("startDate", 1).limit(limit)
    out = []
    async for e in cursor:
        out.append(CalendarEventInDB(**e))
    return out


@router.get("/calendar/events/{event_id}", response_model=CalendarEventInDB)
async def event_get(event_id: str):
    e = await get_database().calendar_events.find_one({"_id": _oid(event_id)})
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    return CalendarEventInDB(**e)


@router.patch("/calendar/events/{event_id}", response_model=CalendarEventInDB)
async def event_update(
    event_id: str,
    payload: CalendarEventUpdate,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    e = await db.calendar_events.find_one({"_id": _oid(event_id)})
    if not e:
        raise HTTPException(status_code=404, detail="Not found")

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key in ("startDate", "endDate"):
        if key in updates:
            updates[key] = _ensure_aware(updates[key])
    if "semesterId" in updates and updates["semesterId"]:
        updates["semesterId"] = _oid(updates["semesterId"])
    if "semesterId" in updates and updates["semesterId"] is None:
        # allow explicit null
        pass

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    start = updates.get("startDate", e["startDate"])
    end = updates.get("endDate", e["endDate"])
    if end < start:
        raise HTTPException(status_code=400, detail="endDate must be >= startDate")

    updates["updatedAt"] = _utcnow()
    updated = await db.calendar_events.find_one_and_update(
        {"_id": e["_id"]}, {"$set": updates}, return_document=True,
    )
    await log_action(actorId=auth.id, action="calendar_event_update", target=event_id)
    return CalendarEventInDB(**updated)


@router.delete("/calendar/events/{event_id}")
async def event_delete(
    event_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    result = await get_database().calendar_events.delete_one({"_id": _oid(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="calendar_event_delete", target=event_id)
    return {"ok": True}
