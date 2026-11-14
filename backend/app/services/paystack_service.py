import httpx
from app.core.config import get_settings

settings = get_settings()
BASE = "https://api.paystack.co"
HEADERS = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}

async def initialize_payment(email: str, amount_kobo: int, callback_url: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{BASE}/transaction/initialize",
            headers=HEADERS,
            json={"email": email, "amount": amount_kobo, "callback_url": callback_url},
        )
        r.raise_for_status()
        return r.json()

async def verify_payment(reference: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE}/transaction/verify/{reference}", headers=HEADERS)
        r.raise_for_status()
        return r.json()
