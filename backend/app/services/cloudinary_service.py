"""Cloudinary integration.

The legacy flow is CLIENT-SIDE signed uploads:
  - backend returns {signature, timestamp, folder}
  - browser uploads directly to Cloudinary using the signature
  - backend never touches file bytes

`generate_upload_signature` is the router-facing function.
`upload_file` is retained for potential server-side use; it is
currently unused by routers (preserved per mandate §3.1).
"""

import time

import cloudinary
import cloudinary.uploader
from cloudinary.utils import api_sign_request

from app.core.config import get_settings

settings = get_settings()
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def generate_upload_signature(params: dict) -> dict:
    """Return {signature, timestamp, ...params} for client-side upload.

    Mirrors legacy lib/cloudinary.ts generateUploadSignature().
    """
    timestamp = int(time.time())
    to_sign = {**params, "timestamp": timestamp}
    signature = api_sign_request(to_sign, settings.CLOUDINARY_API_SECRET)
    return {"signature": signature, **to_sign}


async def upload_file(file_bytes: bytes, folder: str = "learn_uploads") -> str:
    """Server-side upload. NOT used by routers (legacy is signed-upload)."""
    result = cloudinary.uploader.upload(file_bytes, folder=folder)
    return result["secure_url"]
