#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# HealthAI Coach — full stack launcher
#
# Runs, in order:
#   1. ETL pipeline       (python run_pipeline.py) -> produces mspr_etl.db
#   2. Django backend     (http://localhost:8000)  -> background
#   3. React frontend     (http://localhost:5173)  -> foreground
#
# On Ctrl+C, the backend is stopped cleanly.
#
# Usage:
#   ./run.sh                   # full run: pipeline + backend + frontend
#   ./run.sh --skip-pipeline   # skip the ETL step (DB must already exist)
#   ./run.sh --skip-backend    # only pipeline + frontend
#   ./run.sh --skip-frontend   # only pipeline + backend
#   ./run.sh --skip-install    # skip pip/npm install steps
#   ./run.sh --help
#
# Works on Linux, macOS, and Git Bash / WSL on Windows.
# ----------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Options --------------------------------------------------------------
SKIP_PIPELINE=0
SKIP_BACKEND=0
SKIP_FRONTEND=0
SKIP_INSTALL=0

for arg in "$@"; do
  case "$arg" in
    --skip-pipeline) SKIP_PIPELINE=1 ;;
    --skip-backend)  SKIP_BACKEND=1 ;;
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --skip-install)  SKIP_INSTALL=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# --- Helpers --------------------------------------------------------------
log()  { printf '\n\033[1;36m==> %s\033[0m\n'   "$*"; }
warn() { printf '\n\033[1;33m[warn] %s\033[0m\n' "$*"; }
err()  { printf '\n\033[1;31m[err]  %s\033[0m\n' "$*" >&2; }

BACKEND_PID=""
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

cleanup() {
  local code=$?
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "Stopping Django backend (pid $BACKEND_PID)"
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  exit "$code"
}
trap cleanup EXIT INT TERM

# --- Prerequisites --------------------------------------------------------
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  err "Python is not installed or not on PATH (need Python 3.12+)."
  exit 1
fi

if [ "$SKIP_FRONTEND" -eq 0 ] && ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed or not on PATH (install Node.js 22+)."
  exit 1
fi

# --- Environment variables (Django needs SECRET_KEY) ---------------------
if [ -f ".env" ]; then
  log "Loading environment from .env"
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [ -z "${SECRET_KEY:-}" ]; then
  warn "SECRET_KEY not set — generating a temporary development key"
  export SECRET_KEY="dev-$(date +%s)-$RANDOM-insecure-change-me"
fi
export DEBUG="${DEBUG:-True}"
export DB_PATH="${DB_PATH:-$SCRIPT_DIR/mspr_etl.db}"

# --- 1. Python virtual environment ---------------------------------------
if [ ! -d ".venv" ]; then
  log "Creating Python virtual environment in .venv"
  "$PYTHON_BIN" -m venv .venv
fi

if [ -f ".venv/Scripts/activate" ]; then
  # Windows / Git Bash layout
  # shellcheck disable=SC1091
  source ".venv/Scripts/activate"
elif [ -f ".venv/bin/activate" ]; then
  # Linux / macOS layout
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
else
  err "Could not find virtualenv activation script in .venv"
  exit 1
fi

# --- 2. Python dependencies ----------------------------------------------
if [ "$SKIP_INSTALL" -eq 0 ]; then
  log "Upgrading pip"
  pip install --quiet --upgrade pip

  log "Installing ETL dependencies (requirements.txt)"
  pip install --quiet -r requirements.txt

  if [ "$SKIP_BACKEND" -eq 0 ]; then
    log "Installing backend dependencies (backend/requirements.txt)"
    pip install --quiet -r backend/requirements.txt
  fi
fi

# --- 3. ETL pipeline ------------------------------------------------------
if [ "$SKIP_PIPELINE" -eq 0 ]; then
  log "Running ETL pipeline"
  python run_pipeline.py
else
  log "Skipping ETL pipeline (--skip-pipeline)"
fi

# --- 4. Backend (Django) --------------------------------------------------
if [ "$SKIP_BACKEND" -eq 0 ]; then
  log "Applying Django migrations"
  (cd backend && python manage.py migrate --noinput)

  log "Starting Django backend on http://localhost:8000 (logs: logs/backend.log)"
  (
    cd backend
    exec python manage.py runserver 0.0.0.0:8000 --noreload
  ) >"$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!

  # Wait a few seconds for Django to bind the port.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      err "Backend failed to start — see logs/backend.log"
      tail -n 40 "$LOG_DIR/backend.log" >&2 || true
      exit 1
    fi
    sleep 1
  done
  log "Backend is up (pid $BACKEND_PID)"
else
  log "Skipping Django backend (--skip-backend)"
fi

# --- 5. Frontend (Vite) ---------------------------------------------------
if [ "$SKIP_FRONTEND" -eq 0 ]; then
  cd "$SCRIPT_DIR/frontend"

  if [ "$SKIP_INSTALL" -eq 0 ] && [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies (npm install)"
    npm install
  fi

  log "Starting frontend on http://localhost:5173 (Ctrl+C to stop everything)"
  # Run in foreground; trap will clean the backend up on exit.
  npm run dev
else
  log "Skipping frontend (--skip-frontend)"
  if [ -n "$BACKEND_PID" ]; then
    log "Backend running in foreground (pid $BACKEND_PID). Ctrl+C to stop."
    wait "$BACKEND_PID"
  fi
fi
