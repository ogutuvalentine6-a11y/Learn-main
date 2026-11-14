"""Unified global search — courses, instructors, resources, reels, jobs.

Powers the ⌘K search palette in the header. Fast, grouped, no PII.
"""
from typing import Optional

from fastapi import APIRouter, Query

from app.db.mongodb import get_database

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(default=5, le=20),
):
    """Search across all public content. Returns grouped results."""
    db = get_database()
    regex = {"$regex": q, "$options": "i"}

    results = {
        "courses": [],
        "instructors": [],
        "resources": [],
        "reels": [],
        "jobs": [],
    }

    # ── Courses ──
    async for c in db.courses.find({
        "isActive": True,
        "$or": [{"title": regex}, {"description": regex}],
    }).limit(limit):
        results["courses"].append({
            "id": str(c["_id"]),
            "title": c.get("title", ""),
            "subtitle": f"NGN {float(c.get('price', 0)):,.0f}",
            "href": f"/courses/{c['_id']}",
        })

    # ── Instructors (staff role) ──
    async for u in db.users.find({
        "role": "staff", "status": "active",
        "$or": [{"fullName": regex}, {"fieldOfStudy": regex}],
    }).limit(limit):
        results["instructors"].append({
            "id": str(u["_id"]),
            "title": u.get("fullName", ""),
            "subtitle": u.get("fieldOfStudy", ""),
            "href": f"/instructors/{u['_id']}",
        })

    # ── Resources (public + approved only) ──
    async for r in db.resources.find({
        "visibility": "public", "status": "approved",
        "$or": [{"title": regex}, {"description": regex}],
    }).limit(limit):
        results["resources"].append({
            "id": str(r["_id"]),
            "title": r.get("title", ""),
            "subtitle": r.get("category", ""),
            "href": f"/resources#{r['_id']}",
        })

    # ── Reels (approved only) ──
    async for r in db.reels.find({
        "status": "approved",
        "$or": [{"title": regex}, {"description": regex}],
    }).limit(limit):
        results["reels"].append({
            "id": str(r["_id"]),
            "title": r.get("title", ""),
            "subtitle": r.get("category", ""),
            "href": f"/reels#{r['_id']}",
        })

    # ── Jobs (published only) ──
    async for j in db.jobs.find({
        "status": "published",
        "$or": [{"title": regex}, {"company": regex}, {"description": regex}],
    }).limit(limit):
        results["jobs"].append({
            "id": str(j["_id"]),
            "title": j.get("title", ""),
            "subtitle": j.get("company", ""),
            "href": f"/careers/{j['_id']}",
        })

    total = sum(len(v) for v in results.values())
    return {"query": q, "total": total, "results": results}
