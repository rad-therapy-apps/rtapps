# What this file does: builds the `backup` service's image — a small Alpine image with
#   `pg_dump`/`pg_restore`, `age` (encryption), and `rclone` (used against any
#   S3-compatible endpoint) plus this repo's backup.sh/restore.sh scripts.
# Used here and why: everything comes from Alpine's own repos, so the image has one base to
#   patch and no third-party registry. rclone replaced the MinIO client (`mc`) in 2026-09:
#   MinIO archived its open-source projects and withdrew every image and binary download.
# How it fits the project: ADR-0005 ("Backups" bullet) — nightly encrypted pg_dump to
#   object storage with retention, plus a documented restore drill.
# Depends on: backup.sh, restore.sh, rclone-remote.sh (this directory).
# Used by: infra/compose.prod.yaml (`backup` service, `build: ./backup`).

FROM alpine:3.21
# postgresql16-client: pg_dump/pg_restore/pg_isready; age: backup encryption; rclone: S3 transfers;
# bash: scripts use bash-isms; coreutils: GNU `date -u` flags the scripts rely on.
RUN apk add --no-cache postgresql16-client age rclone bash coreutils
COPY backup.sh restore.sh rclone-remote.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
