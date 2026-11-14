from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import SecurityHeadersMiddleware
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from app.core.config import get_settings
from app.routers import auth, courses, learning, payments, uploads, admin, public, media, homepage, resources, reels, live, community, analytics, public_api, assignments, certificates, notifications

settings = get_settings()

app = FastAPI(title="Learn Platform API", version="0.1.0")

# ── Legacy-shape error handlers (frontend expects {error, fields}) ──
@app.exception_handler(HTTPException)
async def _http_exc(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail if isinstance(exc.detail, str) else "Request failed"},
    )


@app.exception_handler(RequestValidationError)
async def _val_exc(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Invalid input",
            "fields": jsonable_encoder(exc.errors()),
        },
    )



app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(learning.router)
app.include_router(payments.router)
app.include_router(uploads.router)
app.include_router(admin.router)
app.include_router(public.router)
app.include_router(media.router)
app.include_router(homepage.router)
app.include_router(resources.router)
app.include_router(reels.router)
app.include_router(live.router)
app.include_router(community.router)
app.include_router(analytics.router)
app.include_router(public_api.router)
app.include_router(assignments.router)
app.include_router(certificates.router)
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
