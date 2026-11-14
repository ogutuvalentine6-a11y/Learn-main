from typing import Optional

from bson import ObjectId
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import get_settings
from app.core.security import decode_token
from app.db.mongodb import get_database
from app.services.rate_limiter import enforce
from app.models.user import UserInDB

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth-login", auto_error=False
)


async def get_current_user(
    token_cookie: Optional[str] = Cookie(default=None, alias=settings.COOKIE_NAME),
    token_bearer: Optional[str] = Depends(oauth2_scheme),
) -> UserInDB:
    token = token_cookie or token_bearer
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or "id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = ObjectId(payload["id"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user id")

    doc = await get_database().users.find_one({"_id": user_id})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    if doc.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")

    doc["_id"] = str(doc["_id"])
    return UserInDB(**doc)


def require_role(*roles: str):
    """Usage: Depends(require_role('admin')) or Depends(require_role('staff','admin'))."""
    async def checker(current: UserInDB = Depends(get_current_user)) -> UserInDB:
        if current.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current
    return checker


async def write_rate_guard(request: Request) -> None:
    """Dependency: reject with 429 if this IP exceeds 20 writes/minute."""
    if not await enforce("write", request):
        raise HTTPException(status_code=429, detail="Too many write requests")

async def get_optional_user(
    token_cookie: Optional[str] = Cookie(default=None, alias=settings.COOKIE_NAME),
    token_bearer: Optional[str] = Depends(oauth2_scheme),
) -> Optional[UserInDB]:
    """Like get_current_user, but returns None instead of raising 401.

    Use this for endpoints that are public but enrich output when a
    user is authenticated (e.g. public reels feed, resource library).
    """
    token = token_cookie or token_bearer
    if not token:
        return None
    payload = decode_token(token)
    if not payload or "id" not in payload:
        return None
    try:
        user_id = ObjectId(payload["id"])
    except Exception:
        return None
    doc = await get_database().users.find_one({"_id": user_id})
    if not doc:
        return None
    if doc.get("status") == "blocked":
        return None
    doc["_id"] = str(doc["_id"])
    return UserInDB(**doc)

