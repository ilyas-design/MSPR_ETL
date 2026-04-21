#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# HealthAI Coach — Docker launcher
#
# Wrapper autour de docker compose qui s'occupe de :
#   - générer un SECRET_KEY Django sécurisé si absent (via .env)
#   - proposer les commandes courantes (up / down / logs / rebuild / etc.)
#
# La stack se compose de 3 services (cf. docker-compose.yml) :
#   - etl       : exécute `run_pipeline.py` une fois, remplit /data/mspr_etl.db
#                 (volume partagé `sqlite_data`) puis s'arrête (service one-shot).
#   - backend   : Django + DRF exposé sur le port 8000 (port interne).
#   - frontend  : nginx servant le build Vite et reverse-proxy /api -> backend.
#                 Publié sur http://localhost:80.
#
# Usage :
#   ./docker-run.sh up              # build + up -d + suit les logs du frontend
#   ./docker-run.sh up --no-follow  # build + up -d sans suivre les logs
#   ./docker-run.sh build           # reconstruit toutes les images sans cache
#   ./docker-run.sh down            # stoppe les conteneurs (garde le volume)
#   ./docker-run.sh reset           # stoppe + supprime le volume SQLite (reset)
#   ./docker-run.sh logs [service]  # suit les logs (défaut : tous les services)
#   ./docker-run.sh ps              # état des conteneurs
#   ./docker-run.sh etl             # ré-exécute uniquement le pipeline ETL
#   ./docker-run.sh shell <service> # ouvre un shell interactif
#   ./docker-run.sh --help
#
# Fonctionne sous Linux, macOS, et Git Bash / WSL sous Windows.
# ----------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log()  { printf '\n\033[1;36m==> %s\033[0m\n'   "$*"; }
warn() { printf '\n\033[1;33m[warn] %s\033[0m\n' "$*"; }
err()  { printf '\n\033[1;31m[err]  %s\033[0m\n' "$*" >&2; }

# --- Sélection du binaire docker compose (v2 intégré OU v1 legacy) ---------
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  err "Docker Compose n'est pas installé. Installez Docker Desktop ou le plugin compose."
  exit 1
fi

# --- Préparation du fichier .env (SECRET_KEY Django) -----------------------
ensure_env_file() {
  local env_file="$SCRIPT_DIR/.env"
  if [ -f "$env_file" ] && grep -q '^SECRET_KEY=' "$env_file"; then
    return 0
  fi

  log "Génération d'un fichier .env avec un SECRET_KEY Django sécurisé"
  local key=""

  # 1) openssl : universellement disponible avec Git Bash, macOS, Linux.
  if command -v openssl >/dev/null 2>&1; then
    key=$(openssl rand -base64 64 | tr -d '\n' | tr -d '=' | tr '+/' '-_')
  fi

  # 2) Fallback Python — on teste que l'exécutable fonctionne vraiment,
  #    pour éviter le stub Microsoft Store sur Windows (qui répond OK à
  #    `command -v python3` mais lance l'installeur à la première exécution).
  if [ -z "$key" ]; then
    for candidate in python3 python py; do
      if command -v "$candidate" >/dev/null 2>&1 \
         && "$candidate" -c 'import sys' >/dev/null 2>&1; then
        key=$("$candidate" -c 'import secrets; print(secrets.token_urlsafe(64))' 2>/dev/null || true)
        if [ -n "$key" ]; then break; fi
      fi
    done
  fi

  # 3) Dernier recours : /dev/urandom via base64.
  if [ -z "$key" ] && [ -r /dev/urandom ]; then
    key=$(head -c 64 /dev/urandom | base64 | tr -d '\n' | tr -d '=' | tr '+/' '-_')
  fi

  # 4) Fallback non cryptographique — toujours produire quelque chose.
  if [ -z "$key" ]; then
    key="dev-$(date +%s)-$RANDOM-$RANDOM-change-me-in-production"
    warn "Aucun générateur aléatoire disponible : clé de dev non-cryptographique."
  fi

  touch "$env_file"
  if ! grep -q '^SECRET_KEY=' "$env_file"; then
    printf 'SECRET_KEY=%s\n' "$key" >>"$env_file"
  fi
  if ! grep -q '^DEBUG=' "$env_file"; then
    printf 'DEBUG=False\n' >>"$env_file"
  fi
  log ".env prêt (SECRET_KEY généré, DEBUG=False)"
}

# --- Sous-commandes --------------------------------------------------------
cmd_up() {
  ensure_env_file
  log "Build des images Docker"
  "${DC[@]}" build
  log "Démarrage de la stack (etl → backend → frontend)"
  "${DC[@]}" up -d
  log "Stack lancée. Frontend : http://localhost:80"
  "${DC[@]}" ps

  if [ "${1:-}" != "--no-follow" ]; then
    log "Logs du frontend (Ctrl+C pour sortir, les conteneurs continuent)"
    "${DC[@]}" logs -f frontend || true
  fi
}

cmd_down() {
  log "Arrêt des conteneurs (volume SQLite conservé)"
  "${DC[@]}" down
}

cmd_reset() {
  warn "Suppression des conteneurs ET du volume SQLite (reset complet)"
  "${DC[@]}" down -v
}

cmd_build() {
  log "Reconstruction complète des images (sans cache)"
  "${DC[@]}" build --no-cache
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    "${DC[@]}" logs -f "$service"
  else
    "${DC[@]}" logs -f
  fi
}

cmd_ps() {
  "${DC[@]}" ps
}

cmd_etl() {
  ensure_env_file
  log "Ré-exécution du pipeline ETL uniquement"
  "${DC[@]}" run --rm etl
}

cmd_shell() {
  local service="${1:-backend}"
  log "Ouverture d'un shell dans le conteneur '$service'"
  "${DC[@]}" exec "$service" /bin/sh
}

cmd_help() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//'
}

# --- Dispatch --------------------------------------------------------------
case "${1:-up}" in
  up)     shift || true; cmd_up "$@" ;;
  down)   cmd_down ;;
  reset)  cmd_reset ;;
  build)  cmd_build ;;
  logs)   shift || true; cmd_logs "$@" ;;
  ps|status) cmd_ps ;;
  etl|pipeline) cmd_etl ;;
  shell)  shift || true; cmd_shell "$@" ;;
  -h|--help|help) cmd_help ;;
  *)
    err "Sous-commande inconnue : $1"
    cmd_help
    exit 1
    ;;
esac
