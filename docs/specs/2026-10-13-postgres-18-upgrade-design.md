# Postgres 16 → 18 upgrade: design

**Date:** 2026-10-13. **Status:** approved by the owner. **Replaces:** Dependabot PR #32.

## Context

- **Only one live environment exists today: `test`** (test.rttlearn.com). The GitHub `prod` environment has no secrets and has never been deployed. A future prod starts on 18 directly.
- **Deploys:** a merge to `main` deploys to `test` automatically. `deploy.yml` scp's `infra/compose.prod.yaml`, `compose.tunnel.yaml`, `Caddyfile.prod`, `backup/` and `deploy/` to `/opt/rtapps/`. `deploy.sh` then runs `up -d --wait db`, then `alembic upgrade head`, then `up -d`.
  - **Why a merge alone is dangerous:** merging a Postgres 18 image would start 18 on an empty data directory, and the site would come up with no data.
  - **Rollback can't help:** `deploy.sh` rollback only restarts the previous app images; it cannot take data back from 18 to 16.
- **The database is small and simple:**
  - one database `rtapps`, owned by the single superuser role from `POSTGRES_USER`;
  - one extension, `citext`;
  - UUID and JSONB columns plus a partial index;
  - no custom roles, grants, locales or large objects.

  A logical export and import (`pg_dump -Fc` / `pg_restore`) fits.
- **Postgres 18 image layout:** the `postgres:18` image keeps its data at `PGDATA=/var/lib/postgresql/18/docker`, and its volume is `/var/lib/postgresql`. Verified: `postgres:18` reports 18.6, with volume `/var/lib/postgresql`. The mount point therefore changes from `/var/lib/postgresql/data`.
- **Backup image:** `pg_dump` refuses servers newer than itself, so the backup image needs `postgresql18-client`. Verified: alpine:3.24 provides pg_dump 18.6.
- **Off-site backups** (`backup.sh`) are age-encrypted. The private key is deliberately not on the server, so an off-site restore drill needs the owner. That is out of scope here and listed as an owner task.

## Decisions (owner)

- **How it runs:** a manual GitHub Actions workflow ("Postgres upgrade"), using the deploy SSH credentials. Nobody SSHes in by hand.
- **Downtime:** acceptable anytime; it's a test site. Expected under a minute.

## Design

### 1. `infra/deploy/pg-upgrade-16-to-18.sh` (runs on the VM)

Called as `pg-upgrade-16-to-18.sh STAGE_DIR`. `STAGE_DIR` holds the **new** `compose.prod.yaml`, `compose.tunnel.yaml`, `backup/` and `deploy/`, staged by the workflow; the live files are not touched until the switch. The script:

1. **Preflight.** Abort without changing anything if any of these fails:
   - the running `db` reports `server_version_num` 16xxxx;
   - the staged compose file uses `image: postgres:18`;
   - the 18 target is empty: the volume `${PROJECT}_pgdata18` doesn't exist, or `PGDATA18_PATH`, if set, is empty or missing;
   - if the 16 data is on a host path (`PGDATA_PATH` starts with `/`), `PGDATA18_PATH` must be set;
   - free disk at `/opt/rtapps/pg-upgrade` is greater than 3 × `pg_database_size`.
2. **Off-site backup:** `compose run --rm -e RUN_ONCE=1 backup` with the current, 16-client image. Abort if it fails. `SKIP_OFFSITE_BACKUP=1` skips it, for the local rehearsal only.
3. **Keep the old files:** copy the live compose files, `backup/` and `deploy/` to `pg-upgrade/old-<ts>/`.
4. **Pause the site:** `compose stop api web backup`. The proxy stays up and serves errors briefly.
5. **Export:** run `pg_dump -Fc` from the running 16 container to `pg-upgrade/rtapps-pg16-<ts>.dump`, and record exact row counts for every `public` table to `counts16-<ts>.txt`.
6. **Switch** (from here, any failure triggers the rollback in step 9):
   - install the staged files into `/opt/rtapps`;
   - `compose up -d --wait db`, which starts 18 on the new empty volume and initialises the database and user from `.env`;
   - assert that `server_version_num` is 18xxxx.
7. **Import and verify:**
   - `pg_restore --exit-on-error` the dump into it;
   - recount every table into `counts18-<ts>.txt`; it must be identical to `counts16`.
8. **Prove backups work on 18 and bring the site back:**
   - `compose build backup`, which rebuilds the backup image with the 18 client for the current tag;
   - `compose run --rm -e RUN_ONCE=1 backup`; it must succeed;
   - then `up -d --remove-orphans --wait`, with `IMAGE_TAG` from `.deployed`;
   - write `pg-upgrade/DONE-<ts>`.
9. **Rollback** (on any failure after the switch):
   - stop db;
   - restore the old files;
   - `up -d --wait db`, which brings back 16 on the untouched `pgdata`;
   - `up -d` the rest at the `.deployed` tag;
   - exit non-zero.

   The 18 volume is left for inspection. No writes happened, because the site was paused.

The old `pgdata` volume and the dump file are never deleted by the script. Removing them is a manual step after about a week (runbook).

`COMPOSE_PROJECT_NAME` (default `rtapps`) and `RTAPPS_ROOT` (default `/opt/rtapps`) are overridable for the local rehearsal.

### 2. `.github/workflows/pg-upgrade.yml`

- `workflow_dispatch` with two inputs:
  - `environment` (test/prod);
  - `confirm`, which must equal `upgrade`.
- Same SSH setup and `concurrency: deploy-<env>` group as `deploy.yml`, so it never overlaps a deploy.
- **Steps:**
  1. check out the dispatched ref;
  2. scp the new files to `/opt/rtapps/pg-upgrade/stage/`;
  3. ssh `bash /opt/rtapps/pg-upgrade/stage/deploy/pg-upgrade-16-to-18.sh /opt/rtapps/pg-upgrade/stage`;
  4. curl `PUBLIC_URL/api/v1/health` as the smoke test.

### 3. Safety guard in `deploy.sh`

Before `up -d --wait db`: if `compose.prod.yaml` uses `postgres:18` **and** 16 data exists (`${PROJECT}_pgdata` volume, or a non-empty `PGDATA_PATH` host path) **and** the 18 target is missing or empty, abort with "run the Postgres upgrade workflow first". That makes it impossible to launch an empty 18 database next to real 16 data by accident.

### 4. Version flip (second PR)

- **`infra/compose.prod.yaml`:**
  - `db.image: postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336` (image built 2026-10-06);
  - volume `${PGDATA18_PATH:-pgdata18}:/var/lib/postgresql`;
  - keep `pgdata:` declared, so the old volume stays known;
  - add `pgdata18:`.
- **`infra/compose.yaml` (dev):** `postgres:18`, volume `pgdata18:/var/lib/postgresql`.
  - **Note for the owner:** the local dev database starts empty after this. Re-run `make seed`.
- **`infra/backup/Dockerfile`:** `postgresql18-client`.
- **`.github/workflows/pr.yml` and `main.yml`:** CI Postgres services move to `postgres:18`.
- **`infra/prod.env.example`:** document `PGDATA18_PATH`.
- **Docs:**
  - `docs/03-architecture.md` and `docs/05-setup.md`: version mentions.
  - ADR-0001: a dated note rather than a rewrite.
  - `docs/06-operations.md`: a new "Postgres major upgrade" runbook section covering how to run the workflow, rollback, and cleaning up the old volume after a week.

### Order of events

1. **PR 1 (tooling):** the script, the workflow, the deploy guard and the runbook. Merging it changes nothing on the server.
2. **PR 2 (version flip)** on `deps/pg18`, with a **local rehearsal** of the script on a prod-like local stack using PR 2's files. The rehearsal covers:
   - the happy path;
   - a forced count mismatch, which must roll back to 16 with the data intact;
   - the deploy guard.
3. **Run the upgrade workflow** with `--ref deps/pg18` against `test`, then check the site.
4. **Merge PR 2.** Its automatic deploy finds 18 already populated, so it's a no-op for the db.
5. **After about a week:** remove the old `rtapps_pgdata` volume and the dump (runbook).

## Testing

- shellcheck on both scripts.
- `actionlint` on the workflow, if available locally (CI's `tools` job may already lint).
- The local rehearsal described above. The CI suites, including the alembic dry-run, run against `postgres:18` in PR 2.
- After the upgrade on `test`, the owner checks:
  - sign in;
  - lessons load;
  - student results are present.

## Owner tasks (outside this change)

- An off-site restore drill using the age private key, as in `docs/06-operations.md` §7.
