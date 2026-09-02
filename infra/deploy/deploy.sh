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
