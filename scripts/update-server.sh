#!/bin/sh
# Deploys the latest `main` on the home server (compose.server.yml), with Docker or Podman.
#
#   scripts/update-server.sh           deploy only when origin/main has commits this checkout does not
#   scripts/update-server.sh --force   rebuild and restart anyway (first install, or to retry a failed deploy)
#
# Steps: fetch main, back up the database, fast-forward the checkout, rebuild and restart the stack,
# wait until /api/health answers. If the build fails, the running containers are left untouched.
# deploy/systemd/canhoes-update.timer runs it every 5 minutes; the output goes to the journal.
# Setup guide: docs/09-deploy.md.
set -eu

cd "$(dirname "$0")/.."

ENV_FILE=.env.server
PROJECT=canhoes-server
POSTGRES_CONTAINER=canhoes-server-postgres
BACKUP_DIR=backups
BACKUPS_TO_KEEP=20
LOCAL_HEALTH_URL=http://127.0.0.1:3100/api/health
HEALTH_ATTEMPTS=90 # two seconds apart: migrations and the seed run before the server answers

engine=${CONTAINER_ENGINE:-$(command -v docker > /dev/null 2>&1 && echo docker || echo podman)}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  log "ERROR: $*" >&2
  exit 1
}

compose() {
  "$engine" compose -p "$PROJECT" -f compose.server.yml --env-file "$ENV_FILE" "$@"
}

# Last value of KEY in the env file, without surrounding quotes.
env_value() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed 's/^["'\'']//; s/["'\'']$//'
}

check_env_file() {
  [ -f "$ENV_FILE" ] || fail "$ENV_FILE is missing: copy .env.server.example and fill it in."
  for key in POSTGRES_PASSWORD NEXTAUTH_URL NEXTAUTH_SECRET CLOUDFLARE_TUNNEL_TOKEN; do
    [ -n "$(env_value "$key")" ] || fail "$key is empty in $ENV_FILE."
  done
}

is_postgres_running() {
  [ "$("$engine" inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER" 2> /dev/null)" = "true" ]
}

# pg_dump before every deploy, because a new version can bring migrations. Keeps the newest few.
backup_database() {
  if ! is_postgres_running; then
    log "No running database yet, skipping the backup."
    return
  fi
  mkdir -p "$BACKUP_DIR"
  backup_file="$BACKUP_DIR/canhoes-server-$(date '+%Y%m%d-%H%M%S').dump"
  "$engine" exec "$POSTGRES_CONTAINER" pg_dump -U canhoes -d canhoes -Fc > "$backup_file" \
    || fail "pg_dump failed; nothing was deployed."
  log "Database backed up to $backup_file."

  # The timestamped names sort oldest first, so drop from the front until only the newest are left.
  set -- "$BACKUP_DIR"/canhoes-server-*.dump
  while [ "$#" -gt "$BACKUPS_TO_KEEP" ]; do
    rm -- "$1"
    shift
  done
}

wait_until_healthy() {
  attempt=1
  while [ "$attempt" -le "$HEALTH_ATTEMPTS" ]; do
    if curl -fsS -o /dev/null "$LOCAL_HEALTH_URL"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  return 1
}

# Only a warning: the PC may be fine while DNS or the tunnel are still being set up.
check_public_url() {
  public_url=$(env_value NEXTAUTH_URL)
  if curl -fsS -o /dev/null --max-time 15 "$public_url/api/health"; then
    log "Public site is up: $public_url"
  else
    log "WARNING: $public_url does not answer yet. Check the tunnel with: $engine logs canhoes-server-tunnel"
  fi
}

main() {
  check_env_file

  # A second run while one is still building exits instead of building twice.
  if command -v flock > /dev/null 2>&1; then
    exec 9> .update-server.lock
    flock -n 9 || { log "Another update is running."; exit 0; }
  fi

  git fetch --quiet origin main
  current_commit=$(git rev-parse HEAD)
  target_commit=$(git rev-parse origin/main)
  if [ "$current_commit" = "$target_commit" ] && [ "${1:-}" != "--force" ]; then
    exit 0
  fi

  log "Deploying $(git log -1 --format='%h %s' "$target_commit")"
  backup_database
  git merge --quiet --ff-only origin/main \
    || fail "Cannot fast-forward to origin/main: this checkout has local changes or commits."

  # Builds first, so a failed build leaves the running containers as they were. --force-recreate makes
  # podman-compose replace containers that already exist (Docker would do it on its own).
  compose up -d --build --force-recreate || fail "Build or start failed; the previous version keeps running."

  if ! wait_until_healthy; then
    compose logs --tail 80 web >&2 || true
    fail "The app did not become healthy at $LOCAL_HEALTH_URL."
  fi
  log "App is healthy on this machine."
  check_public_url
}

main "$@"
