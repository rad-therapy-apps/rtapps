#!/usr/bin/env bash
# What this file does: the `backup` container's entrypoint — nightly, encrypts and
#   uploads a Postgres dump, then prunes old ones past the retention window.
# Used here and why: `pg_dump -Fc` (custom format, restorable with `pg_restore`) piped
#   straight into `age` so the plaintext dump never touches disk; `mc` (not the AWS CLI)
#   talks to whatever S3-compatible endpoint BACKUP_BUCKET lives on (R2/OCI/MinIO) with
#   one alias, per ADR-0005's host-agnostic storage requirement. `RUN_ONCE=1` skips the
#   scheduling loop for the restore drill and for a build-time smoke test
#   (`docker run ... -c 'pg_dump --version && age --version && mc --version'`).
# How it fits the project: ADR-0005 ("Backups": nightly pg_dump, age-encrypted, 30-day
#   retention, weekly restore drill). The restore side is restore.sh.
# Depends on: pg_dump, age, mc (installed in this image's Dockerfile); PGHOST/PGUSER/
#   PGPASSWORD/PGDATABASE (libpq env vars), S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY,
#   BACKUP_BUCKET, BACKUP_AGE_RECIPIENT, BACKUP_RETENTION_DAYS, BACKUP_HOUR_UTC (all set
#   by infra/compose.prod.yaml's `backup` service from infra/prod.env.example).
# Used by: infra/backup/Dockerfile (ENTRYPOINT); infra/compose.prod.yaml.
set -euo pipefail

# One timestamped log line per action, so `docker compose logs backup` reads as a diary.
log() {
	echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

# Configure the S3-compatible endpoint once; every mc invocation below reuses this alias.
mc alias set backup "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
log "configured mc alias 'backup' for $S3_ENDPOINT"

# One full backup cycle: dump, encrypt, upload, prune. Called once per night (or once
# total under RUN_ONCE=1).
run_backup() {
	local object="rtapps-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
	local tmp="/tmp/${object}"
	log "starting pg_dump of ${PGDATABASE}"
	pg_dump -Fc | age -r "$BACKUP_AGE_RECIPIENT" >"$tmp"
	log "pg_dump encrypted to ${tmp}"
	mc cp "$tmp" "backup/${BACKUP_BUCKET}/postgres/${object}"
	log "uploaded ${object} to backup/${BACKUP_BUCKET}/postgres/"
	rm -f "$tmp"
	mc rm --recursive --force --older-than "${BACKUP_RETENTION_DAYS}d" "backup/${BACKUP_BUCKET}/postgres/"
	log "pruned backups older than ${BACKUP_RETENTION_DAYS}d"
}

# RUN_ONCE=1: used by the restore drill and the image smoke test — one backup, then exit.
if [ "${RUN_ONCE:-}" = "1" ]; then
	run_backup
	exit 0
fi

# Nightly forever-loop: sleep until the next BACKUP_HOUR_UTC:00 UTC, back up, repeat.
while true; do
	now_epoch=$(date -u +%s)
	target_epoch=$(date -u -d "today ${BACKUP_HOUR_UTC}:00:00" +%s)
	# If today's slot already passed, the next run is tomorrow at the same hour.
	if [ "$target_epoch" -le "$now_epoch" ]; then
		target_epoch=$(date -u -d "tomorrow ${BACKUP_HOUR_UTC}:00:00" +%s)
	fi
	sleep_seconds=$((target_epoch - now_epoch))
	log "sleeping ${sleep_seconds}s until next backup at ${BACKUP_HOUR_UTC}:00 UTC"
	sleep "$sleep_seconds"
	run_backup
done
