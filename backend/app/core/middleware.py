"""Security headers middleware — production baseline.

Adds the standard set of response headers browsers expect from a
production web app. Does not interfere with API JSON responses.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        # Prevent MIME sniffing — stops browser from reinterpreting file types
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Disallow framing — mitigates clickjacking on rendered HTML pages
        response.headers["X-Frame-Options"] = "DENY"
        # Don't leak full URLs to third parties
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Restrict browser features
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Baseline CSP — HTML responses from FastAPI (Swagger UI) work
        # under this. Frontend pages are served by Next.js, not FastAPI.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https://res.cloudinary.com; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "frame-ancestors 'none'"
        )
        # HSTS — only meaningful over HTTPS; harmless over HTTP in dev
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
