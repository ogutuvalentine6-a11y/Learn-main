from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId


class LogInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    actorId: Optional[PyObjectId] = None
    action: str
    target: str
    meta: dict[str, Any] = {}
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}
