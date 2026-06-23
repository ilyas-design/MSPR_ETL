#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Run the full test suite (ETL, Django, nutrition-api, reco-engine, frontend-user)
# under coverage and print combined Python report + frontend summary.
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
  # shellcheck disable=SC1091
  source ".venv/Scripts/activate"
elif [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
else
  echo "Could not find virtualenv activation script in .venv" >&2
  exit 1
fi

# --- Ensure coverage + project deps are installed ------------------------
if ! python -m coverage --version >/dev/null 2>&1; then
  echo "==> Installing coverage"
  python -m pip install --quiet --upgrade pip
  python -m pip install --quiet coverage
fi

python -m pip install --quiet -r etl/requirements.txt
python -m pip install --quiet -r services/backend/requirements.txt
python -m pip install --quiet -r services/nutrition-api/requirements.txt
python -m pip install --quiet -r services/reco-engine/requirements.txt

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
export POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_DB="${POSTGRES_DB:-healthai}"
export POSTGRES_USER="${POSTGRES_USER:-healthai}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-healthai}"

# --- Run coverage --------------------------------------------------------
python -m coverage erase

echo "==> ETL / unit tests"
PYTHONPATH=etl python -m coverage run --rcfile=.coveragerc -m unittest discover -s etl/tests -v

echo "==> Django API tests"
(
  cd services/backend
  python -m coverage run --append --rcfile=../../.coveragerc manage.py test -v 2
)

echo "==> nutrition-api tests"
(
  cd services/nutrition-api
  python -m coverage run --append --rcfile=../../.coveragerc --source=app -m pytest -v
)

echo "==> reco-engine tests"
(
  cd services/reco-engine
  python -m coverage run --append --rcfile=../../.coveragerc --source=scoring,main,mongo,seed,llm,models -m pytest -v
)

echo "==> Combined Python coverage report"
python -m coverage report --rcfile=.coveragerc

if [ "$WITH_HTML" -eq 1 ]; then
  python -m coverage html --rcfile=.coveragerc
  echo "HTML report written to htmlcov/index.html"
fi

echo "==> frontend-user tests (Vitest)"
(
  cd apps/frontend-user
  if [ ! -d node_modules ]; then
    npm install
  fi
  npm run test:coverage
)

echo "==> Done"
