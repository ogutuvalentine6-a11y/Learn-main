"""Homepage CMS — extended sections (hero slides, testimonials, FAQ, footer)."""


async def test_homepage_default_has_new_empty_fields(client):
    r = await client.get("/api/homepage-content")
    assert r.status_code == 200
    body = r.json()
    for field in ("heroSlides", "testimonials", "faqs", "footerLinks", "featuredInstructorIds"):
        assert field in body
        assert body[field] == []


async def test_admin_can_set_hero_slides(admin_client, client):
    r = await admin_client.patch("/api/admin/homepage-content", json={
        "heroSlides": [
            {
                "id": "s1", "title": "Slide 1", "subtitle": "Sub 1",
                "imageUrl": "", "ctaLabel": "Go", "ctaHref": "/register",
                "active": True,
            },
            {
                "id": "s2", "title": "Slide 2", "subtitle": "",
                "imageUrl": "", "ctaLabel": "View", "ctaHref": "/courses",
                "active": False,
            },
        ],
    })
    assert r.status_code == 200
    assert len(r.json()["heroSlides"]) == 2

    pub = await client.get("/api/homepage-content")
    assert len(pub.json()["heroSlides"]) == 2


async def test_admin_can_set_testimonials(admin_client, client):
    r = await admin_client.patch("/api/admin/homepage-content", json={
        "testimonials": [
            {"id": "t1", "name": "Alice", "role": "Student", "quote": "Great!",
             "avatarUrl": "", "approved": True},
            {"id": "t2", "name": "Bob", "role": "Student", "quote": "Pending",
             "avatarUrl": "", "approved": False},
        ],
    })
    assert r.status_code == 200
    assert len(r.json()["testimonials"]) == 2
    # One approved, one pending — both stored, frontend filters
    pub = await client.get("/api/homepage-content")
    approved = [t for t in pub.json()["testimonials"] if t["approved"]]
    assert len(approved) == 1
    assert approved[0]["name"] == "Alice"


async def test_admin_can_set_faqs(admin_client, client):
    r = await admin_client.patch("/api/admin/homepage-content", json={
        "faqs": [
            {"id": "f1", "question": "Q1", "answer": "A1"},
            {"id": "f2", "question": "Q2", "answer": "A2"},
        ],
    })
    assert r.status_code == 200
    pub = await client.get("/api/homepage-content")
    assert len(pub.json()["faqs"]) == 2


async def test_admin_can_set_footer_links(admin_client, client):
    r = await admin_client.patch("/api/admin/homepage-content", json={
        "footerLinks": [
            {"title": "About", "links": [
                {"label": "Our Story", "href": "/about"},
                {"label": "Contact", "href": "/contact"},
            ]},
        ],
    })
    assert r.status_code == 200
    pub = await client.get("/api/homepage-content")
    groups = pub.json()["footerLinks"]
    assert len(groups) == 1
    assert groups[0]["title"] == "About"
    assert len(groups[0]["links"]) == 2


async def test_partial_update_preserves_others(admin_client, client):
    """PATCH hero only should not wipe out previously-set testimonials."""
    await admin_client.patch("/api/admin/homepage-content", json={
        "testimonials": [
            {"id": "t1", "name": "Test", "role": "", "quote": "Q",
             "avatarUrl": "", "approved": True}
        ],
    })
    await admin_client.patch("/api/admin/homepage-content", json={
        "hero": {
            "title": "New Hero", "subtitle": "", "badgeText": "",
            "primaryCtaLabel": "", "primaryCtaHref": "/",
            "secondaryCtaLabel": "", "secondaryCtaHref": "/",
            "backgroundImageUrl": "",
        },
    })
    pub = await client.get("/api/homepage-content")
    assert len(pub.json()["testimonials"]) == 1
    assert pub.json()["hero"]["title"] == "New Hero"


async def test_student_cannot_patch_homepage(student_client):
    r = await student_client.patch("/api/admin/homepage-content", json={
        "faqs": [{"id": "x", "question": "Q", "answer": "A"}],
    })
    assert r.status_code == 403


async def test_anonymous_cannot_patch_homepage(client):
    r = await client.patch("/api/admin/homepage-content", json={"faqs": []})
    assert r.status_code == 401
