from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database — env names match legacy (MONGODB_URI)
    MONGODB_URI: str = "mongodb://localhost:27017/learn_db"
    DATABASE_NAME: str = "learn_db"

    # Auth — env name matches legacy (JWT_SECRET)
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_NAME: str = "token"

    # External services
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    PAYSTACK_SECRET_KEY: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    REDIS_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
