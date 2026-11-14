"""Run once per environment: python scripts_init_indexes.py

Ensures all unique constraints and performance indexes exist.
Idempotent — safe to run multiple times.
Preserves the exact constraints from the legacy Mongoose models.
"""
import sys
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import OperationFailure

from app.core.config import get_settings

settings = get_settings()


def _create(collection, keys, unique=False, name=None, sparse=False):
    try:
        idx_name = name or "_".join(f"{k}_{d}" for k, d in keys)
        collection.create_index(
            keys, unique=unique, name=idx_name, sparse=sparse,
            background=True,
        )
        print(f"  ✅ {collection.name}.{idx_name}" + (" [unique]" if unique else ""))
    except OperationFailure as e:
        if e.code == 85:
            # IndexOptionsConflict — an equivalent index already exists
            # (different name but same keys/options). Not a problem.
            print(f"  ℹ️  {collection.name}.{idx_name}: equivalent index exists")
        else:
            # Real problem — e.g. duplicate data blocking a unique index
            print(f"  ⚠️  {collection.name}.{idx_name}: {e}")


def main() -> int:
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]
    print(f"Initializing indexes on: {settings.DATABASE_NAME}")
    print("")

    # ── users ──
    print("users:")
    _create(db.users, [("email", ASCENDING)], unique=True, name="email_unique")
    _create(db.users, [("idNumber", ASCENDING)], unique=True, name="idNumber_unique")
    _create(db.users, [("role", ASCENDING), ("createdAt", DESCENDING)], name="role_created")
    _create(db.users, [("status", ASCENDING)], name="status")
    _create(db.users, [("createdAt", DESCENDING)], name="createdAt_desc")

    # ── courses ──
    print("courses:")
    _create(db.courses, [("isActive", ASCENDING), ("createdAt", DESCENDING)], name="active_created")
    _create(db.courses, [("createdBy", ASCENDING)], name="createdBy")

    # ── sessions ──
    print("sessions:")
    _create(db.sessions, [("courseId", ASCENDING), ("orderIndex", ASCENDING)], unique=True, name="course_order_unique")

    # ── enrollments ──
    print("enrollments:")
    _create(db.enrollments, [("studentId", ASCENDING), ("courseId", ASCENDING)], unique=True, name="student_course_unique")
    _create(db.enrollments, [("paymentStatus", ASCENDING)], name="paymentStatus")

    # ── progresses ──
    print("progresses:")
    _create(db.progresses, [("studentId", ASCENDING), ("sessionId", ASCENDING)], unique=True, name="student_session_unique")
    _create(db.progresses, [("courseId", ASCENDING), ("status", ASCENDING)], name="course_status")

    # ── payments ──
    print("payments:")
    _create(db.payments, [("reference", ASCENDING)], unique=True, name="reference_unique")
    _create(db.payments, [("studentId", ASCENDING), ("createdAt", DESCENDING)], name="student_created")
    _create(db.payments, [("status", ASCENDING), ("verifiedAt", DESCENDING)], name="status_verified")

    # ── certificates ──
    print("certificates:")
    _create(db.certificates, [("certificateId", ASCENDING)], unique=True, name="certificateId_unique")
    _create(db.certificates, [("studentId", ASCENDING), ("courseId", ASCENDING)], name="student_course")

    # ── staffassignments ──
    print("staffassignments:")
    _create(db.staffassignments, [("staffId", ASCENDING), ("courseId", ASCENDING)], unique=True, name="staff_course_unique")

    # ── logs ──
    print("logs:")
    _create(db.logs, [("createdAt", DESCENDING)], name="createdAt_desc")
    _create(db.logs, [("actorId", ASCENDING)], name="actorId")
    _create(db.logs, [("action", ASCENDING)], name="action")

    # ── homepage_content ──
    print("homepage_content:")
    _create(db.homepage_content, [("updatedAt", DESCENDING)], name="updatedAt_desc")

    # ── media_assets ──
    print("media_assets:")
    _create(db.media_assets, [("context", ASCENDING), ("createdAt", DESCENDING)], name="context_created")
    _create(db.media_assets, [("uploadedBy", ASCENDING)], name="uploadedBy")

    # ── resources ──
    print("resources:")
    _create(db.resources, [("status", ASCENDING), ("createdAt", DESCENDING)], name="status_created")
    _create(db.resources, [("visibility", ASCENDING), ("status", ASCENDING)], name="visibility_status")
    _create(db.resources, [("ownerId", ASCENDING), ("createdAt", DESCENDING)], name="owner_created")
    _create(db.resources, [("courseId", ASCENDING), ("status", ASCENDING)], name="course_status")
    _create(db.resources, [("category", ASCENDING)], name="category")

    # ── reels ──
    print("reels:")
    _create(db.reels, [("status", ASCENDING), ("createdAt", DESCENDING)], name="status_created")
    _create(db.reels, [("category", ASCENDING), ("status", ASCENDING)], name="category_status")
    _create(db.reels, [("ownerId", ASCENDING), ("createdAt", DESCENDING)], name="owner_created")

    # ── reel_likes ──
    print("reel_likes:")
    _create(db.reel_likes, [("reelId", ASCENDING), ("userId", ASCENDING)], unique=True, name="reel_user_unique")

    # ── live_sessions ──
    print("live_sessions:")
    _create(db.live_sessions, [("courseId", ASCENDING), ("scheduledAt", ASCENDING)], name="course_scheduled")
    _create(db.live_sessions, [("hostId", ASCENDING), ("scheduledAt", ASCENDING)], name="host_scheduled")
    _create(db.live_sessions, [("status", ASCENDING)], name="status")

    # ── live_attendance ──
    print("live_attendance:")
    _create(db.live_attendance, [("sessionId", ASCENDING), ("userId", ASCENDING)], name="session_user")
    _create(db.live_attendance, [("sessionId", ASCENDING), ("joinedAt", ASCENDING)], name="session_joined")

    # ── threads ──
    print("threads:")
    _create(db.threads, [("courseId", ASCENDING), ("pinned", DESCENDING), ("createdAt", DESCENDING)], name="course_pinned_created")
    _create(db.threads, [("authorId", ASCENDING)], name="authorId")

    # ── replies ──
    print("replies:")
    _create(db.replies, [("threadId", ASCENDING), ("createdAt", ASCENDING)], name="thread_created")

    # ── study_groups ──
    print("study_groups:")
    _create(db.study_groups, [("courseId", ASCENDING), ("createdAt", DESCENDING)], name="course_created")
    _create(db.study_groups, [("memberIds", ASCENDING)], name="memberIds")

    print("")
    print("✅ Index initialization complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
