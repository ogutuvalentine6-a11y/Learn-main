from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, courses, learning, payments, uploads, admin

settings = get_settings()

app = FastAPI(title="Learn Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(learning.router)
app.include_router(payments.router)
app.include_router(uploads.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
