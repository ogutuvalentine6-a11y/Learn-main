from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.config import get_settings
from app.db.mongodb import get_database
from app.models.user import UserInDB

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    cred_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise cred_err
    except JWTError:
        raise cred_err
    user_data = await get_database().users.find_one({"email": email})
    if not user_data:
        raise cred_err
    user_data["_id"] = str(user_data["_id"])
    return UserInDB(**user_data)

def require_role(required_role: str):
    async def checker(current: UserInDB = Depends(get_current_user)) -> UserInDB:
        if current.role != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current
    return checker
