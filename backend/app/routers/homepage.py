from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.homepage import HomepageContentInDB, HomepageUpdate
from app.models.user import UserInDB
from app.services.logger import log_action

router = APIRouter(prefix="/api", tags=["homepage"])

DOC_ID = "main"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _default_doc() -> dict:
    """Default homepage content when nothing is stored yet."""
    return {
        "_id": DOC_ID,
        "hero": {
            "title": "Learn Without Limits. Build Your Future.",
            "subtitle": (
                "Discover quality education, connect with experienced "
                "instructors, access learning resources, and develop the "
                "skills you need to succeed."
            ),
            "badgeText": "Learning without limits",
            "primaryCtaLabel": "Get Started",
            "primaryCtaHref": "/register",
            "secondaryCtaLabel": "Explore Courses",
            "secondaryCtaHref": "#courses",
            "backgroundImageUrl": "",
        },
        "founder": {
            "name": "Valentine Otieno Ogutu",
            "role": "Software Engineer · Founder, Learn",
            "bio": "",
            "githubUrl": "https://github.com/ogutuvalentine6-a11y",
            "avatarUrl": "",
        },
        "cta": {
            "title": "Ready to start learning?",
            "subtitle": "Join a platform built for real progress — not just pretty pages.",
            "primaryLabel": "Create your account",
            "primaryHref": "/register",
            "secondaryLabel": "I already have one",
            "secondaryHref": "/login",
        },
        "announcements": [],
        "featuredCourseIds": [],
        "published": True,
        "updatedAt": _utcnow(),
        "updatedBy": None,
    }


async def _get_or_init() -> dict:
    db = get_database()
    doc = await db.homepage_content.find_one({"_id": DOC_ID})
    if not doc:
        doc = _default_doc()
        await db.homepage_content.insert_one(doc)
    return doc


@router.get("/homepage-content", response_model=HomepageContentInDB)
async def homepage_public():
    """Public read — only returns if published=true."""
    doc = await _get_or_init()
    if not doc.get("published", True):
        raise HTTPException(status_code=404, detail="Not published")
    return HomepageContentInDB(**doc)


@router.get("/admin/homepage-content", response_model=HomepageContentInDB)
async def homepage_admin_get(_: UserInDB = Depends(require_role("admin"))):
    doc = await _get_or_init()
    return HomepageContentInDB(**doc)


@router.patch("/admin/homepage-content", response_model=HomepageContentInDB)
async def homepage_admin_patch(
    payload: HomepageUpdate,
    auth: UserInDB = Depends(require_role("admin")),
):
    db = get_database()
    await _get_or_init()  # ensure exists

    updates: dict = {"updatedAt": _utcnow(), "updatedBy": auth.id}
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in data.items():
        if hasattr(value, "model_dump"):
            updates[field] = value.model_dump()
        elif isinstance(value, list):
            updates[field] = [
                v.model_dump() if hasattr(v, "model_dump") else v for v in value
            ]
        else:
            updates[field] = value

    updated = await db.homepage_content.find_one_and_update(
        {"_id": DOC_ID}, {"$set": updates}, return_document=True
    )
    await log_action(
        actorId=auth.id, action="homepage_update", target=DOC_ID,
        meta={"fields": list(data.keys())},
    )
    return HomepageContentInDB(**updated)
