"""Public-facing endpoints for anonymous + authenticated visitors.

Feeds the marketing pages: course catalog, instructor directory, event
list, certificate verification. All read-only, all rate-limited by
the general bucket, no sensitive data returned.
"""
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from app.db.mongodb import get_database

router = APIRouter(prefix="/api", tags=["public-api"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Course catalog with search + filter ─────────────────────────
@router.get("/courses/search")
async def courses_search(
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[str] = Query(default=None),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc|popular)$"),
    limit: int = Query(default=24, le=60),
    skip: int = Query(default=0, ge=0),
):
    db = get_database()
    filt: dict = {"isActive": True}
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]

    sort_spec = {
        "newest": [("createdAt", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "popular": [("createdAt", -1)],  # placeholder until we track enrollments per course
    }[sort]

    cursor = db.courses.find(filt).sort(sort_spec).skip(skip).limit(limit)

    items = []
    async for c in cursor:
        enrolled = await db.enrollments.count_documents({
            "courseId": c["_id"], "paymentStatus": "paid",
        })
        items.append({
            "id": str(c["_id"]),
            "title": c.get("title", ""),
            "description": c.get("description", ""),
            "price": float(c.get("price", 0)),
            "isActive": c.get("isActive", True),
            "enrollments": enrolled,
            "createdAt": c.get("createdAt"),
        })

    total = await db.courses.count_documents(filt)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


# ── Instructor directory ────────────────────────────────────────
@router.get("/instructors")
async def instructors_list(limit: int = Query(default=50, le=100)):
    db = get_database()
    cursor = db.users.find(
        {"role": "staff", "status": "active"},
        {"password": 0},
    ).sort("createdAt", -1).limit(limit)

    out = []
    async for u in cursor:
        courses_count = await db.courses.count_documents({
            "createdBy": u["_id"], "isActive": True,
        })
        out.append({
            "id": str(u["_id"]),
            "fullName": u.get("fullName", ""),
            "fieldOfStudy": u.get("fieldOfStudy", ""),
            "school": u.get("school", ""),
            "location": u.get("location", ""),
            "bio": "",  # populated from future profile field
            "coursesCount": courses_count,
        })
    return out


@router.get("/instructors/{instructor_id}")
async def instructor_detail(instructor_id: str):
    db = get_database()
    try:
        oid = ObjectId(instructor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    u = await db.users.find_one({"_id": oid, "role": "staff"}, {"password": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Instructor not found")

    courses = []
    async for c in db.courses.find({"createdBy": oid, "isActive": True}).limit(20):
        courses.append({
            "id": str(c["_id"]),
            "title": c.get("title", ""),
            "description": c.get("description", ""),
            "price": float(c.get("price", 0)),
        })

    return {
        "id": str(u["_id"]),
        "fullName": u.get("fullName", ""),
        "fieldOfStudy": u.get("fieldOfStudy", ""),
        "school": u.get("school", ""),
        "location": u.get("location", ""),
        "bio": "",
        "courses": courses,
    }


# ── Events (upcoming live sessions) ────────────────────────────
@router.get("/events/upcoming")
async def events_upcoming(limit: int = Query(default=20, le=50)):
    db = get_database()
    now = _utcnow()
    cursor = (
        db.live_sessions.find({
            "status": "scheduled",
            "scheduledAt": {"$gte": now},
        })
        .sort("scheduledAt", 1)
        .limit(limit)
    )

    out = []
    async for s in cursor:
        course_title = ""
        if s.get("courseId"):
            try:
                c = await db.courses.find_one({"_id": ObjectId(s["courseId"])})
                if c:
                    course_title = c.get("title", "")
            except Exception:
                pass
        out.append({
            "id": str(s["_id"]),
            "title": s.get("title", ""),
            "description": s.get("description", ""),
            "hostName": s.get("hostName", ""),
            "scheduledAt": s.get("scheduledAt"),
            "durationMinutes": s.get("durationMinutes", 60),
            "courseTitle": course_title,
            "courseId": s.get("courseId"),
        })
    return out


# ── Certificate verification ───────────────────────────────────
@router.get("/certificates/verify/{certificate_id}")
async def certificate_verify(certificate_id: str):
    """Public verification endpoint — returns certificate info if valid."""
    db = get_database()
    cert = await db.certificates.find_one({"certificateId": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    student = await db.users.find_one(
        {"_id": cert["studentId"]}, {"password": 0, "fullName": 1, "email": 1},
    )
    course = await db.courses.find_one({"_id": cert["courseId"]})

    return {
        "valid": True,
        "certificateId": cert["certificateId"],
        "studentName": student.get("fullName", "") if student else "",
        "courseTitle": course.get("title", "") if course else "",
        "issuedAt": cert.get("issuedAt"),
        "emailSent": cert.get("emailSent", False),
    }
