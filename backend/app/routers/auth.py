from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongodb import get_database
from app.dependencies import get_current_user
from app.models.user import LanguageCode
from app.models.user import (
    LoginResponse,
    RegisterResponse,
    UserInDB,
    UserLogin,
    UserPublic,
    UserRegister,
)
from app.services.logger import log_action
from app.services.rate_limiter import enforce
from fastapi import Request

router = APIRouter(prefix="/api", tags=["auth"])
settings = get_settings()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=False,  # set True behind HTTPS in prod
        path="/",
    )


@router.post("/auth-register", response_model=RegisterResponse, status_code=201)
async def register(payload: UserRegister, request: Request):
    if not await enforce("auth", request):
        raise HTTPException(status_code=429, detail="Too many requests")

    db = get_database()
    email_lc = payload.email.lower()

    if await db.users.find_one({"email": email_lc}):
        raise HTTPException(status_code=409, detail="Email already registered")
    if await db.users.find_one({"idNumber": payload.idNumber}):
        raise HTTPException(status_code=409, detail="idNumber already registered")

    now = datetime.now(timezone.utc)
    doc = {
        "idNumber": payload.idNumber,
        "fullName": payload.fullName,
        "email": email_lc,
        "phone": payload.phone,
        "location": payload.location,
        "school": payload.school,
        "fieldOfStudy": payload.fieldOfStudy,
        "courseOfStudy": payload.courseOfStudy,
        "password": hash_password(payload.password),
        "role": "student",
        "status": "active",
        "emailVerified": False,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(doc)
    await log_action(
        actorId=str(result.inserted_id), action="register", target=email_lc
    )
    return {"id": str(result.inserted_id), "email": email_lc}


@router.post("/auth-login", response_model=LoginResponse)
async def login(payload: UserLogin, response: Response, request: Request):
    if not await enforce("auth", request):
        raise HTTPException(status_code=429, detail="Too many requests")

    db = get_database()
    doc = await db.users.find_one({"email": payload.email.lower()})
    if not doc or not verify_password(payload.password, doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if doc.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")

    token = create_access_token(
        user_id=str(doc["_id"]), role=doc["role"], email=doc["email"]
    )
    _set_auth_cookie(response, token)
    return {
        "id": str(doc["_id"]),
        "role": doc["role"],
        "email": doc["email"],
        "fullName": doc["fullName"],
    }


@router.post("/auth-logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/auth-me", response_model=UserPublic)
async def me(current: UserInDB = Depends(get_current_user)):
    data = current.model_dump(by_alias=False)
    data.pop("password", None)
    return UserPublic.model_validate(data)


from pydantic import BaseModel as _PM


class _LanguageUpdate(_PM):
    language: LanguageCode


@router.patch("/auth-me/language")
async def update_language(
    payload: _LanguageUpdate,
    current: UserInDB = Depends(get_current_user),
):
    """Change the authenticated user's preferred language."""
    from datetime import datetime, timezone
    from bson import ObjectId
    from app.db.mongodb import get_database

    now = datetime.now(timezone.utc)
    await get_database().users.update_one(
        {"_id": ObjectId(current.id)},
        {"$set": {"language": payload.language, "updatedAt": now}},
    )
    await log_action(
        actorId=current.id,
        action="user_language_change",
        target=current.id,
        meta={"language": payload.language},
    )
    return {"ok": True, "language": payload.language}

