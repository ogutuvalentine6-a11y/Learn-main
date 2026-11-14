from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import get_current_user, require_role, write_rate_guard
from app.models.community import (
    ReplyCreate,
    ReplyInDB,
    StudyGroupCreate,
    StudyGroupInDB,
    ThreadCreate,
    ThreadInDB,
)
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["community"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


async def _can_access_course(user: UserInDB, course_id: Optional[str]) -> bool:
    """Admins always; open content (no course) any logged-in user;
    enrolled students; assigned staff."""
    if user.role == "admin":
        return True
    if not course_id:
        return True
    db = get_database()
    if user.role == "student":
        e = await db.enrollments.find_one({
            "studentId": ObjectId(user.id),
            "courseId": ObjectId(course_id),
            "paymentStatus": "paid",
        })
        return bool(e)
    if user.role == "staff":
        a = await db.staffassignments.find_one({
            "staffId": ObjectId(user.id),
            "courseId": ObjectId(course_id),
        })
        return bool(a)
    return False


# ── THREADS ─────────────────────────────────────────────────────
@router.post("/discussions/threads", response_model=ThreadInDB, status_code=201)
# -- rate-limited via dependency in signature --
async def thread_create(
    payload: ThreadCreate,
    auth: UserInDB = Depends(get_current_user),
    _rl: None = Depends(write_rate_guard),
):
    if payload.courseId and not await _can_access_course(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="Not enrolled in that course")

    now = _utcnow()
    doc = {
        "courseId": payload.courseId,
        "title": payload.title,
        "body": payload.body,
        "kind": payload.kind,
        "authorId": ObjectId(auth.id),
        "authorName": auth.fullName,
        "authorRole": auth.role,
        "pinned": False,
        "locked": False,
        "views": 0,
        "replyCount": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().threads.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="thread_create",
        target=str(result.inserted_id), meta={"courseId": payload.courseId},
    )
    return ThreadInDB(**doc)


@router.get("/discussions/threads", response_model=list[ThreadInDB])
async def thread_list(
    courseId: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    mine: bool = Query(default=False),
    limit: int = Query(default=50, le=200),
    auth: UserInDB = Depends(get_current_user),
):
    # Must have access to the course (or no course filter = general feed)
    if courseId and not await _can_access_course(auth, courseId):
        raise HTTPException(status_code=403, detail="No access")

    filt: dict = {}
    if courseId:
        filt["courseId"] = courseId
    if kind:
        filt["kind"] = kind
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"body": {"$regex": q, "$options": "i"}},
        ]
    if mine:
        filt["authorId"] = ObjectId(auth.id)

    cursor = (
        get_database().threads.find(filt)
        .sort([("pinned", -1), ("createdAt", -1)])
        .limit(limit)
    )
    out = []
    async for doc in cursor:
        out.append(ThreadInDB(**doc))
    return out


@router.get("/discussions/threads/{thread_id}")
async def thread_get(
    thread_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    tid = _oid(thread_id)
    thread = await db.threads.find_one({"_id": tid})
    if not thread:
        raise HTTPException(status_code=404, detail="Not found")
    if thread.get("courseId") and not await _can_access_course(auth, thread["courseId"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.threads.update_one({"_id": tid}, {"$inc": {"views": 1}})
    thread["views"] = thread.get("views", 0) + 1

    replies = []
    cursor = db.replies.find({"threadId": tid}).sort("createdAt", 1)
    async for r in cursor:
        replies.append(ReplyInDB(**r))

    return {"thread": ThreadInDB(**thread), "replies": replies}


@router.patch("/discussions/threads/{thread_id}")
async def thread_update(
    thread_id: str,
    auth: UserInDB = Depends(get_current_user),
    pinned: Optional[bool] = Query(default=None),
    locked: Optional[bool] = Query(default=None),
):
    db = get_database()
    tid = _oid(thread_id)
    thread = await db.threads.find_one({"_id": tid})
    if not thread:
        raise HTTPException(status_code=404, detail="Not found")

    is_owner = str(thread["authorId"]) == auth.id
    can_moderate = auth.role in ("staff", "admin")

    if (pinned is not None or locked is not None) and not can_moderate:
        raise HTTPException(status_code=403, detail="Only staff/admin can pin or lock")
    if not (is_owner or can_moderate):
        raise HTTPException(status_code=403, detail="Forbidden")

    updates: dict = {"updatedAt": _utcnow()}
    if pinned is not None:
        updates["pinned"] = pinned
    if locked is not None:
        updates["locked"] = locked

    updated = await db.threads.find_one_and_update(
        {"_id": tid}, {"$set": updates}, return_document=True
    )
    return ThreadInDB(**updated)


@router.delete("/discussions/threads/{thread_id}")
async def thread_delete(
    thread_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    tid = _oid(thread_id)
    thread = await db.threads.find_one({"_id": tid})
    if not thread:
        raise HTTPException(status_code=404, detail="Not found")

    is_owner = str(thread["authorId"]) == auth.id
    if not is_owner and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.threads.delete_one({"_id": tid})
    await db.replies.delete_many({"threadId": tid})
    await log_action(actorId=auth.id, action="thread_delete", target=thread_id)
    return {"ok": True}


# ── REPLIES ─────────────────────────────────────────────────────
@router.post(
    "/discussions/threads/{thread_id}/replies",
    response_model=ReplyInDB,
    status_code=201,
)
# -- rate-limited via dependency in signature --
async def reply_create(
    thread_id: str,
    payload: ReplyCreate,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    tid = _oid(thread_id)
    thread = await db.threads.find_one({"_id": tid})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.get("locked"):
        raise HTTPException(status_code=400, detail="Thread is locked")
    if thread.get("courseId") and not await _can_access_course(auth, thread["courseId"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    now = _utcnow()
    doc = {
        "threadId": tid,
        "parentReplyId": _oid(payload.parentReplyId) if payload.parentReplyId else None,
        "body": payload.body,
        "authorId": ObjectId(auth.id),
        "authorName": auth.fullName,
        "authorRole": auth.role,
        "createdAt": now,
    }
    result = await db.replies.insert_one(doc)
    doc["_id"] = result.inserted_id
    await db.threads.update_one(
        {"_id": tid},
        {"$inc": {"replyCount": 1}, "$set": {"updatedAt": now}},
    )
    return ReplyInDB(**doc)


@router.delete("/discussions/replies/{reply_id}")
async def reply_delete(
    reply_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    rid = _oid(reply_id)
    reply = await db.replies.find_one({"_id": rid})
    if not reply:
        raise HTTPException(status_code=404, detail="Not found")

    is_owner = str(reply["authorId"]) == auth.id
    if not is_owner and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.replies.delete_one({"_id": rid})
    await db.threads.update_one(
        {"_id": reply["threadId"]}, {"$inc": {"replyCount": -1}}
    )
    return {"ok": True}


# ── STUDY GROUPS ────────────────────────────────────────────────
@router.post("/study-groups", response_model=StudyGroupInDB, status_code=201)
# -- rate-limited via dependency in signature --
async def group_create(
    payload: StudyGroupCreate,
    auth: UserInDB = Depends(get_current_user),
):
    if payload.courseId and not await _can_access_course(auth, payload.courseId):
        raise HTTPException(status_code=403, detail="No access to that course")

    now = _utcnow()
    doc = {
        "courseId": payload.courseId,
        "name": payload.name,
        "description": payload.description,
        "ownerId": ObjectId(auth.id),
        "ownerName": auth.fullName,
        "memberIds": [auth.id],  # creator auto-joins
        "maxMembers": payload.maxMembers,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().study_groups.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="study_group_create",
        target=str(result.inserted_id),
    )
    return StudyGroupInDB(**doc)


@router.get("/study-groups", response_model=list[StudyGroupInDB])
async def group_list(
    courseId: Optional[str] = Query(default=None),
    mine: bool = Query(default=False),
    limit: int = Query(default=50, le=200),
    auth: UserInDB = Depends(get_current_user),
):
    if courseId and not await _can_access_course(auth, courseId):
        raise HTTPException(status_code=403, detail="No access")

    filt: dict = {}
    if courseId:
        filt["courseId"] = courseId
    if mine:
        filt["memberIds"] = auth.id

    cursor = (
        get_database().study_groups.find(filt)
        .sort("createdAt", -1)
        .limit(limit)
    )
    out = []
    async for doc in cursor:
        out.append(StudyGroupInDB(**doc))
    return out


@router.post("/study-groups/{group_id}/join", response_model=StudyGroupInDB)
async def group_join(
    group_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    gid = _oid(group_id)
    group = await db.study_groups.find_one({"_id": gid})
    if not group:
        raise HTTPException(status_code=404, detail="Not found")
    if auth.id in group["memberIds"]:
        return StudyGroupInDB(**group)
    if len(group["memberIds"]) >= group["maxMembers"]:
        raise HTTPException(status_code=400, detail="Group is full")
    if group.get("courseId") and not await _can_access_course(auth, group["courseId"]):
        raise HTTPException(status_code=403, detail="No access to course")

    updated = await db.study_groups.find_one_and_update(
        {"_id": gid},
        {"$push": {"memberIds": auth.id}, "$set": {"updatedAt": _utcnow()}},
        return_document=True,
    )
    return StudyGroupInDB(**updated)


@router.post("/study-groups/{group_id}/leave", response_model=StudyGroupInDB)
async def group_leave(
    group_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    gid = _oid(group_id)
    group = await db.study_groups.find_one({"_id": gid})
    if not group:
        raise HTTPException(status_code=404, detail="Not found")
    if str(group["ownerId"]) == auth.id:
        raise HTTPException(
            status_code=400,
            detail="Owner cannot leave — delete the group instead",
        )

    updated = await db.study_groups.find_one_and_update(
        {"_id": gid},
        {"$pull": {"memberIds": auth.id}, "$set": {"updatedAt": _utcnow()}},
        return_document=True,
    )
    return StudyGroupInDB(**updated)


@router.delete("/study-groups/{group_id}")
async def group_delete(
    group_id: str,
    auth: UserInDB = Depends(get_current_user),
):
    db = get_database()
    gid = _oid(group_id)
    group = await db.study_groups.find_one({"_id": gid})
    if not group:
        raise HTTPException(status_code=404, detail="Not found")
    if str(group["ownerId"]) != auth.id and auth.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.study_groups.delete_one({"_id": gid})
    await log_action(actorId=auth.id, action="study_group_delete", target=group_id)
    return {"ok": True}
