#!/usr/bin/env bash
# Start FastAPI backend (port 8000) + Next.js frontend (port 3000).
# Next.js proxies /api/* to FastAPI via rewrites in next.config.js.
set -e
cd "$(dirname "$0")"

echo "→ Starting FastAPI backend on :8000..."
(cd backend && exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
BACK_PID=$!

echo "→ Starting Next.js frontend on :3000..."
(cd _legacy_nextjs && npm run dev) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null; exit" INT TERM
wait
