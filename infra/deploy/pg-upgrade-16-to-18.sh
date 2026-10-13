#!/usr/bin/env bash
# Usage: pg-upgrade-16-to-18.sh STAGE_DIR
# What this file does: moves the live database from Postgres 16 to 18 — off-site backup, pause the
#   site, check nothing else is connected, record exact table row counts and sequence values,
#   pg_dump from 16, switch to the staged compose files (18 on a NEW empty volume), pg_restore,
#   verify the counts match, prove the 18-client backup works, resume, write pg-upgrade/DONE-<ts>
#   (the marker deploy.sh's Postgres guard keys on).
#   Failures (and HUP/INT/TERM) are handled by phase:
#   - before the pause: stop; nothing changed (exit 1);
#   - after the pause, before the switch: start api/web/backup again on the unchanged 16 stack (exit 1);
#   - after the switch: put the old files back and restart 16 on its untouched volume (exit 1).
#   If that recovery itself fails it prints "INCOMPLETE — site may be down" and the manual
#   commands, and exits 2. Exit 0 means the site is on 18 and verified.
# Used here and why: a 16 data directory can't be opened by 18, and deploy.sh's rollback only
#   restarts app images, so a major upgrade needs its own verified, reversible procedure.
#   STAGE_DIR holds the NEW compose.prod.yaml, compose.tunnel.yaml, backup/ and deploy/ (staged by
#   .github/workflows/pg-upgrade.yml); the live files are only replaced at the switch.
# How it fits the project: docs/specs/2026-10-13-postgres-18-upgrade-design.md; runbook in
#   docs/06-operations.md ("Postgres major upgrade"). Never deletes the old volume, $OLD or the dump.
# Depends on: docker compose v2, flock, /opt/rtapps/.env, /opt/rtapps/.deployed, a running 16 `db`.
# Used by: .github/workflows/pg-upgrade.yml, which starts it detached on the VM (setsid nohup, so a
#   cancelled job or dropped SSH can't kill it mid-move) with PG_UPGRADE_TS=<ts> and output in
#   pg-upgrade/run-<ts>.log, then polls pg-upgrade/lock (held while this runs) and
#   pg-upgrade/EXIT-<ts> (this script's exit code). The local rehearsal (RTAPPS_ROOT,
#   COMPOSE_PROJECT_NAME, SKIP_OFFSITE_BACKUP=1, FORCE_COUNT_MISMATCH=1).
# -E so the ERR trap also fires for failures inside functions; see the handlers below.
set -Eeuo pipefail

STAGE="${1:?usage: pg-upgrade-16-to-18.sh STAGE_DIR}"
ROOT="${RTAPPS_ROOT:-/opt/rtapps}"
cd "$ROOT"
WORK="$ROOT/pg-upgrade"
TS="${PG_UPGRADE_TS:-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$WORK"
trap 'echo "$?" > "$WORK/EXIT-$TS"' EXIT
# Held for the whole run: the workflow polls it, and deploy.sh refuses to deploy while it is held.
exec 9> "$WORK/lock"
flock -n 9 || { echo "another pg-upgrade run holds $WORK/lock" >&2; exit 1; }
# .env exists only on the VM (deploy.sh sources it the same way), so shellcheck can't follow it.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
# After .env (as in deploy.sh) so a COMPOSE_PROJECT_NAME set there is honoured everywhere.
PROJECT="${COMPOSE_PROJECT_NAME:-rtapps}"
export COMPOSE_PROJECT_NAME="$PROJECT"
FILES=(-f compose.prod.yaml)
[ "${USE_TUNNEL:-0}" = "1" ] && FILES+=(-f compose.tunnel.yaml)
COMPOSE=(docker compose --env-file .env "${FILES[@]}")
UP=("${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 180)
OLD="$WORK/old-$TS"
DUMP="$WORK/rtapps-pg16-$TS.dump"
# What a human runs to bring the site up by hand if an automatic recovery fails.
MANUAL_UP="COMPOSE_PROJECT_NAME=$PROJECT IMAGE_TAG=\$(cat .deployed) docker compose --env-file .env ${FILES[*]} up -d --remove-orphans --wait"

log() { echo "[pg-upgrade $(date -u +%H:%M:%S)] $*"; }
# psql in container $1 against the app database; remaining args go to psql.
q() { local c="$1"; shift; docker exec -i "$c" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAX "$@"; }
# Exact row count of every public table ("table count"), then every public sequence's last_value
# ("public.seq value"), each sorted. One psql call, so its exit status is never lost.
counts() {
	q "$1" -F ' ' \
		-c "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1" \
		-c "select schemaname || '.' || sequencename, last_value from pg_sequences where schemaname = 'public' order by 1"
}
# Fails closed: a path that exists but can't be listed (Postgres makes its data dir 0700 for its
# own user), or whose parent can't be searched, counts as holding data.
path_has_data() {
	local out
	[ -x "$(dirname "$1")" ] || return 0
	[ -e "$1" ] || return 1
	out="$(ls -A "$1" 2>/dev/null)" || return 0
	[ -n "$out" ]
}
target_is_empty() {
	if [ -n "${PGDATA18_PATH:-}" ]; then
		if path_has_data "$PGDATA18_PATH"; then return 1; fi
	elif docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1; then
		return 1
	fi
}

# Failure handling. ERR and HUP/INT/TERM go to the current phase's handler (abort, then resume
# once the site is paused, then rollback from the switch on); die() goes there too. Under -E the
# ERR trap also runs inside $(...) subshells, so every handler's first line just exits such a
# subshell: the failed substitution then fails its command in the main shell, which handles it once.
# A failure inside a redirected function (counts > file) runs its handler with that redirection
# still in place, so the handlers first send their output back to the script's own (fds 3 and 4).
exec 3>&1 4>&2
phase() {
	ON_FAILURE="$1"
	# shellcheck disable=SC2064 # expanding now is intended: $1 is the handler's name
	trap "$1" ERR HUP INT TERM
}
die() { log "ABORT: $*"; "$ON_FAILURE"; }

abort() {
	[ "$BASH_SUBSHELL" -eq 0 ] || exit 1
	exec >&3 2>&4
	log "stopped before the site was paused; nothing changed"
	exit 1
}

# Between the pause and the switch only api/web/backup were stopped; the files are unchanged.
resume() {
	[ "$BASH_SUBSHELL" -eq 0 ] || exit 1
	exec >&3 2>&4
	trap - ERR
	trap '' HUP INT TERM
	set +e
	log "FAILED before the switch — starting api, web and backup again on Postgres 16"
	if "${UP[@]}"; then
		log "resumed: site is on Postgres 16; nothing was switched"
		exit 1
	fi
	log "RESUME INCOMPLETE — site may be down. Postgres 16 and its data are untouched. On the VM run:"
	log "  cd $ROOT"
	log "  $MANUAL_UP"
	exit 2
}

rollback_incomplete() {
	log "ROLLBACK INCOMPLETE — site may be down (could not: $1). The 16 data is untouched. On the VM run:"
	log "  cd $ROOT"
	log "  cp $OLD/compose.prod.yaml $OLD/compose.tunnel.yaml ."
	log "  rm -rf backup deploy"
	log "  cp -R $OLD/backup $OLD/deploy ."
	log "  $MANUAL_UP"
	exit 2
}

# After the switch: every step is checked, and success is only claimed if all of them worked.
rollback() {
	[ "$BASH_SUBSHELL" -eq 0 ] || exit 1
	exec >&3 2>&4
	trap - ERR
	trap '' HUP INT TERM
	set +e
	local ctr ver
	log "FAILED after the switch — rolling back to Postgres 16"
	rm -f "$WORK/DONE-$TS" || rollback_incomplete "remove $WORK/DONE-$TS"
	"${COMPOSE[@]}" stop db || rollback_incomplete "stop the Postgres 18 db"
	cp "$OLD/compose.prod.yaml" "$OLD/compose.tunnel.yaml" . || rollback_incomplete "restore the old compose files"
	rm -rf backup deploy || rollback_incomplete "remove the new backup/ and deploy/"
	cp -R "$OLD/backup" "$OLD/deploy" . || rollback_incomplete "restore the old backup/ and deploy/"
	"${COMPOSE[@]}" up -d --wait db || rollback_incomplete "start Postgres 16"
	ctr="$("${COMPOSE[@]}" ps -q db)"
	ver="$(q "$ctr" -c 'show server_version_num')"
	[ "${ver:0:2}" = "16" ] || rollback_incomplete "confirm the db is Postgres 16 (got '$ver')"
	"${UP[@]}" || rollback_incomplete "start api, web and backup"
	log "rolled back: site is on Postgres 16, old data untouched; the 18 target was left for inspection"
	exit 1
}

phase abort

# 1. Preflight — nothing has changed yet, so failures here just stop.
TAG="$(cat .deployed 2>/dev/null || true)"
[ -n "$TAG" ] || die "$ROOT/.deployed is missing or empty; deploy once before upgrading"
export IMAGE_TAG="$TAG"
DB_CTR="$("${COMPOSE[@]}" ps -q db)"
[ -n "$DB_CTR" ] || die "the db service is not running"
VER="$(q "$DB_CTR" -c 'show server_version_num')"
[ "${VER:0:2}" = "16" ] || die "running db is version $VER, expected 16"
# Version detection as in deploy.sh: "16" only if the db image line says postgres:16.
IS16='^[[:space:]]*image:[[:space:]]*["'\'']?(docker\.io/(library/)?)?postgres:16([@:"'\''[:space:]-]|$)'
grep -Eq "$IS16" compose.prod.yaml || die "the live compose.prod.yaml is not the Postgres 16 one"
if grep -Eq "$IS16" "$STAGE/compose.prod.yaml"; then die "staged compose.prod.yaml is not the Postgres 18 one"; fi
grep -Eq 'PGDATA18_PATH:-pgdata18\}:/var/lib/postgresql[[:space:]]*$' "$STAGE/compose.prod.yaml" ||
	die "staged compose.prod.yaml must mount the 18 data at /var/lib/postgresql (not .../data)"
case "${PGDATA_PATH:-pgdata}" in
	/*) [ -n "${PGDATA18_PATH:-}" ] || die "16 data is on host path PGDATA_PATH; set PGDATA18_PATH in .env first" ;;
esac
target_is_empty || die "the Postgres 18 data target already has data (or can't be read); refusing to overwrite it"
SIZE="$(q "$DB_CTR" -c 'select pg_database_size(current_database())')"
FREE="$(df -Pk "$WORK" | awk 'NR == 2 { print $4 * 1024 }')"
[ "$FREE" -gt $((SIZE * 3)) ] || die "not enough free disk in $WORK (need 3x the $SIZE-byte database)"
log "preflight ok: Postgres $VER, database $SIZE bytes, $FREE bytes free, deployed tag $TAG"

# Pull the new database image now, while the site is still up: in the rehearsal the download added
# ~80 s to the paused window when it happened at the switch instead.
STAGED_DB_IMAGE="$(grep -E '^[[:space:]]*image:[[:space:]]*["'\'']?(docker\.io/(library/)?)?postgres:' "$STAGE/compose.prod.yaml" | head -n 1 | sed -E 's/^[[:space:]]*image:[[:space:]]*//; s/["'\'']//g; s/[[:space:]]+$//')"
[ -n "$STAGED_DB_IMAGE" ] || die "could not read the db image from the staged compose.prod.yaml"
log "pulling $STAGED_DB_IMAGE ahead of the pause"
docker pull --quiet "$STAGED_DB_IMAGE" >/dev/null || die "could not pull $STAGED_DB_IMAGE"

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

# 4. Pause the site so nothing writes during the move. From here a failure starts it again.
phase resume
log "pausing api, web and backup"
"${COMPOSE[@]}" stop api web backup

# 5. Prove nothing else is connected (e.g. the 03:30 purge cron), then record exact counts and
#    export. Nothing can write in between, so counts and dump describe the same data.
OTHERS="$(q "$DB_CTR" -c "select count(*) from pg_stat_activity where datname = current_database() and backend_type = 'client backend' and pid <> pg_backend_pid()")"
[ "$OTHERS" = "0" ] || die "$OTHERS other session(s) still connected to $POSTGRES_DB; try again later"
UMASK="$(umask)"
umask 077 # the dump holds personal data and password hashes
counts "$DB_CTR" > "$WORK/counts16-$TS.txt"
log "exporting to $DUMP"
docker exec "$DB_CTR" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DUMP"
umask "$UMASK"
log "exported; $(wc -l < "$WORK/counts16-$TS.txt") tables and sequences recorded"

# 6. Switch to the staged files: Postgres 18 on the new, empty volume. From here a failure rolls back.
phase rollback
log "switching to Postgres 18"
cp "$STAGE/compose.prod.yaml" "$STAGE/compose.tunnel.yaml" .
rm -rf backup deploy
cp -R "$STAGE/backup" "$STAGE/deploy" .
"${COMPOSE[@]}" up -d --wait db
NEW_CTR="$("${COMPOSE[@]}" ps -q db)"
# --wait trusts pg_isready over the unix socket, which can pass against the entrypoint's
# init-time temporary server; only the real server listens on TCP.
tries=0
until docker exec "$NEW_CTR" pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
	tries=$((tries + 1))
	[ "$tries" -lt 60 ] || die "Postgres 18 did not accept TCP connections within 2 minutes"
	sleep 2
done
NEW_VER="$(q "$NEW_CTR" -c 'show server_version_num')"
[ "${NEW_VER:0:2}" = "18" ] || die "new db is version $NEW_VER, expected 18"

# 7. Import and verify every table's row count and every sequence's value.
log "importing into Postgres $NEW_VER"
docker exec -i "$NEW_CTR" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --exit-on-error < "$DUMP"
counts "$NEW_CTR" > "$WORK/counts18-$TS.txt"
[ "${FORCE_COUNT_MISMATCH:-0}" = "1" ] && echo "rehearsal_forced_mismatch 1" >> "$WORK/counts18-$TS.txt"
diff -u "$WORK/counts16-$TS.txt" "$WORK/counts18-$TS.txt"
log "row counts and sequence values match"

# 8. Prove backups work against 18, then resume the site (IMAGE_TAG is exported from .deployed).
"${COMPOSE[@]}" build backup
if [ "${SKIP_OFFSITE_BACKUP:-0}" != "1" ]; then
	"${COMPOSE[@]}" run --rm -e RUN_ONCE=1 backup
	log "off-site backup with the 18 client succeeded"
fi
"${UP[@]}"
# Written while rollback is still armed (rollback removes it), so a marker always means success.
date -u +%Y-%m-%dT%H:%M:%SZ > "$WORK/DONE-$TS"
trap - ERR HUP INT TERM
log "done: Postgres $NEW_VER is live. Kept for rollback: the old 16 volume, $DUMP, $OLD"
