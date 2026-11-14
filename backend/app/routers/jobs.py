from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.validators import validate_http_url
from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.job import JobCreate, JobInDB, JobUpdate
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _oid(x: str) -> ObjectId:
    try:
        return ObjectId(x)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ── CREATE (admin) ─────────────────────────────────────────────
@router.post("", response_model=JobInDB, status_code=201)
async def job_create(
    payload: JobCreate,
    auth: UserInDB = Depends(require_role("admin")),
):
    try:
        validate_http_url(payload.applyUrl)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    now = _utcnow()
    doc = {
        "title": payload.title,
        "company": payload.company,
        "location": payload.location,
        "jobType": payload.jobType,
        "description": payload.description,
        "requirements": payload.requirements,
        "salary": payload.salary,
        "applyUrl": payload.applyUrl,
        "deadline": payload.deadline,
        "featured": payload.featured,
        "status": payload.status,
        "postedBy": ObjectId(auth.id),
        "postedByName": auth.fullName,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="job_create",
        target=str(result.inserted_id), meta={"title": payload.title},
    )
    return JobInDB(**doc)


# ── PUBLIC list (published, non-expired) ──────────────────────
@router.get("/public", response_model=list[JobInDB])
async def job_public_list(
    jobType: Optional[str] = Query(default=None, max_length=30),
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=50, le=100),
):
    db = get_database()
    now = _utcnow()
    filt: dict = {
        "status": "published",
        "$or": [
            {"deadline": None},
            {"deadline": {"$exists": False}},
            {"deadline": {"$gte": now}},
        ],
    }
    if jobType:
        filt["jobType"] = jobType
    if q:
        filt["$and"] = [{
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"company": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
            ],
        }]

    cursor = (
        db.jobs.find(filt)
        .sort([("featured", -1), ("createdAt", -1)])
        .limit(limit)
    )
    out = []
    async for j in cursor:
        out.append(JobInDB(**j))
    return out


# ── PUBLIC detail ────────────────────────────────────────────
@router.get("/public/{job_id}", response_model=JobInDB)
async def job_public_get(job_id: str):
    j = await get_database().jobs.find_one({"_id": _oid(job_id), "status": "published"})
    if not j:
        raise HTTPException(status_code=404, detail="Not found")
    return JobInDB(**j)


# ── ADMIN list (all statuses) ────────────────────────────────
@router.get("", response_model=list[JobInDB])
async def job_admin_list(
    status: Optional[str] = Query(default=None, pattern="^(draft|published|closed)$"),
    _: UserInDB = Depends(require_role("admin")),
):
    filt: dict = {}
    if status:
        filt["status"] = status
    cursor = get_database().jobs.find(filt).sort("createdAt", -1).limit(200)
    out = []
    async for j in cursor:
        out.append(JobInDB(**j))
    return out


# ── ADMIN detail ─────────────────────────────────────────────
@router.get("/{job_id}", response_model=JobInDB)
async def job_admin_get(
    job_id: str,
    _: UserInDB = Depends(require_role("admin")),
):
    j = await get_database().jobs.find_one({"_id": _oid(job_id)})
    if not j:
        raise HTTPException(status_code=404, detail="Not found")
    return JobInDB(**j)


# ── UPDATE (admin) ────────────────────────────────────────────
@router.patch("/{job_id}", response_model=JobInDB)
async def job_update(
    job_id: str,
    payload: JobUpdate,
    auth: UserInDB = Depends(require_role("admin")),
):
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "applyUrl" in updates:
        try:
            validate_http_url(updates["applyUrl"])
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    updates["updatedAt"] = _utcnow()
    updated = await get_database().jobs.find_one_and_update(
        {"_id": _oid(job_id)}, {"$set": updates}, return_document=True
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="job_update", target=job_id)
    return JobInDB(**updated)


# ── DELETE (admin) ────────────────────────────────────────────
@router.delete("/{job_id}")
async def job_delete(
    job_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    result = await get_database().jobs.delete_one({"_id": _oid(job_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="job_delete", target=job_id)
    return {"ok": True}
