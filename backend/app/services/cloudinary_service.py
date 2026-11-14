import cloudinary
import cloudinary.uploader
from app.core.config import get_settings

settings = get_settings()
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

async def upload_file(file_bytes: bytes, folder: str = "learn_uploads") -> str:
    result = cloudinary.uploader.upload(file_bytes, folder=folder)
    return result["secure_url"]
