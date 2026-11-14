from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnnouncementItem(BaseModel):
    id: str
    text: str
    link: str = ""
    active: bool = True


class HeroSection(BaseModel):
    title: str = "Learn Without Limits. Build Your Future."
    subtitle: str = (
        "Discover quality education, connect with experienced instructors, "
        "access learning resources, and develop the skills you need to succeed."
    )
    badgeText: str = "Learning without limits"
    primaryCtaLabel: str = "Get Started"
    primaryCtaHref: str = "/register"
    secondaryCtaLabel: str = "Explore Courses"
    secondaryCtaHref: str = "#courses"
    backgroundImageUrl: str = ""


class FounderSection(BaseModel):
    name: str = "Valentine Otieno Ogutu"
    role: str = "Software Engineer · Founder, Learn"
    bio: str = ""
    githubUrl: str = "https://github.com/ogutuvalentine6-a11y"
    avatarUrl: str = ""


class CtaSection(BaseModel):
    title: str = "Ready to start learning?"
    subtitle: str = "Join a platform built for real progress — not just pretty pages."
    primaryLabel: str = "Create your account"
    primaryHref: str = "/register"
    secondaryLabel: str = "I already have one"
    secondaryHref: str = "/login"


class HomepageContentInDB(BaseModel):
    """Single-document config. `_id` is always 'main'."""
    id: str = Field(alias="_id")
    hero: HeroSection = HeroSection()
    founder: FounderSection = FounderSection()
    cta: CtaSection = CtaSection()
    announcements: List[AnnouncementItem] = []
    featuredCourseIds: List[str] = []
    published: bool = True
    updatedAt: datetime
    updatedBy: Optional[str] = None

    model_config = {"populate_by_name": True}


class HomepageUpdate(BaseModel):
    """Admin PATCH body — all sections optional for partial updates."""
    hero: Optional[HeroSection] = None
    founder: Optional[FounderSection] = None
    cta: Optional[CtaSection] = None
    announcements: Optional[List[AnnouncementItem]] = None
    featuredCourseIds: Optional[List[str]] = None
    published: Optional[bool] = None
