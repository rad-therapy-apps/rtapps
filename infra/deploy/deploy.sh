#!/usr/bin/env bash
# Usage: deploy.sh IMAGE_TAG — pull images, migrate, restart, health-check, roll back on failure.
# What this file does: pulls the given image tag, runs the Alembic migration one-shot, restarts
#   the compose stack, and — if anything after the pull fails — rolls back to the previously
#   deployed tag recorded in `.deployed`.
# Used here and why: runs on the VM itself (not in CI) because it needs the real compose project
#   state (`.deployed`) and the VM's own `.env`; deploy.yml SSHes in and invokes this with the new
#   tag as $1. `set -euo pipefail` so any failed step (pull, migrate, up) hits the rollback branch
#   instead of leaving a half-deployed stack running.
# How it fits the project: docs/adr/0005-single-vm-docker-compose-deployment.md ("Migrations" and
#   "Deploy" bullets) — migrate before `up -d`, never on container start; on failure, restart the
#   previous sha rather than leave the new (broken) containers up.
# Depends on: docker compose v2, /opt/rtapps/{compose.prod.yaml,compose.tunnel.yaml} and a
#   populated .env (infra/prod.env.example is the template; USE_TUNNEL selects the tunnel
#   overlay).
# Used by: .github/workflows/deploy.yml's "Deploy" step, over SSH.
set -euo pipefail
TAG="$1"
cd /opt/rtapps
set -a; . ./.env; set +a # export .env's vars (e.g. USE_TUNNEL) into this script's environment
export IMAGE_TAG="$TAG"
FILES=(-f compose.prod.yaml)
[ "${USE_TUNNEL:-0}" = "1" ] && FILES+=(-f compose.tunnel.yaml)
COMPOSE=(docker compose --env-file .env "${FILES[@]}")
PREV="$(cat .deployed 2>/dev/null || true)"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
"${COMPOSE[@]}" pull --quiet
# Migrations are a one-shot step BEFORE the new containers start (ADR-0005).
# If this fails, `set -e` exits the script here — the rollback branch below is never reached,
# but that's fine: `up -d` (line below) hasn't run yet, so the previously deployed containers
# are untouched and still serving. There is nothing to roll back to; the old stack never stopped.
# The db is started (or left running) first: `--no-deps` below assumes a previous deploy's db
# is still up, which is false on a brand-new VM — the 2026-09-10 first test deploy failed on
# exactly that (migration's getaddrinfo("db") had nothing to resolve).
# Postgres 16 -> 18 guard: never start an empty 18 database next to existing 16 data. The move is
# done by .github/workflows/pg-upgrade.yml (infra/deploy/pg-upgrade-16-to-18.sh), not by a deploy.
PROJECT="${COMPOSE_PROJECT_NAME:-rtapps}"
if grep -q 'image: postgres:18' compose.prod.yaml; then
  if [ -n "${PGDATA18_PATH:-}" ]; then
    new_empty=$([ ! -e "$PGDATA18_PATH" ] || [ -z "$(ls -A "$PGDATA18_PATH")" ] && echo 1 || echo 0)
  else
    new_empty=$(docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1 && echo 0 || echo 1)
  fi
  case "${PGDATA_PATH:-pgdata}" in
    /*) old_present=$([ -n "$(ls -A "$PGDATA_PATH" 2>/dev/null)" ] && echo 1 || echo 0) ;;
    *) old_present=$(docker volume inspect "${PROJECT}_pgdata" >/dev/null 2>&1 && echo 1 || echo 0) ;;
  esac
  if [ "$new_empty" = 1 ] && [ "$old_present" = 1 ]; then
    echo "Postgres 18 is configured but the 16 data has not been moved yet." >&2
    echo "Run the 'pg-upgrade' workflow first (docs/06-operations.md, Postgres major upgrade)." >&2
    exit 1
  fi
fi
"${COMPOSE[@]}" up -d --wait db
"${COMPOSE[@]}" run --rm --no-deps api alembic upgrade head
if "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180; then
  echo "$TAG" > .deployed
  echo "deployed $TAG (previous: ${PREV:-none})"
else
  echo "deploy of $TAG failed" >&2
  if [ -n "$PREV" ]; then
    echo "rolling back to $PREV" >&2
    IMAGE_TAG="$PREV" "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180 || true
  fi
  exit 1
fi
docker image prune -f >/dev/null
