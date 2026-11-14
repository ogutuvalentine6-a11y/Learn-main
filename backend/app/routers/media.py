from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from app.core.validators import validate_http_url

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.media import MediaAssetInDB
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["media"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MediaCreateRequest(BaseModel):
    filename: str
    url: str
    publicId: str = ""
    resourceType: str = "image"
    format: str = ""
    bytes: int = 0
    width: int | None = None
    height: int | None = None
    folder: str = ""
    visibility: str = "private"
    context: str = "other"
    contextId: str | None = None

    @field_validator("url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        return validate_http_url(v)


@router.post("/media", response_model=MediaAssetInDB, status_code=201)
async def media_create(
    payload: MediaCreateRequest,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    now = _utcnow()
    doc = {
        "filename": payload.filename,
        "url": payload.url,
        "publicId": payload.publicId,
        "resourceType": payload.resourceType,
        "format": payload.format,
        "bytes": payload.bytes,
        "width": payload.width,
        "height": payload.height,
        "folder": payload.folder,
        "uploadedBy": ObjectId(auth.id),
        "visibility": payload.visibility,
        "context": payload.context,
        "contextId": payload.contextId,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await get_database().media_assets.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_action(
        actorId=auth.id, action="media_create",
        target=str(result.inserted_id), meta={"url": payload.url},
    )
    return MediaAssetInDB(**doc)


@router.get("/media", response_model=list[MediaAssetInDB])
async def media_list(
    auth: UserInDB = Depends(require_role("staff", "admin")),
    context: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
):
    filt: dict = {}
    if context:
        filt["context"] = context
    cursor = get_database().media_assets.find(filt).sort("createdAt", -1).limit(limit)
    out = []
    async for doc in cursor:
        out.append(MediaAssetInDB(**doc))
    return out


@router.delete("/media/{media_id}")
async def media_delete(
    media_id: str,
    auth: UserInDB = Depends(require_role("admin")),
):
    try:
        oid = ObjectId(media_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    result = await get_database().media_assets.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(actorId=auth.id, action="media_delete", target=media_id)
    return {"ok": True}
