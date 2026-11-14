import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.user import UserInDB
from app.models.welfare import (
    SENSITIVE_CATEGORIES,
    TicketCreate,
    TicketInDB,
    TicketMessageInDB,
    TicketReply,
    TicketStatusUpdate,
)
from app.services.logger import log_action
from app.services.notifier import notify_user

router = APIRouter(prefix="/api/welfare", tags=["welfare"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _new_message_id() -> str:
    return str(uuid.uuid4())


async def _staff_can_see(user: UserInDB, ticket: dict) -> bool:
    """Admins see everything. Staff see non-sensitive tickets only."""
    if user.role == "admin":
        return True
    if user.role == "staff" and ticket["category"] not in SENSITIVE_CATEGORIES:
        return True
    return False


def _strip_internal(ticket: dict) -> dict:
    """Remove internal notes from a ticket for student view."""
    t = dict(ticket)
    t["messages"] = [m for m in t.get("messages", []) if not m.get("internalNote")]
    return t


# ── STUDENT: create ticket ─────────────────────────────────
@router.post("/tickets", response_model=TicketInDB, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    auth: UserInDB = Depends(require_role("student")),
):
    now = _utcnow()
    first_message = {
        "id": _new_message_id(),
        "authorId": ObjectId(auth.id),
        "authorName": auth.fullName,
        "authorRole": "student",
        "body": payload.body,
        "internalNote": False,
        "createdAt": now,
    }
    doc = {
        "studentId": ObjectId(auth.id),
        "studentName": auth.fullName,
        "studentEmail": auth.email,
        "category": payload.category,
        "subject": payload.subject,
        "status": "open",
        "priority": payload.priority,
        "messages": [first_message],
        "assignedTo": None,
        "assignedToName": "",
        "resolvedAt": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().welfare_tickets.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Auto-prioritize urgent categories
    if payload.category == "counseling" and payload.priority == "normal":
        await get_database().welfare_tickets.update_one(
            {"_id": result.inserted_id},
            {"$set": {"priority": "high"}},
        )
        doc["priority"] = "high"

    await log_action(
        actorId=auth.id, action="welfare_ticket_create",
        target=str(result.inserted_id),
        meta={"category": payload.category, "priority": doc["priority"]},
    )
    return TicketInDB(**doc)


# ── STUDENT: my tickets ────────────────────────────────────
@router.get("/tickets/my", response_model=list[TicketInDB])
async def my_tickets(auth: UserInDB = Depends(require_role("student"))):
    cursor = (
        get_database().welfare_tickets.find({"studentId": ObjectId(auth.id)})
        .sort("updatedAt", -1)
    )
    out = []
    async for t in cursor:
        out.append(TicketInDB(**_strip_internal(t)))
    return out


# ── GET ticket detail (student own / staff non-sensitive / admin any) ──
@router.get("/tickets/{ticket_id}", response_model=TicketInDB)
async def get_ticket(
    ticket_id: str,
    auth: UserInDB = Depends(require_role("student", "staff", "admin")),
):
    t = await get_database().welfare_tickets.find_one({"_id": _oid(ticket_id)})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")

    if auth.role == "student":
        if str(t["studentId"]) != auth.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return TicketInDB(**_strip_internal(t))

    if not await _staff_can_see(auth, t):
        raise HTTPException(status_code=403, detail="Forbidden")
    return TicketInDB(**t)


# ── STUDENT: reply ─────────────────────────────────────────
@router.post("/tickets/{ticket_id}/reply", response_model=TicketInDB)
async def student_reply(
    ticket_id: str,
    payload: TicketReply,
    auth: UserInDB = Depends(require_role("student")),
):
    db = get_database()
    t = await db.welfare_tickets.find_one({"_id": _oid(ticket_id)})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if str(t["studentId"]) != auth.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if t["status"] == "closed":
        raise HTTPException(status_code=400, detail="Ticket is closed")

    msg = {
        "id": _new_message_id(),
        "authorId": ObjectId(auth.id),
        "authorName": auth.fullName,
        "authorRole": "student",
        "body": payload.body,
        "internalNote": False,  # students can't post internal notes
        "createdAt": _utcnow(),
    }
    updated = await db.welfare_tickets.find_one_and_update(
        {"_id": t["_id"]},
        {
            "$push": {"messages": msg},
            "$set": {
                "updatedAt": _utcnow(),
                # Reopen if resolved — student response means it's not done
                "status": "in_progress" if t["status"] == "resolved" else t["status"],
            },
        },
        return_document=True,
    )
    return TicketInDB(**_strip_internal(updated))


# ── ADMIN: list all tickets ────────────────────────────────
@router.get("/admin/tickets", response_model=list[TicketInDB])
async def admin_list(
    status: Optional[str] = Query(default=None, pattern="^(open|in_progress|resolved|closed)$"),
    category: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=200, le=500),
    auth: UserInDB = Depends(require_role("admin", "staff")),
):
    filt: dict = {}
    if status:
        filt["status"] = status
    if category:
        filt["category"] = category
    if priority:
        filt["priority"] = priority
    if q:
        filt["$or"] = [
            {"subject": {"$regex": q, "$options": "i"}},
            {"studentName": {"$regex": q, "$options": "i"}},
            {"studentEmail": {"$regex": q, "$options": "i"}},
        ]
    # Staff can't see sensitive categories
    if auth.role == "staff":
        filt["category"] = {"$nin": list(SENSITIVE_CATEGORIES)}

    cursor = (
        get_database().welfare_tickets.find(filt)
        .sort([("priority", -1), ("updatedAt", -1)])
        .limit(limit)
    )
    out = []
    async for t in cursor:
        out.append(TicketInDB(**t))
    return out


# ── ADMIN: reply ───────────────────────────────────────────
@router.post("/admin/tickets/{ticket_id}/reply", response_model=TicketInDB)
async def admin_reply(
    ticket_id: str,
    payload: TicketReply,
    auth: UserInDB = Depends(require_role("admin", "staff")),
):
    db = get_database()
    t = await db.welfare_tickets.find_one({"_id": _oid(ticket_id)})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_see(auth, t):
        raise HTTPException(status_code=403, detail="Forbidden")
    if t["status"] == "closed":
        raise HTTPException(status_code=400, detail="Ticket is closed")

    msg = {
        "id": _new_message_id(),
        "authorId": ObjectId(auth.id),
        "authorName": auth.fullName,
        "authorRole": auth.role,
        "body": payload.body,
        "internalNote": payload.internalNote if auth.role == "admin" else False,
        "createdAt": _utcnow(),
    }
    # Move to in_progress if it's still open
    new_status = "in_progress" if t["status"] == "open" else t["status"]
    # Assign to this admin if unassigned
    updates = {
        "messages_push": None,  # placeholder, we use $push below
        "status": new_status,
        "updatedAt": _utcnow(),
    }
    set_updates = {"status": new_status, "updatedAt": _utcnow()}
    if not t.get("assignedTo"):
        set_updates["assignedTo"] = ObjectId(auth.id)
        set_updates["assignedToName"] = auth.fullName

    updated = await db.welfare_tickets.find_one_and_update(
        {"_id": t["_id"]},
        {"$push": {"messages": msg}, "$set": set_updates},
        return_document=True,
    )

    # Notify the student if this isn't an internal note
    if not msg["internalNote"]:
        try:
            await notify_user(
                user_id=str(t["studentId"]),
                kind="system",
                title=f"Reply on your ticket: {t['subject']}",
                body=payload.body[:140],
                link=f"/student/welfare#{t['_id']}",
            )
        except Exception:
            pass

    return TicketInDB(**updated)


# ── ADMIN: update status ───────────────────────────────────
@router.patch("/admin/tickets/{ticket_id}/status", response_model=TicketInDB)
async def admin_update_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    auth: UserInDB = Depends(require_role("admin", "staff")),
):
    db = get_database()
    t = await db.welfare_tickets.find_one({"_id": _oid(ticket_id)})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _staff_can_see(auth, t):
        raise HTTPException(status_code=403, detail="Forbidden")

    set_fields: dict = {
        "status": payload.status,
        "updatedAt": _utcnow(),
    }
    if payload.status == "resolved":
        set_fields["resolvedAt"] = _utcnow()
    elif payload.status in ("open", "in_progress"):
        set_fields["resolvedAt"] = None

    if payload.assignedTo:
        assignee = await db.users.find_one({"_id": _oid(payload.assignedTo)})
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        set_fields["assignedTo"] = assignee["_id"]
        set_fields["assignedToName"] = assignee.get("fullName", "")

    updated = await db.welfare_tickets.find_one_and_update(
        {"_id": t["_id"]}, {"$set": set_fields}, return_document=True,
    )
    await log_action(
        actorId=auth.id, action="welfare_ticket_status",
        target=ticket_id, meta={"status": payload.status},
    )

    # Notify student of status change
    try:
        await notify_user(
            user_id=str(t["studentId"]),
            kind="system",
            title=f"Ticket {payload.status.replace('_', ' ')}: {t['subject']}",
            body="",
            link=f"/student/welfare#{t['_id']}",
        )
    except Exception:
        pass

    return TicketInDB(**updated)


# ── ADMIN: stats ───────────────────────────────────────────
@router.get("/admin/stats")
async def admin_stats(auth: UserInDB = Depends(require_role("admin", "staff"))):
    db = get_database()
    # Staff can only see non-sensitive
    base = {}
    if auth.role == "staff":
        base = {"category": {"$nin": list(SENSITIVE_CATEGORIES)}}

    by_status = {}
    for s in ("open", "in_progress", "resolved", "closed"):
        by_status[s] = await db.welfare_tickets.count_documents({**base, "status": s})

    by_category = {}
    for c in ("academic", "financial", "welfare", "counseling", "technical", "other"):
        by_category[c] = await db.welfare_tickets.count_documents({**base, "category": c})

    by_priority = {}
    for p in ("low", "normal", "high", "urgent"):
        by_priority[p] = await db.welfare_tickets.count_documents({**base, "priority": p})

    return {
        "byStatus": by_status,
        "byCategory": by_category,
        "byPriority": by_priority,
        "total": sum(by_status.values()),
    }
