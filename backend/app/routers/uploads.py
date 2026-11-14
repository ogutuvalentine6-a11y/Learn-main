from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.config import get_settings
from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.progress import ProgressInDB
from app.models.user import UserInDB
from app.services.cloudinary_service import generate_upload_signature
from app.services.rate_limiter import enforce

router = APIRouter(prefix="/api", tags=["uploads"])
settings = get_settings()


class MaterialUploadRequest(BaseModel):
    courseId: str
    sessionId: str


class StudentFileUploadRequest(BaseModel):
    sessionId: str
    fileUrl: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/upload-material")
async def upload_material(
    payload: MaterialUploadRequest,
    request: Request,
    auth: UserInDB = Depends(require_role("staff", "admin")),
):
    if not await enforce("upload", request):
        raise HTTPException(status_code=429, detail="Too many uploads")

    folder = f"learning-platform/materials/{payload.courseId}/{payload.sessionId}"
    sig = generate_upload_signature({"folder": folder})
    return {
        "signature": sig["signature"],
        "timestamp": sig["timestamp"],
        "folder": folder,
        "apiKey": settings.CLOUDINARY_API_KEY,
    }


@router.get("/upload-student-file")
async def upload_student_file_signature(
    sessionId: str,
    request: Request,
    auth: UserInDB = Depends(require_role("student")),
):
    if not await enforce("upload", request):
        raise HTTPException(status_code=429, detail="Too many uploads")

    folder = f"learning-platform/submissions/{auth.id}/{sessionId}"
    sig = generate_upload_signature({"folder": folder})
    return {
        "signature": sig["signature"],
        "timestamp": sig["timestamp"],
        "folder": folder,
        "apiKey": settings.CLOUDINARY_API_KEY,
    }


@router.post("/upload-student-file", response_model=ProgressInDB)
async def upload_student_file_record(
    payload: StudentFileUploadRequest,
    request: Request,
    auth: UserInDB = Depends(require_role("student")),
):
    if not await enforce("upload", request):
        raise HTTPException(status_code=429, detail="Too many uploads")

    db = get_database()
    try:
        session_oid = ObjectId(payload.sessionId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sessionId")

    session = await db.sessions.find_one({"_id": session_oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = _utcnow()
    progress = await db.progresses.find_one_and_update(
        {"studentId": ObjectId(auth.id), "sessionId": session["_id"]},
        {
            "$set": {
                "courseId": session["courseId"],
                "sessionId": session["_id"],
                "uploadUrl": payload.fileUrl,
                "status": "awaiting_review",
                "submittedAt": now,
                "updatedAt": now,
            },
            "$setOnInsert": {
                "studentId": ObjectId(auth.id),
                "createdAt": now,
            },
        },
        upsert=True,
        return_document=True,
    )
    return ProgressInDB(**progress)
