import hashlib
import hmac

import httpx

from app.core.config import get_settings

settings = get_settings()

BASE = "https://api.paystack.co"


def _headers() -> dict:
    # Built per-call so setting the env var after import still works.
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def initialize_payment(
    email: str,
    amount_kobo: int,
    reference: str,
    callback_url: str | None = None,
    metadata: dict | None = None,
) -> dict:
    payload = {
        "email": email,
        "amount": amount_kobo,
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url
    if metadata:
        payload["metadata"] = metadata

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{BASE}/transaction/initialize", headers=_headers(), json=payload
        )
        r.raise_for_status()
        return r.json()


async def verify_payment(reference: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{BASE}/transaction/verify/{reference}", headers=_headers()
        )
        r.raise_for_status()
        return r.json()


def verify_webhook_signature(raw_body: bytes, sig_header: str | None) -> bool:
    """HMAC-SHA512 of raw body keyed by PAYSTACK_SECRET_KEY.

    Matches legacy paystack-webhook.ts behaviour exactly.
    Uses compare_digest for constant-time comparison.
    """
    if not sig_header or not settings.PAYSTACK_SECRET_KEY:
        return False
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, sig_header)
