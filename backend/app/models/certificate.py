from datetime import datetime

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class CertificateInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    studentId: PyObjectId
    courseId: PyObjectId
    certificateId: str
    issuedAt: datetime
    emailSent: bool = False
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
