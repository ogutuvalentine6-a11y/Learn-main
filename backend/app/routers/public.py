from fastapi import APIRouter
from app.db.mongodb import get_database

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/public-stats")
async def public_stats():
    """Aggregate counts for the public homepage — no PII, no auth."""
    db = get_database()
    students = await db.users.count_documents({"role": "student"})
    instructors = await db.users.count_documents({"role": "staff"})
    courses = await db.courses.count_documents({"isActive": True})
    enrollments = await db.enrollments.count_documents({"paymentStatus": "paid"})
    return {
        "students": students,
        "instructors": instructors,
        "courses": courses,
        "enrollments": enrollments,
    }
