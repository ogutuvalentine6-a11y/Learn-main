from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, create_access_token, get_password_hash
from app.db.mongodb import get_database
from app.models.user import UserCreate, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserPublic, status_code=201)
async def register(payload: UserCreate):
    db = get_database()
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "hashed_password": get_password_hash(payload.password),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc.pop("hashed_password", None)
    return doc

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_database().users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}
