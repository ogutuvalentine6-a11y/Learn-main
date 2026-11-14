# Learn Platform — Deployment Checklist

## Pre-deployment

- [ ] `git tag` shows `phase-4-complete` and all 7 phase commits
- [ ] `python backend/scripts_init_indexes.py` runs clean
- [ ] All unique indexes exist (script output shows `✅`)
- [ ] `backend/.env` has real values:
  - `MONGODB_URI` (production DB, not localhost)
  - `JWT_SECRET` (64+ char random; `openssl rand -hex 32`)
  - `PAYSTACK_SECRET_KEY` (sk_live_*)
  - `CLOUDINARY_*` (production cloud)
  - `RESEND_API_KEY` + verified sender domain
  - `FRONTEND_URL` (production domain, https)
  - `REDIS_URL` (production Redis for shared rate limits)
- [ ] `_legacy_nextjs/.env.local` has `NEXT_PUBLIC_APP_URL` (production URL)
- [ ] Cloudinary `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` set for browser uploads
- [ ] Backend never logs secrets (`grep -r "print.*SECRET\|print.*password" backend/app`)
- [ ] `_legacy_nextjs/next.config.js` rewrites point to production backend

## Backend deploy

- [ ] `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`
- [ ] Behind nginx/Caddy for TLS termination
- [ ] `Strict-Transport-Security` header uncommented in `app/core/middleware.py`
- [ ] HTTPS only — cookies set `secure=True` in `auth.py:_set_auth_cookie`
- [ ] `FRONTEND_URL` env var set to production domain (CORS)
- [ ] MongoDB Atlas IP allowlist includes the server IP
- [ ] Redis reachable at `REDIS_URL` (rate limits shared across workers)
- [ ] File system: no `.env` in the container image

## Frontend deploy

- [ ] `npm run build && npm run start` (or `vercel deploy`)
- [ ] Rewrites hit the production backend URL
- [ ] `NEXT_PUBLIC_APP_URL` points to production
- [ ] Browser tests pass in production domain

## Smoke tests post-deploy

- [ ] `curl https://your-api/health` → `{"status":"ok"}`
- [ ] `curl -I https://your-api/health` → all security headers present
- [ ] Register a test user via `/register`
- [ ] Login → cookie set → dashboard loads
- [ ] Admin dashboard shows real counts
- [ ] Homepage loads real courses + founder section
- [ ] One full payment flow (Paystack test mode)
- [ ] One live session join
- [ ] One resource upload
- [ ] CSV export downloads

## Rollback plan

- [ ] Backup MongoDB: `mongodump --uri="$MONGODB_URI" --out=./backup`
- [ ] Previous Docker image / deployment kept available
- [ ] `git tag` gives every phase as a rollback point:
  - `phase-4-complete` = migration baseline
  - Each phase commit = incremental rollback

## Monitoring

- [ ] Backend error logs → aggregated (Sentry, Loki, or similar)
- [ ] Uptime monitor on `/health` (UptimeRobot free tier is fine)
- [ ] `logs` collection growing — set a TTL or archival job (Phase 8.1)
- [ ] Analytics overview page hit at least weekly

## Known limitations (deferred to Phase 8.1+)

- No automated test suite (manual curl only) — **add pytest before scaling users**
- Analytics N+1 on `/api/analytics/courses` — fine <100 courses
- No CSRF token (mitigated by SameSite=lax + JSON-only APIs)
- No password reset flow
- No email verification enforcement (field exists, not enforced)
- No certificate generation endpoint (`Certificate` model exists, no route)
- No data retention policy on `logs`
- `meet.jit.si` free tier has 5-min limit until 2nd participant
