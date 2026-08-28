#!/usr/bin/env bash
# What this file does: downloads one backup object, decrypts it, and restores it into a
#   target database — `restore.sh OBJECT_NAME TARGET_DB`.
# Used here and why: the counterpart to backup.sh's nightly upload. Run manually (or by
#   a cron/CI job) for the monthly restore drill documented in docs/06-operations.md,
#   which restores into a scratch database (`rtapps_restore_check`), never a live one, so
#   `--clean --if-exists` can safely drop-and-recreate objects there. The `age` identity
#   (private key) is never baked into the image or set as an env var — it's bind-mounted
#   at `/run/secrets/age-key` only for the duration of a restore run.
# How it fits the project: ADR-0005 ("Backups": weekly/monthly restore drill is a Phase 2
#   exit criterion).
# Depends on: mc, age, pg_restore (installed in this image's Dockerfile); S3_ENDPOINT/
#   S3_ACCESS_KEY/S3_SECRET_KEY, BACKUP_BUCKET (same env vars backup.sh uses); a
#   `/run/secrets/age-key` bind mount supplied by the caller at restore time.
# Used by: the operator, ad hoc, for the restore drill (not run automatically).
set -euo pipefail

OBJECT_NAME="${1:?usage: restore.sh OBJECT_NAME TARGET_DB}"
TARGET_DB="${2:?usage: restore.sh OBJECT_NAME TARGET_DB}"
# Guard: `pg_restore --clean` drops objects in the target, so refuse the live database name
# (PGDATABASE, the one the api uses) unless the caller sets ALLOW_LIVE_RESTORE=1 on purpose —
# the monthly drill always targets a scratch database such as rtapps_restore_check.
if [ "$TARGET_DB" = "${PGDATABASE:-}" ] && [ "${ALLOW_LIVE_RESTORE:-}" != "1" ]; then
	echo "refusing to restore into the live database '${TARGET_DB}' (set ALLOW_LIVE_RESTORE=1 for a real restore)" >&2
	exit 2
fi

# One timestamped log line per action.
log() {
	echo "[restore] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

# Configure the same S3-compatible endpoint backup.sh uploads to.
mc alias set backup "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
log "configured mc alias 'backup' for $S3_ENDPOINT"

tmp_enc="/tmp/$(basename "$OBJECT_NAME")"
mc cp "backup/${BACKUP_BUCKET}/postgres/${OBJECT_NAME}" "$tmp_enc"
log "downloaded ${OBJECT_NAME} to ${tmp_enc}"

tmp_dump="${tmp_enc%.age}"
age -d -i /run/secrets/age-key -o "$tmp_dump" "$tmp_enc"
log "decrypted to ${tmp_dump}"

pg_restore --clean --if-exists -d "$TARGET_DB" "$tmp_dump"
log "restored ${OBJECT_NAME} into ${TARGET_DB}"

rm -f "$tmp_enc" "$tmp_dump"
log "cleaned up local temp files"
