#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Run the full test suite (ETL unit tests + Django API tests) under coverage
# and print a combined report.
#
# Usage:
#   ./run_coverage.sh
#   ./run_coverage.sh --html    # also generate htmlcov/
# ----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WITH_HTML=0
for arg in "$@"; do
  case "$arg" in
    --html) WITH_HTML=1 ;;
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

# --- Pick a Python interpreter -------------------------------------------
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python is not installed or not on PATH (need Python 3.12+)." >&2
  exit 1
fi

# --- Virtualenv ----------------------------------------------------------
if [ ! -d ".venv" ]; then
  echo "==> Creating Python virtual environment in .venv"
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
  echo "Could not find virtualenv activation script in .venv" >&2
  exit 1
fi

# --- Ensure coverage + project deps are installed ------------------------
if ! python -m coverage --version >/dev/null 2>&1; then
  echo "==> Installing coverage"
  pip install --quiet --upgrade pip
  pip install --quiet coverage
fi

# Make sure ETL + backend deps are available (cheap no-op if already installed)
pip install --quiet -r requirements.txt
pip install --quiet -r backend/requirements.txt

# --- Environment for Django tests ----------------------------------------
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi
if [ -z "${SECRET_KEY:-}" ]; then
  export SECRET_KEY="dev-test-$(date +%s)-$RANDOM-insecure"
fi
export DEBUG="${DEBUG:-True}"
export DB_PATH="${DB_PATH:-$SCRIPT_DIR/mspr_etl.db}"

# --- Run coverage --------------------------------------------------------
python -m coverage erase

echo "==> ETL / unit tests"
python -m coverage run -m unittest discover -s tests -v

echo "==> Django API tests"
(
  cd backend
  python -m coverage run --append manage.py test -v 2
)

echo "==> Coverage report"
python -m coverage report

if [ "$WITH_HTML" -eq 1 ]; then
  python -m coverage html
  echo "HTML report written to htmlcov/index.html"
fi
