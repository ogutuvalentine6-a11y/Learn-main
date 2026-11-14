"""Reusable field validators for user-supplied strings."""
from urllib.parse import urlparse


def validate_http_url(v: str) -> str:
    """Reject non-http(s) schemes. Blocks javascript:, data:, file:, etc.

    Allows empty string (URLs may be optional in some models).
    """
    if not v:
        return v
    try:
        parsed = urlparse(v)
    except Exception:
        raise ValueError("Invalid URL")
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"URL scheme must be http(s), got: {parsed.scheme or '(none)'}")
    if not parsed.netloc:
        raise ValueError("URL must have a host")
    return v
