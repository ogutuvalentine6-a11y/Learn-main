import resend
from app.core.config import get_settings

settings = get_settings()
resend.api_key = settings.RESEND_API_KEY

async def send_email(to_email: str, subject: str, html_body: str) -> dict:
    return resend.Emails.send({
        "from": "Learn <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    })
