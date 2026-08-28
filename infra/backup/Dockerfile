# What this file does: builds the `backup` service's image — a small Alpine image with
#   `pg_dump`/`pg_restore`, `age` (encryption), and `mc` (MinIO client, used against any
#   S3-compatible endpoint) plus this repo's backup.sh/restore.sh scripts.
# Used here and why: `mc` has no Alpine/apk package, so its binary is copied out of the
#   official `minio/mc` image (pinned by tag, since Dependabot's docker ecosystem tracks
#   this directory and needs a resolvable tag to bump); everything else comes from Alpine's
#   own repos so the image stays small and doesn't need a second base to patch.
# How it fits the project: ADR-0005 ("Backups" bullet) — nightly encrypted pg_dump to
#   object storage with retention, plus a documented restore drill.
# Depends on: backup.sh, restore.sh (this directory).
# Used by: infra/compose.prod.yaml (`backup` service, `build: ./backup`).

# mc has no Alpine package; pull its binary from the official image instead of installing it.
FROM minio/mc:RELEASE.2025-08-13T08-35-41Z AS mc

FROM alpine:3.24
# postgresql16-client: pg_dump/pg_restore/pg_isready; age: backup encryption; bash: scripts
# use bash-isms; coreutils: GNU `date -u` flags the scripts rely on.
RUN apk add --no-cache postgresql16-client age bash coreutils
COPY --from=mc /usr/bin/mc /usr/bin/mc
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
