from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role
from app.models.module import ModuleCreate, ModuleInDB, ModuleUpdate
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/modules", tags=["modules"])


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


# ── CREATE module ─────────────────────────────────────────────
@router.post("", response_model=ModuleInDB, status_code=201)
async def module_create(
    payload: ModuleCreate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    if not await _staff_can_manage(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="Not assigned to that course")

    now = _utcnow()
    doc = {
        "courseId": _oid(payload.courseId),
        "title": payload.title,
        "description": payload.description,
        "orderIndex": payload.orderIndex,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().modules.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="module_create",
        target=str(result.inserted_id), meta={"courseId": payload.courseId},
    )
    return ModuleInDB(**doc)


# ── LIST modules in a course (with nested session counts) ──────
@router.get("")
async def module_list(courseId: str):
    db = get_database()
    try:
        cid = ObjectId(courseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid courseId")

    cursor = db.modules.find({"courseId": cid}).sort("orderIndex", 1)
    modules = []
    async for m in cursor:
        sessions_count = await db.sessions.count_documents({"moduleId": str(m["_id"])})
        # Use by_alias=True so the response uses "_id" (matching every
        # other endpoint's JSON contract), not Pydantic's "id" field name.
        doc = ModuleInDB(**m).model_dump(by_alias=True)
        doc["sessionsCount"] = sessions_count
        modules.append(doc)

    # Also count standalone (no module) sessions for context
    standalone = await db.sessions.count_documents({
        "courseId": cid,
        "$or": [{"moduleId": None}, {"moduleId": {"$exists": False}}],
    })

    return {"modules": modules, "standaloneSessions": standalone}


# ── GET one module ─────────────────────────────────────────────
@router.get("/{module_id}", response_model=ModuleInDB)
async def module_get(module_id: str):
    m = await get_database().modules.find_one({"_id": _oid(module_id)})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    return ModuleInDB(**m)


# ── DELETE module ──────────────────────────────────────────────
@router.delete("/{module_id}")
async def module_delete(
    module_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    m = await db.modules.find_one({"_id": _oid(module_id)})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(m["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Unassign sessions — they become standalone
    await db.sessions.update_many(
        {"moduleId": module_id},
        {"$set": {"moduleId": None}},
    )
    await db.modules.delete_one({"_id": m["_id"]})
    await log_action(actorId=auth.id, action="module_delete", target=module_id)
    return {"ok": True}


# ── UPDATE module (title/description) ─────────────────────────
@router.patch("/{module_id}", response_model=ModuleInDB)
async def module_update(
    module_id: str,
    payload: ModuleUpdate,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    db = get_database()
    m = await db.modules.find_one({"_id": _oid(module_id)})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(m["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    # orderIndex changes must go through move-up/move-down (unique index)
    updates.pop("orderIndex", None)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updatedAt"] = _utcnow()

    updated = await db.modules.find_one_and_update(
        {"_id": m["_id"]}, {"$set": updates}, return_document=True
    )
    await log_action(
        actorId=auth.id, action="module_update",
        target=module_id, meta={"fields": list(updates.keys())},
    )
    return ModuleInDB(**updated)


async def _swap_with_neighbor(
    module_id: str, direction: str, auth: UserInDB,
) -> ModuleInDB:
    """Swap module with its immediate neighbor. Direction: 'up' or 'down'.

    The (courseId, orderIndex) unique index requires a temp value during
    swap. We use -1 as the temp (safe: no module ever has -1).
    """
    db = get_database()
    m = await db.modules.find_one({"_id": _oid(module_id)})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_manage(auth, str(m["courseId"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Read all modules in this course sorted by orderIndex
    siblings = await db.modules.find({"courseId": m["courseId"]}).sort("orderIndex", 1).to_list(length=200)
    idx = next((i for i, s in enumerate(siblings) if str(s["_id"]) == module_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Not found")

    neighbor_idx = idx - 1 if direction == "up" else idx + 1
    if neighbor_idx < 0 or neighbor_idx >= len(siblings):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move {direction} — already at {'top' if direction == 'up' else 'bottom'}",
        )

    neighbor = siblings[neighbor_idx]
    my_old = m["orderIndex"]
    n_old = neighbor["orderIndex"]

    # Three-step swap to respect unique index:
    # 1) me -> temp (-1)
    await db.modules.update_one({"_id": m["_id"]}, {"$set": {"orderIndex": -1}})
    # 2) neighbor -> my old position
    await db.modules.update_one(
        {"_id": neighbor["_id"]},
        {"$set": {"orderIndex": my_old, "updatedAt": _utcnow()}},
    )
    # 3) me -> neighbor's old position
    await db.modules.update_one(
        {"_id": m["_id"]},
        {"$set": {"orderIndex": n_old, "updatedAt": _utcnow()}},
    )

    updated = await db.modules.find_one({"_id": m["_id"]})
    await log_action(
        actorId=auth.id, action=f"module_move_{direction}", target=module_id,
    )
    return ModuleInDB(**updated)


@router.post("/{module_id}/move-up", response_model=ModuleInDB)
async def module_move_up(
    module_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    return await _swap_with_neighbor(module_id, "up", auth)


@router.post("/{module_id}/move-down", response_model=ModuleInDB)
async def module_move_down(
    module_id: str,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    return await _swap_with_neighbor(module_id, "down", auth)


# ── Public course curriculum (modules + sessions tree) ────────
@router.get("/course/{course_id}/curriculum")
async def course_curriculum(course_id: str):
    """Public-facing curriculum tree: modules -> sessions, plus standalone."""
    db = get_database()
    try:
        cid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid courseId")

    course = await db.courses.find_one({"_id": cid, "isActive": True})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Look up the course creator (instructor) — Course has createdBy
    instructor = None
    if course.get("createdBy"):
        creator = await db.users.find_one({"_id": course["createdBy"]})
        if creator:
            instructor = {
                "id": str(creator["_id"]),
                "fullName": creator.get("fullName", ""),
                "title": creator.get("title", ""),
                "avatarUrl": creator.get("avatarUrl", ""),
            }

    modules = []
    async for m in db.modules.find({"courseId": cid}).sort("orderIndex", 1):
        mid = str(m["_id"])
        sessions = []
        async for s in db.sessions.find({"moduleId": mid}).sort("orderIndex", 1):
            sessions.append({
                "id": str(s["_id"]),
                "title": s.get("title", ""),
                "orderIndex": s.get("orderIndex", 0),
                "hasQuiz": bool(s.get("quiz")),
                "materialsCount": len(s.get("materialUrls", [])),
                "materialUrls": s.get("materialUrls", []),
            })
        modules.append({
            "id": mid,
            "title": m.get("title", ""),
            "description": m.get("description", ""),
            "orderIndex": m.get("orderIndex", 0),
            "sessions": sessions,
        })

    # Standalone sessions (no moduleId) shown as "Additional Sessions"
    standalone = []
    async for s in db.sessions.find({
        "courseId": cid,
        "$or": [{"moduleId": None}, {"moduleId": {"$exists": False}}],
    }).sort("orderIndex", 1):
        standalone.append({
            "id": str(s["_id"]),
            "title": s.get("title", ""),
            "orderIndex": s.get("orderIndex", 0),
            "hasQuiz": bool(s.get("quiz")),
            "materialsCount": len(s.get("materialUrls", [])),
        })

    return {
        "course": {
            "id": str(course["_id"]),
            "title": course.get("title", ""),
            "description": course.get("description", ""),
            "price": float(course.get("price", 0) or 0),
            "category": course.get("category"),
            "learningOutcomes": course.get("learningOutcomes", []),
            "instructor": instructor,
        },
        "modules": modules,
        "standaloneSessions": standalone,
    }
