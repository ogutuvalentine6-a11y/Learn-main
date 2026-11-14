"""Pytest fixtures for the Learn API test suite.

Environment must be set BEFORE importing app.* so Settings picks up
the test database name. This avoids ever touching learn_db during tests.
"""
import os

# ── Set test env FIRST — before any app imports ──
os.environ["DATABASE_NAME"] = "learn_test"
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 52
os.environ["PAYSTACK_SECRET_KEY"] = "sk_test_dummy"
os.environ["CLOUDINARY_CLOUD_NAME"] = "test_cloud"
os.environ["CLOUDINARY_API_KEY"] = "test_key"
os.environ["CLOUDINARY_API_SECRET"] = "test_secret"
os.environ["RESEND_API_KEY"] = "test_resend"
os.environ["REDIS_URL"] = ""

import pytest
from datetime import datetime, timezone

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.mongodb import get_client, get_database
from app.core.security import hash_password
from app.services import rate_limiter


# ── One-off hash reuse (~250ms each otherwise) ──
_HASH = None


def _hash() -> str:
    global _HASH
    if _HASH is None:
        _HASH = hash_password("Passw0rd!")
    return _HASH


# ── Session: drop test DB and create indexes ──
# NOTE: this must be a *synchronous* fixture. pytest-asyncio's event_loop
# fixture is function-scoped by default; using `async def` at session scope
# raises ScopeMismatch. pymongo (sync) is already available via motor.
@pytest.fixture(scope="session", autouse=True)
def _init_indexes():
    from pymongo import MongoClient, ASCENDING
    from app.core.config import get_settings
    s = get_settings()

    sync_client = MongoClient(s.MONGODB_URI)
    sync_client.drop_database(s.DATABASE_NAME)
    db = sync_client[s.DATABASE_NAME]

    db.users.create_index("email", unique=True)
    db.users.create_index("idNumber", unique=True)
    db.payments.create_index("reference", unique=True)
    db.enrollments.create_index(
        [("studentId", ASCENDING), ("courseId", ASCENDING)], unique=True
    )
    db.progresses.create_index(
        [("studentId", ASCENDING), ("sessionId", ASCENDING)], unique=True
    )
    db.sessions.create_index(
        [("courseId", ASCENDING), ("orderIndex", ASCENDING)], unique=True
    )
    db.reel_likes.create_index(
        [("reelId", ASCENDING), ("userId", ASCENDING)], unique=True
    )

    yield

    sync_client.close()


# ── Per-test: reset Motor client, clear collections + rate limiter ──
@pytest.fixture(autouse=True)
async def _reset_state():
    # Motor binds its client to the event loop it was created on.
    # pytest-asyncio creates a fresh loop per test, so a cached client
    # from a prior test points at a dead loop -> "Event loop is closed".
    # Recreate the client for each test.
    from app.db import mongodb as _mongo
    if _mongo._client is not None:
        try:
            _mongo._client.close()
        except Exception:
            pass
        _mongo._client = None

    db = get_database()
    for coll in await db.list_collection_names():
        await db[coll].delete_many({})
    rate_limiter._mem.clear()
    yield


# ── HTTP client against ASGI app ──
@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
async def db():
    return get_database()


# ── User creation helper ──
async def _create_user(role: str, email: str) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    prefix = email.split("@")[0][:4].upper()
    doc = {
        "idNumber": f"ID-{prefix}",
        "fullName": f"Test {role.title()}",
        "email": email,
        "phone": "+254700000000",
        "location": "Nairobi",
        "school": "Test U",
        "fieldOfStudy": "CS",
        "courseOfStudy": "BSc",
        "password": _hash(),
        "role": role,
        "status": "active",
        "emailVerified": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(doc)
    # Return _id as string to match every API response shape (which
    # serializes ObjectId -> str). This makes fixtures interchangeable
    # with response.json()['_id'] values in tests.
    doc["_id"] = str(doc["_id"])
    return doc


@pytest.fixture
async def admin_user():
    return await _create_user("admin", "admin@example.com")


@pytest.fixture
async def staff_user():
    return await _create_user("staff", "staff@example.com")


@pytest.fixture
async def student_user():
    return await _create_user("student", "student@example.com")


async def _login(client: AsyncClient, email: str) -> None:
    r = await client.post(
        "/api/auth-login", json={"email": email, "password": "Passw0rd!"}
    )
    assert r.status_code == 200, r.text


# Each *_client fixture gets its OWN AsyncClient so cookie jars
# cannot leak between roles. (The previous design reused the shared
# `client` fixture and logged in each role sequentially — the last
# login won, so tests ran as the wrong role.)
def _new_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture
async def admin_client(admin_user):
    async with _new_client() as c:
        r = await c.post(
            "/api/auth-login",
            json={"email": "admin@example.com", "password": "Passw0rd!"},
        )
        assert r.status_code == 200, r.text
        yield c


@pytest.fixture
async def staff_client(staff_user):
    async with _new_client() as c:
        r = await c.post(
            "/api/auth-login",
            json={"email": "staff@example.com", "password": "Passw0rd!"},
        )
        assert r.status_code == 200, r.text
        yield c


@pytest.fixture
async def student_client(student_user):
    async with _new_client() as c:
        r = await c.post(
            "/api/auth-login",
            json={"email": "student@example.com", "password": "Passw0rd!"},
        )
        assert r.status_code == 200, r.text
        yield c


@pytest.fixture
async def sample_course(admin_client):
    r = await admin_client.post(
        "/api/course-create",
        json={
            "title": "Test Course",
            "description": "A test course for integration tests",
            "price": 1000,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()
