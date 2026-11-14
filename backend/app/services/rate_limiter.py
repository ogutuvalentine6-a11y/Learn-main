"""Rate limiter matching legacy lib/rate-limit.ts.

Thresholds (all per IP, per minute, sliding window):
  - general: 30/min
  - auth:     5/min
  - upload:  10/min

Uses Redis (async) when REDIS_URL is set; falls back to an
in-process sliding window otherwise (dev / test friendly).
"""

import asyncio
import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import Request

from app.core.config import get_settings

settings = get_settings()


# ── Redis backend (optional) ─────────────────────────────────────────────
_redis = None
if settings.REDIS_URL:
    try:
        import redis.asyncio as redis_async

        _redis = redis_async.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        _redis = None


async def _redis_sliding_window(key: str, limit: int, window_seconds: int) -> bool:
    now_ms = int(time.time() * 1000)
    cutoff = now_ms - window_seconds * 1000
    pipe = _redis.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zcard(key)
    pipe.zadd(key, {str(now_ms): now_ms})
    pipe.expire(key, window_seconds + 1)
    _, count, _, _ = await pipe.execute()
    return count < limit


# ── In-memory fallback ───────────────────────────────────────────────────
_mem: dict[str, Deque[float]] = defaultdict(deque)
_mem_lock = asyncio.Lock()


async def _mem_sliding_window(key: str, limit: int, window_seconds: int) -> bool:
    async with _mem_lock:
        now = time.time()
        cutoff = now - window_seconds
        dq = _mem[key]
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= limit:
            return False
        dq.append(now)
        return True


async def _check(key: str, limit: int, window_seconds: int) -> bool:
    if _redis is not None:
        try:
            return await _redis_sliding_window(key, limit, window_seconds)
        except Exception:
            pass
    return await _mem_sliding_window(key, limit, window_seconds)


# ── Public API matching legacy helpers ───────────────────────────────────
def get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def general_limit(ip: str) -> bool:
    return await _check(f"rl:general:{ip}", 30, 60)


async def auth_limit(ip: str) -> bool:
    return await _check(f"rl:auth:{ip}", 5, 60)


async def upload_limit(ip: str) -> bool:
    return await _check(f"rl:upload:{ip}", 10, 60)


async def enforce(kind: str, request: Request) -> bool:
    """kind ∈ {'general','auth','upload'}. Returns True if allowed."""
    ip = get_client_ip(request)
    if kind == "auth":
        return await auth_limit(ip)
    if kind == "upload":
        return await upload_limit(ip)
    return await general_limit(ip)
