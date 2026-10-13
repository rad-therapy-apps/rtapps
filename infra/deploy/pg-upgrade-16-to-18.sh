#!/usr/bin/env bash
# Usage: pg-upgrade-16-to-18.sh STAGE_DIR
# What this file does: moves the live database from Postgres 16 to 18 — off-site backup, pause the
#   site, pg_dump from 16, switch to the staged compose files (18 on a NEW empty volume),
#   pg_restore, verify every table's row count matches, prove the 18-client backup works, resume.
#   Any failure after the switch puts the old files back and restarts 16 on its untouched volume.
# Used here and why: a 16 data directory can't be opened by 18, and deploy.sh's rollback only
#   restarts app images, so a major upgrade needs its own verified, reversible procedure.
#   STAGE_DIR holds the NEW compose.prod.yaml, compose.tunnel.yaml, backup/ and deploy/ (staged by
#   .github/workflows/pg-upgrade.yml); the live files are only replaced at the switch.
# How it fits the project: docs/specs/2026-10-13-postgres-18-upgrade-design.md; runbook in
#   docs/06-operations.md ("Postgres major upgrade"). Never deletes the old volume or the dump.
# Depends on: docker compose v2, /opt/rtapps/.env, a running 16 `db` service.
# Used by: .github/workflows/pg-upgrade.yml (over SSH); the local rehearsal (RTAPPS_ROOT,
#   COMPOSE_PROJECT_NAME, SKIP_OFFSITE_BACKUP=1, FORCE_COUNT_MISMATCH=1).
# -E so the ERR trap (rollback) also fires for failures inside functions and command substitutions.
set -Eeuo pipefail

STAGE="${1:?usage: pg-upgrade-16-to-18.sh STAGE_DIR}"
ROOT="${RTAPPS_ROOT:-/opt/rtapps}"
PROJECT="${COMPOSE_PROJECT_NAME:-rtapps}"
export COMPOSE_PROJECT_NAME="$PROJECT"
cd "$ROOT"
# .env exists only on the VM (deploy.sh sources it the same way), so shellcheck can't follow it.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
FILES=(-f compose.prod.yaml)
[ "${USE_TUNNEL:-0}" = "1" ] && FILES+=(-f compose.tunnel.yaml)
COMPOSE=(docker compose --env-file .env "${FILES[@]}")
WORK="$ROOT/pg-upgrade"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OLD="$WORK/old-$TS"
DUMP="$WORK/rtapps-pg16-$TS.dump"
mkdir -p "$WORK"

log() { echo "[pg-upgrade $(date -u +%H:%M:%S)] $*"; }
die() { log "ABORT: $*"; exit 1; }
# psql in container $1 against the app database; remaining args go to psql.
q() { local c="$1"; shift; docker exec -i "$c" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAX "$@"; }
# Exact row count of every table in the public schema, one "table count" line each, sorted.
counts() {
	local c="$1" t
	for t in $(q "$c" -c "select tablename from pg_tables where schemaname = 'public' order by 1"); do
		printf '%s %s\n' "$t" "$(q "$c" -c "select count(*) from public.\"$t\"")"
	done
}
target_is_empty() {
	if [ -n "${PGDATA18_PATH:-}" ]; then
		[ ! -e "$PGDATA18_PATH" ] || [ -z "$(ls -A "$PGDATA18_PATH")" ]
	else
		if docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1; then return 1; fi
	fi
}

# 1. Preflight — nothing has changed yet, so failures here just stop.
DB_CTR="$("${COMPOSE[@]}" ps -q db)"
[ -n "$DB_CTR" ] || die "the db service is not running"
VER="$(q "$DB_CTR" -c 'show server_version_num')"
[ "${VER:0:2}" = "16" ] || die "running db is version $VER, expected 16"
grep -q 'image: postgres:18' "$STAGE/compose.prod.yaml" || die "staged compose.prod.yaml is not the Postgres 18 one"
case "${PGDATA_PATH:-pgdata}" in
	/*) [ -n "${PGDATA18_PATH:-}" ] || die "16 data is on host path PGDATA_PATH; set PGDATA18_PATH in .env first" ;;
esac
target_is_empty || die "the Postgres 18 data target already has data; refusing to overwrite it"
SIZE="$(q "$DB_CTR" -c 'select pg_database_size(current_database())')"
FREE="$(df -Pk "$WORK" | awk 'NR == 2 { print $4 * 1024 }')"
[ "$FREE" -gt $((SIZE * 3)) ] || die "not enough free disk in $WORK (need 3x the $SIZE-byte database)"
log "preflight ok: Postgres $VER, database $SIZE bytes, $FREE bytes free"

# 2. Off-site backup with the current (16-client) backup image.
if [ "${SKIP_OFFSITE_BACKUP:-0}" = "1" ]; then
	log "SKIP_OFFSITE_BACKUP=1 — skipping the off-site backup (rehearsal only)"
else
	log "off-site backup"
	"${COMPOSE[@]}" run --rm -e RUN_ONCE=1 backup || die "off-site backup failed"
fi

# 3. Keep the current files for rollback.
mkdir -p "$OLD"
cp compose.prod.yaml compose.tunnel.yaml "$OLD/"
cp -R backup deploy "$OLD/"

# 4. Pause the site so nothing writes during the move.
log "pausing api, web and backup"
"${COMPOSE[@]}" stop api web backup

# 5. Export from 16 and record exact row counts.
log "exporting to $DUMP"
docker exec "$DB_CTR" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DUMP"
counts "$DB_CTR" > "$WORK/counts16-$TS.txt"
log "exported $(wc -l < "$WORK/counts16-$TS.txt") tables"

rollback() {
	log "FAILED after the switch — rolling back to Postgres 16"
	"${COMPOSE[@]}" stop db || true
	cp "$OLD/compose.prod.yaml" "$OLD/compose.tunnel.yaml" .
	rm -rf backup deploy && cp -R "$OLD/backup" "$OLD/deploy" .
	"${COMPOSE[@]}" up -d --wait db
	IMAGE_TAG="$(cat .deployed)" "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180 || true
	log "rolled back: site is on Postgres 16, old data untouched; the 18 target was left for inspection"
	exit 1
}
trap rollback ERR

# 6. Switch to the staged files: Postgres 18 on the new, empty volume.
log "switching to Postgres 18"
cp "$STAGE/compose.prod.yaml" "$STAGE/compose.tunnel.yaml" .
rm -rf backup deploy && cp -R "$STAGE/backup" "$STAGE/deploy" .
"${COMPOSE[@]}" up -d --wait db
NEW_CTR="$("${COMPOSE[@]}" ps -q db)"
NEW_VER="$(q "$NEW_CTR" -c 'show server_version_num')"
[ "${NEW_VER:0:2}" = "18" ]

# 7. Import and verify every table's row count.
log "importing into Postgres $NEW_VER"
docker exec -i "$NEW_CTR" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --exit-on-error < "$DUMP"
counts "$NEW_CTR" > "$WORK/counts18-$TS.txt"
[ "${FORCE_COUNT_MISMATCH:-0}" = "1" ] && echo "rehearsal_forced_mismatch 1" >> "$WORK/counts18-$TS.txt"
diff -u "$WORK/counts16-$TS.txt" "$WORK/counts18-$TS.txt"
log "row counts match for every table"

# 8. Prove backups work against 18, then resume the site.
TAG="$(cat .deployed)"
IMAGE_TAG="$TAG" "${COMPOSE[@]}" build backup
if [ "${SKIP_OFFSITE_BACKUP:-0}" != "1" ]; then
	IMAGE_TAG="$TAG" "${COMPOSE[@]}" run --rm -e RUN_ONCE=1 backup
	log "off-site backup with the 18 client succeeded"
fi
IMAGE_TAG="$TAG" "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180
trap - ERR
date -u +%Y-%m-%dT%H:%M:%SZ > "$WORK/DONE-$TS"
log "done: Postgres $NEW_VER is live. Kept for rollback: the old 16 volume, $DUMP, $OLD"
