from typing import Annotated

from bson import ObjectId
from pydantic import BeforeValidator


def _to_str(v):
    if isinstance(v, ObjectId):
        return str(v)
    return v


PyObjectId = Annotated[str, BeforeValidator(_to_str)]
