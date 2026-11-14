import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.db.mongodb import get_database
from app.dependencies import require_role
from app.models.user import UserInDB

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _sum_payments(db, extra: Optional[dict] = None) -> tuple[float, int]:
    match: dict = {"status": "success"}
    if extra:
        match.update(extra)
    pipe = [
        {"$match": match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    async for doc in db.payments.aggregate(pipe):
        return float(doc.get("total", 0)), int(doc.get("count", 0))
    return 0.0, 0


# ── ADMIN: platform overview ────────────────────────────────────
@router.get("/overview")
async def overview(_: UserInDB = Depends(require_role("admin"))):
    db = get_database()
    now = _utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_users = await db.users.count_documents({})
    students = await db.users.count_documents({"role": "student"})
    staff = await db.users.count_documents({"role": "staff"})
    admins = await db.users.count_documents({"role": "admin"})
    blocked = await db.users.count_documents({"status": "blocked"})
    new_week = await db.users.count_documents({"createdAt": {"$gte": week_ago}})

    active_courses = await db.courses.count_documents({"isActive": True})
    inactive_courses = await db.courses.count_documents({"isActive": False})

    total_enroll = await db.enrollments.count_documents({})
    paid_enroll = await db.enrollments.count_documents({"paymentStatus": "paid"})
    pending_enroll = await db.enrollments.count_documents({"paymentStatus": "pending"})

    rev_total, rev_count = await _sum_payments(db)
    rev_month, rev_month_count = await _sum_payments(db, {"verifiedAt": {"$gte": month_start}})

    total_progress = await db.progresses.count_documents({})
    passed_progress = await db.progresses.count_documents({"status": "passed"})
    completion_rate = (passed_progress / total_progress * 100) if total_progress else 0

    total_live = await db.live_sessions.count_documents({})
    upcoming_live = await db.live_sessions.count_documents({
        "status": "scheduled", "scheduledAt": {"$gte": now},
    })

    pending_resources = await db.resources.count_documents({"status": "pending"})
    pending_reels = await db.reels.count_documents({"status": "pending"})

    approved_reels = await db.reels.count_documents({"status": "approved"})
    reels_views = 0
    reels_likes = 0
    async for doc in db.reels.aggregate([
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "v": {"$sum": "$views"}, "l": {"$sum": "$likes"}}},
    ]):
        reels_views = int(doc.get("v", 0))
        reels_likes = int(doc.get("l", 0))

    total_threads = await db.threads.count_documents({})
    total_groups = await db.study_groups.count_documents({})

    return {
        "users": {
            "total": total_users, "students": students, "staff": staff,
            "admins": admins, "blocked": blocked, "newThisWeek": new_week,
        },
        "courses": {"active": active_courses, "inactive": inactive_courses},
        "enrollments": {"total": total_enroll, "paid": paid_enroll, "pending": pending_enroll},
        "revenue": {
            "total": rev_total, "count": rev_count,
            "monthTotal": rev_month, "monthCount": rev_month_count,
        },
        "progress": {
            "total": total_progress, "passed": passed_progress,
            "completionRate": round(completion_rate, 1),
        },
        "live": {"total": total_live, "upcoming": upcoming_live},
        "moderation": {"pendingResources": pending_resources, "pendingReels": pending_reels},
        "reels": {"total": approved_reels, "views": reels_views, "likes": reels_likes},
        "community": {"threads": total_threads, "studyGroups": total_groups},
    }


# ── ADMIN: per-course breakdown ─────────────────────────────────
@router.get("/courses")
async def course_breakdown(_: UserInDB = Depends(require_role("admin"))):
    db = get_database()
    out = []
    async for c in db.courses.find({}).sort("createdAt", -1):
        cid = c["_id"]
        enrolled = await db.enrollments.count_documents({"courseId": cid, "paymentStatus": "paid"})
        total_enr = await db.enrollments.count_documents({"courseId": cid})
        revenue = 0.0
        async for p in db.payments.aggregate([
            {"$match": {"courseId": cid, "status": "success"}},
            {"$group": {"_id": None, "t": {"$sum": "$amount"}}},
        ]):
            revenue = float(p.get("t", 0))
        progress_total = await db.progresses.count_documents({"courseId": cid})
        progress_passed = await db.progresses.count_documents({"courseId": cid, "status": "passed"})
        sessions = await db.sessions.count_documents({"courseId": cid})

        out.append({
            "id": str(cid),
            "title": c.get("title", ""),
            "isActive": c.get("isActive", True),
            "price": c.get("price", 0),
            "enrollmentsPaid": enrolled,
            "enrollmentsTotal": total_enr,
            "revenue": revenue,
            "sessions": sessions,
            "progressTotal": progress_total,
            "progressPassed": progress_passed,
            "completionRate": round(progress_passed / progress_total * 100, 1) if progress_total else 0,
        })
    return out


# ── ADMIN: recent activity ──────────────────────────────────────
@router.get("/recent")
async def recent_activity(_: UserInDB = Depends(require_role("admin"))):
    db = get_database()
    recent_users = []
    async for u in db.users.find({}).sort("createdAt", -1).limit(10):
        recent_users.append({
            "id": str(u["_id"]),
            "fullName": u.get("fullName", ""),
            "email": u.get("email", ""),
            "role": u.get("role", ""),
            "createdAt": u.get("createdAt"),
        })
    recent_payments = []
    async for p in db.payments.find({"status": "success"}).sort("verifiedAt", -1).limit(10):
        recent_payments.append({
            "id": str(p["_id"]),
            "amount": p.get("amount", 0),
            "reference": p.get("reference", ""),
            "courseId": str(p.get("courseId", "")),
            "verifiedAt": p.get("verifiedAt"),
        })
    return {"recentUsers": recent_users, "recentPayments": recent_payments}


# ── STUDENT: own analytics + dashboard payload ──────────────────
@router.get("/student")
async def student_analytics(auth: UserInDB = Depends(require_role("student"))):
    db = get_database()
    uid = ObjectId(auth.id)
    now = _utcnow()

    enrollments = []
    enrolled_oids = []
    async for e in db.enrollments.find({"studentId": uid}):
        cid = e.get("courseId")
        if cid:
            enrolled_oids.append(cid)
        course = await db.courses.find_one({"_id": cid})
        progress_total = await db.progresses.count_documents({"studentId": uid, "courseId": cid})
        progress_passed = await db.progresses.count_documents({
            "studentId": uid, "courseId": cid, "status": "passed",
        })
        sessions_total = await db.sessions.count_documents({"courseId": cid})
        scores = []
        async for p in db.progresses.find({"studentId": uid, "courseId": cid, "score": {"$ne": None}}):
            scores.append(p.get("score", 0))
        avg_score = round(sum(scores) / len(scores), 1) if scores else None
        enrollments.append({
            "courseId": str(cid) if cid else "",
            "courseTitle": course.get("title", "—") if course else "—",
            "paymentStatus": e.get("paymentStatus", ""),
            "currentSessionOrder": e.get("currentSessionOrder", 1),
            "sessionsTotal": sessions_total,
            "progressPassed": progress_passed,
            "progressTotal": progress_total,
            "percent": round(progress_passed / sessions_total * 100, 1) if sessions_total else 0,
            "averageScore": avg_score,
        })

    total_paid = sum(1 for e in enrollments if e["paymentStatus"] == "paid")
    total_completed = sum(1 for e in enrollments if e["percent"] >= 100)
    all_scores = [e["averageScore"] for e in enrollments if e["averageScore"] is not None]
    overall_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else None

    payments = []
    async for p in db.payments.find({"studentId": uid}).sort("createdAt", -1).limit(10):
        payments.append({
            "reference": p.get("reference", ""),
            "amount": p.get("amount", 0),
            "status": p.get("status", ""),
            "createdAt": p.get("createdAt"),
        })

    # Upcoming live sessions in enrolled courses
    upcoming_live = []
    if enrolled_oids:
        async for s in db.live_sessions.find({
            "courseId": {"$in": [str(c) for c in enrolled_oids]},
            "status": "scheduled",
            "scheduledAt": {"$gte": now},
        }).sort("scheduledAt", 1).limit(5):
            course = await db.courses.find_one({"_id": ObjectId(s["courseId"])}) if s.get("courseId") else None
            upcoming_live.append({
                "id": str(s["_id"]),
                "title": s.get("title", ""),
                "hostName": s.get("hostName", ""),
                "scheduledAt": s.get("scheduledAt"),
                "durationMinutes": s.get("durationMinutes", 60),
                "courseTitle": course.get("title", "") if course else "",
            })

    # Pending work (in_progress or awaiting_review)
    pending_work = []
    async for p in db.progresses.find({
        "studentId": uid,
        "status": {"$in": ["in_progress", "awaiting_review"]},
    }).sort("updatedAt", -1).limit(10):
        session = await db.sessions.find_one({"_id": p["sessionId"]})
        course = await db.courses.find_one({"_id": p["courseId"]})
        pending_work.append({
            "progressId": str(p["_id"]),
            "status": p.get("status", ""),
            "sessionTitle": session.get("title", "") if session else "",
            "courseTitle": course.get("title", "") if course else "",
            "sessionId": str(p["sessionId"]),
            "uploadUrl": p.get("uploadUrl"),
        })

    # Recent scores (passed/failed quiz results)
    recent_scores = []
    async for p in db.progresses.find({
        "studentId": uid,
        "score": {"$ne": None},
    }).sort("submittedAt", -1).limit(10):
        session = await db.sessions.find_one({"_id": p["sessionId"]})
        recent_scores.append({
            "progressId": str(p["_id"]),
            "score": p.get("score", 0),
            "status": p.get("status", ""),
            "sessionTitle": session.get("title", "") if session else "",
            "submittedAt": p.get("submittedAt"),
        })

    return {
        "summary": {
            "enrollmentsTotal": len(enrollments),
            "enrollmentsPaid": total_paid,
            "coursesCompleted": total_completed,
            "averageScore": overall_avg,
        },
        "enrollments": enrollments,
        "payments": payments,
        "upcomingLive": upcoming_live,
        "pendingWork": pending_work,
        "recentScores": recent_scores,
    }


# ── STAFF: own-course metrics + dashboard payload ───────────────
@router.get("/staff")
async def staff_analytics(auth: UserInDB = Depends(require_role("staff"))):
    db = get_database()
    uid = ObjectId(auth.id)
    now = _utcnow()

    assigned_ids = []
    async for a in db.staffassignments.find({"staffId": uid}):
        assigned_ids.append(a["courseId"])

    courses = []
    total_students = 0
    total_pending_review = 0
    total_live_upcoming = 0
    for cid in assigned_ids:
        course = await db.courses.find_one({"_id": cid})
        if not course:
            continue
        paid = await db.enrollments.count_documents({"courseId": cid, "paymentStatus": "paid"})
        awaiting = await db.progresses.count_documents({
            "courseId": cid, "status": "awaiting_review",
        })
        passed = await db.progresses.count_documents({"courseId": cid, "status": "passed"})
        failed = await db.progresses.count_documents({"courseId": cid, "status": "failed"})
        sessions = await db.sessions.count_documents({"courseId": cid})
        live_total = await db.live_sessions.count_documents({
            "courseId": str(cid), "hostId": uid,
        })
        live_upcoming = await db.live_sessions.count_documents({
            "courseId": str(cid), "hostId": uid,
            "status": "scheduled", "scheduledAt": {"$gte": now},
        })
        total_students += paid
        total_pending_review += awaiting
        total_live_upcoming += live_upcoming
        courses.append({
            "courseId": str(cid),
            "title": course.get("title", "—"),
            "paidStudents": paid,
            "awaitingReview": awaiting,
            "passed": passed,
            "failed": failed,
            "sessions": sessions,
            "liveSessions": live_total,
            "liveUpcoming": live_upcoming,
        })

    # Pending submissions in assigned courses
    pending_submissions = []
    if assigned_ids:
        async for p in db.progresses.find({
            "courseId": {"$in": assigned_ids},
            "status": "awaiting_review",
        }).sort("submittedAt", -1).limit(10):
            student = await db.users.find_one({"_id": p["studentId"]}, {"fullName": 1, "email": 1})
            session = await db.sessions.find_one({"_id": p["sessionId"]})
            course = await db.courses.find_one({"_id": p["courseId"]})
            pending_submissions.append({
                "progressId": str(p["_id"]),
                "studentName": student.get("fullName", "—") if student else "—",
                "studentEmail": student.get("email", "") if student else "",
                "sessionTitle": session.get("title", "") if session else "",
                "courseTitle": course.get("title", "") if course else "",
                "uploadUrl": p.get("uploadUrl"),
                "submittedAt": p.get("submittedAt"),
            })

    # Upcoming live sessions hosted by this staff
    upcoming_live = []
    async for s in db.live_sessions.find({
        "hostId": uid,
        "status": "scheduled",
        "scheduledAt": {"$gte": now},
    }).sort("scheduledAt", 1).limit(5):
        course_title = ""
        if s.get("courseId"):
            course = await db.courses.find_one({"_id": ObjectId(s["courseId"])})
            if course:
                course_title = course.get("title", "")
        upcoming_live.append({
            "id": str(s["_id"]),
            "title": s.get("title", ""),
            "scheduledAt": s.get("scheduledAt"),
            "durationMinutes": s.get("durationMinutes", 60),
            "courseTitle": course_title,
        })

    return {
        "summary": {
            "coursesAssigned": len(assigned_ids),
            "totalPaidStudents": total_students,
            "pendingReviews": total_pending_review,
            "upcomingLive": total_live_upcoming,
        },
        "courses": courses,
        "pendingSubmissions": pending_submissions,
        "upcomingLive": upcoming_live,
    }


# ── CSV export (admin) ──────────────────────────────────────────
@router.get("/export/{kind}")
async def export_csv(kind: str, _: UserInDB = Depends(require_role("admin"))):
    if kind not in ("users", "payments", "enrollments"):
        raise HTTPException(400, detail="Unknown export. Use users|payments|enrollments")

    db = get_database()
    buf = io.StringIO()
    w = csv.writer(buf)

    if kind == "users":
        w.writerow(["id", "fullName", "email", "idNumber", "role", "status", "createdAt"])
        async for u in db.users.find({}):
            w.writerow([
                str(u["_id"]), u.get("fullName", ""), u.get("email", ""),
                u.get("idNumber", ""), u.get("role", ""), u.get("status", ""),
                str(u.get("createdAt", "")),
            ])
    elif kind == "payments":
        w.writerow(["id", "studentId", "courseId", "amount", "reference", "status", "verifiedAt", "createdAt"])
        async for p in db.payments.find({}).sort("createdAt", -1):
            w.writerow([
                str(p["_id"]), str(p.get("studentId", "")), str(p.get("courseId", "")),
                p.get("amount", 0), p.get("reference", ""), p.get("status", ""),
                str(p.get("verifiedAt", "")), str(p.get("createdAt", "")),
            ])
    elif kind == "enrollments":
        w.writerow(["id", "studentId", "courseId", "paymentStatus", "currentSessionOrder", "completedAt", "createdAt"])
        async for e in db.enrollments.find({}).sort("createdAt", -1):
            w.writerow([
                str(e["_id"]), str(e.get("studentId", "")), str(e.get("courseId", "")),
                e.get("paymentStatus", ""), e.get("currentSessionOrder", 1),
                str(e.get("completedAt", "")), str(e.get("createdAt", "")),
            ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=learn_{kind}.csv"},
    )
