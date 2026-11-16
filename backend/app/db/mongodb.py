from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from app.core.config import get_settings

settings = get_settings()
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        uri = settings.MONGODB_URI or ""
        is_local = any(h in uri for h in ("localhost", "127.0.0.1", "0.0.0.0"))

        kwargs = {}
        # Only apply the certifi CA bundle for remote (Atlas) TLS connections.
        # Local MongoDB speaks plaintext by default — forcing TLS causes
        # SSL: UNEXPECTED_EOF_WHILE_READING on handshake.
        if not is_local:
            kwargs["tlsCAFile"] = certifi.where()

        _client = AsyncIOMotorClient(uri, **kwargs)
    return _client


def get_database():
    return get_client()[settings.DATABASE_NAME]
