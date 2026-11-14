from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Literal["student", "staff", "admin"] = "student"

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    model_config = {"populate_by_name": True}

class UserPublic(UserBase):
    id: str = Field(alias="_id")
    model_config = {"populate_by_name": True}
