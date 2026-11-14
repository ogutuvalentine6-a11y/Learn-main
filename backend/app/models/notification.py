from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models._types import PyObjectId

NotificationKind = Literal[
    "enrollment", "payment", "assignment", "grade", "live",
    "resource", "discussion", "certificate", "system",
]


class NotificationInDB(BaseModel):
    id: PyObjectId = Field(alias="_id")
    userId: PyObjectId
    kind: NotificationKind = "system"
    title: str
    body: str = ""
    link: str = ""
    read: bool = False
    createdAt: datetime

    model_config = {"populate_by_name": True}
