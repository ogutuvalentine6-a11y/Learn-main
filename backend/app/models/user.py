import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["student", "staff", "admin", "guardian"]
LanguageCode = Literal["en", "sw", "fr", "zh", "ja"]
UserStatus = Literal["active", "blocked"]


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Must contain an uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Must contain a lowercase letter")
    if not re.search(r"[0-9]", v):
        raise ValueError("Must contain a number")
    if not re.search(r"[^A-Za-z0-9]", v):
        raise ValueError("Must contain a special character")
    return v


class UserBase(BaseModel):
    idNumber: str = Field(..., min_length=3)
    fullName: str = Field(..., min_length=2)
    email: EmailStr
    language: LanguageCode = "en"
    phone: str = Field(..., min_length=7)
    location: str = Field(..., min_length=2)
    school: str = Field(..., min_length=2)
    fieldOfStudy: str = Field(..., min_length=2)
    courseOfStudy: str = Field(..., min_length=2)


class UserRegister(UserBase):
    """POST /api/auth/register. Role is NOT accepted from the client."""
    password: str

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _validate_password(v)


class UserLogin(BaseModel):
    """POST /api/auth/login."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserInDB(UserBase):
    """Document shape in MongoDB — matches models/User.ts."""
    id: str = Field(alias="_id")
    password: str  # bcrypt hash
    role: Role = "student"
    status: UserStatus = "active"
    language: LanguageCode = "en"
    emailVerified: bool = False
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class UserPublic(UserBase):
    """Public projection — no password. Matches `.select('-password')`."""
    id: str = Field(alias="_id")
    role: Role
    status: UserStatus
    emailVerified: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}


class LoginResponse(BaseModel):
    """Exact response shape of POST /api/auth/login."""
    id: str
    role: Role
    email: EmailStr
    fullName: str


class RegisterResponse(BaseModel):
    """Exact response shape of POST /api/auth/register."""
    id: str
    email: EmailStr
