#!/usr/bin/env bash
# Usage: deploy.sh IMAGE_TAG — check and install the staged files, pull images, migrate, restart,
#   health-check, roll back on failure.
# What this file does: checks the files deploy.yml staged in /opt/rtapps/incoming/ against the
#   database's Postgres state (the 16 -> 18 guard below), copies them into /opt/rtapps only if
#   that passes, then pulls the given image tag, runs the Alembic migration one-shot, restarts the
#   compose stack, and — if anything after the pull fails — rolls back to the previously deployed
#   tag recorded in `.deployed`.
# Used here and why: runs on the VM itself (not in CI) because it needs the real compose project
#   state (`.deployed`) and the VM's own `.env`; deploy.yml scp's the files to incoming/, then SSHes
#   in and runs incoming/deploy/deploy.sh — this script as of the commit being deployed — with the
#   new tag as $1. Staging in incoming/ means a refused deploy never leaves its compose file live,
#   where a later `compose run` could recreate db from it. `set -euo pipefail` so any failed step
#   (pull, migrate, up) hits the rollback branch instead of leaving a half-deployed stack running.
# How it fits the project: docs/adr/0005-single-vm-docker-compose-deployment.md ("Migrations" and
#   "Deploy" bullets) — migrate before `up -d`, never on container start; on failure, restart the
#   previous sha rather than leave the new (broken) containers up.
# Depends on: docker compose v2, flock, the files staged in /opt/rtapps/incoming/ (compose.prod.yaml,
#   compose.tunnel.yaml, Caddyfile.prod, backup/, deploy/) and a populated /opt/rtapps/.env
#   (infra/prod.env.example is the template; USE_TUNNEL selects the tunnel overlay).
# Used by: .github/workflows/deploy.yml's "Deploy" step, over SSH.
set -euo pipefail
TAG="$1"
# This script runs as <root>/incoming/deploy/deploy.sh; <root> (/opt/rtapps) holds .env, .deployed
# and the live files.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ "$(basename "$SRC")" != incoming ]; then
  echo "run this as <root>/incoming/deploy/deploy.sh (deploy.yml stages it there)" >&2
  exit 1
fi
ROOT="$(dirname "$SRC")"
cd "$ROOT"
set -a; . ./.env; set +a # export .env's vars (e.g. USE_TUNNEL) into this script's environment
export IMAGE_TAG="$TAG"
FILES=(-f compose.prod.yaml)
[ "${USE_TUNNEL:-0}" = "1" ] && FILES+=(-f compose.tunnel.yaml)
COMPOSE=(docker compose --env-file .env "${FILES[@]}")
PREV="$(cat .deployed 2>/dev/null || true)"

# Postgres 16 -> 18 guard, run on the staged compose file before anything is installed. The move is
# done by .github/workflows/pg-upgrade.yml (infra/deploy/pg-upgrade-16-to-18.sh), never by a
# deploy, and only its success writes pg-upgrade/DONE-<ts>, so the guard keys on that marker:
# - a Postgres 18 compose file is refused while 16 data exists and no marker does (an empty or
#   half-restored 18 volume left by a failed run doesn't count as moved);
# - a Postgres 16 compose file is refused once a marker exists (it would bring 16 back on the
#   pre-upgrade data: split brain), and when 18 data exists with no 16 data (a VM that started
#   fresh on 18);
# - nothing deploys while an upgrade run holds pg-upgrade/lock.
# Fails closed: a host path that exists but can't be listed (Postgres makes its data dir 0700 for
# its own user), or whose parent can't be searched, counts as holding data.
path_has_data() {
  local out
  [ -x "$(dirname "$1")" ] || return 0
  [ -e "$1" ] || return 1
  out="$(ls -A "$1" 2>/dev/null)" || return 0
  [ -n "$out" ]
}
PROJECT="${COMPOSE_PROJECT_NAME:-rtapps}"
if [ -e pg-upgrade/lock ] && ! flock -n pg-upgrade/lock true; then
  echo "A Postgres upgrade is running on this VM (pg-upgrade/lock is held); deploy after it finishes." >&2
  exit 1
fi
upgraded=$(compgen -G 'pg-upgrade/DONE-*' >/dev/null && echo 1 || echo 0)
# Version detection fails safe: a compose file counts as Postgres 16 only if its db image line says
# so (quoted, docker.io/ or docker.io/library/ prefixed, tag or digest forms all match); anything
# else is treated as Postgres 18. The db image is the only `postgres:` image line in the file.
if grep -Eq '^[[:space:]]*image:[[:space:]]*["'\'']?(docker\.io/(library/)?)?postgres:16([@:"'\''[:space:]-]|$)' "$SRC/compose.prod.yaml"; then
  staged16=1
else
  staged16=0
fi
case "${PGDATA_PATH:-pgdata}" in
  /*) old_present=$(path_has_data "$PGDATA_PATH" && echo 1 || echo 0) ;;
  *) old_present=$(docker volume inspect "${PROJECT}_pgdata" >/dev/null 2>&1 && echo 1 || echo 0) ;;
esac
if [ "$staged16" = 0 ]; then
  if [ "$old_present" = 1 ] && [ "$upgraded" = 0 ]; then
    echo "Postgres 18 is configured but the 16 data has not been moved yet." >&2
    echo "Run the 'pg-upgrade' workflow first (docs/06-operations.md, Postgres major upgrade)." >&2
    exit 1
  fi
elif [ "$upgraded" = 1 ]; then
  echo "This compose file runs Postgres 16, but the database was moved to 18 (pg-upgrade/DONE-* exists)." >&2
  echo "Deploy the Postgres 18 compose file instead (docs/06-operations.md, Postgres major upgrade)." >&2
  exit 1
else
  # No marker, but this VM may have started fresh on 18: 18 data and no 16 data. (A failed upgrade
  # run leaves both, which passes.)
  if [ -n "${PGDATA18_PATH:-}" ]; then
    new_present=$(path_has_data "$PGDATA18_PATH" && echo 1 || echo 0)
  else
    new_present=$(docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1 && echo 1 || echo 0)
  fi
  if [ "$new_present" = 1 ] && [ "$old_present" = 0 ]; then
    echo "This compose file runs Postgres 16, but this VM holds Postgres 18 data and no 16 data." >&2
    echo "Deploy the Postgres 18 compose file instead (docs/06-operations.md, Postgres major upgrade)." >&2
    exit 1
  fi
fi
# Install the checked files. cp, not mv: the proxy bind-mounts Caddyfile.prod, so it must be
# rewritten in place; cp -R merges into backup/ and deploy/ as the old scp did.
cp "$SRC/compose.prod.yaml" "$SRC/compose.tunnel.yaml" "$SRC/Caddyfile.prod" .
cp -R "$SRC/backup" "$SRC/deploy" .

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
"${COMPOSE[@]}" pull --quiet
# Migrations are a one-shot step BEFORE the new containers start (ADR-0005).
# If this fails, `set -e` exits the script here — the rollback branch below is never reached,
# but that's fine: `up -d` (line below) hasn't run yet, so the previously deployed containers
# are untouched and still serving. There is nothing to roll back to; the old stack never stopped.
# The db is started (or left running) first: `--no-deps` below assumes a previous deploy's db
# is still up, which is false on a brand-new VM — the 2026-09-10 first test deploy failed on
# exactly that (migration's getaddrinfo("db") had nothing to resolve).
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
