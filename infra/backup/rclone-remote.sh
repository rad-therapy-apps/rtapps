# Sourced by backup.sh and restore.sh: defines the rclone remote `backup:` from the same
# S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY variables the scripts have always taken, so no
# deploy config changes. provider=Other keeps it host-agnostic (R2/OCI/any S3 API, per
# ADR-0005); no_check_bucket because a scoped R2 token may not be allowed to create buckets.
export RCLONE_CONFIG_BACKUP_TYPE=s3
export RCLONE_CONFIG_BACKUP_PROVIDER=Other
export RCLONE_CONFIG_BACKUP_ENDPOINT="$S3_ENDPOINT"
export RCLONE_CONFIG_BACKUP_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export RCLONE_CONFIG_BACKUP_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
export RCLONE_CONFIG_BACKUP_NO_CHECK_BUCKET=true
