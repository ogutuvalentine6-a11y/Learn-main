#!/usr/bin/env bash
# Start FastAPI backend (port 8000) + Next.js frontend (port 3000).
# Activates venv if not already active, waits for backend before starting frontend.
set -e
cd "$(dirname "$0")"

# Activate venv if not already active
if [ -z "${VIRTUAL_ENV:-}" ]; then
  if [ -d "venv" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
  else
    echo "ERROR: venv/ missing and no VIRTUAL_ENV active" >&2
    exit 1
  fi
fi

# Start backend
echo "→ Starting FastAPI backend on :8000..."
(cd backend && exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
BACK_PID=$!

# Wait for backend readiness — fail loudly if it dies
echo "→ Waiting for backend..."
READY=0
for i in $(seq 1 30); do
  if curl -sf -o /dev/null -m 1 "http://127.0.0.1:8000/docs" 2>/dev/null; then
    READY=1
    break
  fi
  if ! kill -0 "$BACK_PID" 2>/dev/null; then
    echo "ERROR: backend died during startup" >&2
    exit 1
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "ERROR: backend did not become ready in 30s" >&2
  kill "$BACK_PID" 2>/dev/null || true
  exit 1
fi
echo "✓ Backend ready"

# Start frontend
echo "→ Starting Next.js frontend on :3000..."
(cd _legacy_nextjs && npm run dev) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null; exit" INT TERM
wait
