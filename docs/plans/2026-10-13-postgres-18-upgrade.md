# Postgres 18 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `test` database from Postgres 16 to 18 with a one-button, verified, reversible data move. Make it impossible for a deploy to start an empty 18 database next to the real 16 data.

**Architecture:**
- **Task 1 (PR 1, branch `deps/pg18-tooling`)** adds:
  - a VM-side script that backs up, pauses, exports, switches, imports, verifies row counts, proves backups and resumes, rolling back to the untouched 16 volume on any failure;
  - a manual `workflow_dispatch` workflow that stages the new files and runs the script over the deploy SSH credentials;
  - a guard in `deploy.sh`;
  - a runbook section.
- **Task 2 (PR 2, branch `deps/pg18`)** flips every Postgres reference to 18.
- **Task 3** rehearses the whole move locally on a prod-like stack before it is run on `test`.

**Tech Stack:** Docker Compose v2, bash, Postgres 16/18 official images, alpine 3.24 (`postgresql18-client`), GitHub Actions.

**Spec:** `docs/specs/2026-10-13-postgres-18-upgrade-design.md`

## Global Constraints

- **Security:**
  - NEVER read, create or edit any `.env*` file. That includes `infra/.env.example`; `infra/prod.env.example` is fine because its name does not start with `.env`.
  - Never print secret values. Scripts must not `set -x` or echo env values.
- **Old data is never touched or deleted** by any script. Specifically: the `pgdata` volume, `PGDATA_PATH`, and the dump file.
- **Image:** Postgres 18 is `postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336`.
- **Data layout:** the 18 data volume is `${PGDATA18_PATH:-pgdata18}` mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data`.
- **Backup client:** the backup image installs `postgresql18-client`.
- **Script conventions:** `set -euo pipefail` and the repo header comment ("What this file does / Used here and why / How it fits the project / Depends on / Used by"), matching `infra/deploy/deploy.sh`.
- **Overridable defaults:** `COMPOSE_PROJECT_NAME` defaults to `rtapps`, and `RTAPPS_ROOT` defaults to `/opt/rtapps`. Both may be overridden, for the rehearsal.
- **Git:**
  - Stay on the task's branch; never push.
  - Stage only your own files; never `git add -A` or `git add .`.
  - End each commit message with a `Co-Authored-By:` trailer naming your model.

---

### Task 1: Upgrade tooling (PR 1, branch `deps/pg18-tooling`)

**Files:**
- Create: `infra/deploy/pg-upgrade-16-to-18.sh`
- Create: `.github/workflows/pg-upgrade.yml`
- Modify: `infra/deploy/deploy.sh`, adding a guard before `"${COMPOSE[@]}" up -d --wait db`
- Modify: `docs/06-operations.md`, adding a section "Postgres major upgrade (16 → 18)" after §8 Rollback and renumbering the later sections

**Interfaces:**
- Produces:
  - `pg-upgrade-16-to-18.sh STAGE_DIR`. Exit 0 means the site is on 18 and verified. Exit 1 before the switch means nothing changed. Exit 1 after the switch means it rolled back to 16. Env knobs: `SKIP_OFFSITE_BACKUP=1`, `FORCE_COUNT_MISMATCH=1` (rehearsal only), `RTAPPS_ROOT`, `COMPOSE_PROJECT_NAME`.
  - The workflow `pg-upgrade` (inputs `environment`, `confirm`).

- [ ] **Step 1: Write the script**

> **Superseded:** the committed `infra/deploy/pg-upgrade-16-to-18.sh` is authoritative. Two review rounds reworked it (phase handlers, detached launch, lock, marker-keyed two-way guard, `incoming/` deploy staging). The draft below is kept only for the record.

`infra/deploy/pg-upgrade-16-to-18.sh`:

```bash
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
set -a; . ./.env; set +a
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
		! docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1
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
```

- [ ] **Step 2: Lint it**

Run: `shellcheck infra/deploy/pg-upgrade-16-to-18.sh`. If shellcheck isn't installed, run `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:stable /mnt/infra/deploy/pg-upgrade-16-to-18.sh`.
Expected: no errors. Fix warnings in place, or annotate a justified exception with `# shellcheck disable=SCxxxx` and a reason. Make the file executable: `chmod +x`.

- [ ] **Step 3: Add the deploy guard**

In `infra/deploy/deploy.sh`, immediately before the line `"${COMPOSE[@]}" up -d --wait db`, insert:

```bash
# Postgres 16 -> 18 guard: never start an empty 18 database next to existing 16 data. The move is
# done by .github/workflows/pg-upgrade.yml (infra/deploy/pg-upgrade-16-to-18.sh), not by a deploy.
PROJECT="${COMPOSE_PROJECT_NAME:-rtapps}"
if grep -q 'image: postgres:18' compose.prod.yaml; then
  if [ -n "${PGDATA18_PATH:-}" ]; then
    new_empty=$([ ! -e "$PGDATA18_PATH" ] || [ -z "$(ls -A "$PGDATA18_PATH")" ] && echo 1 || echo 0)
  else
    new_empty=$(docker volume inspect "${PROJECT}_pgdata18" >/dev/null 2>&1 && echo 0 || echo 1)
  fi
  case "${PGDATA_PATH:-pgdata}" in
    /*) old_present=$([ -n "$(ls -A "$PGDATA_PATH" 2>/dev/null)" ] && echo 1 || echo 0) ;;
    *) old_present=$(docker volume inspect "${PROJECT}_pgdata" >/dev/null 2>&1 && echo 1 || echo 0) ;;
  esac
  if [ "$new_empty" = 1 ] && [ "$old_present" = 1 ]; then
    echo "Postgres 18 is configured but the 16 data has not been moved yet." >&2
    echo "Run the 'pg-upgrade' workflow first (docs/06-operations.md, Postgres major upgrade)." >&2
    exit 1
  fi
fi
```

Run shellcheck on `deploy.sh` too. Expected: no new findings.

- [ ] **Step 4: Write the workflow**

`.github/workflows/pg-upgrade.yml`:

```yaml
# What this file does: the one-off Postgres 16 -> 18 move for an environment, started by hand.
#   Stages the dispatched ref's compose files, backup/ and deploy/ on the VM, then runs
#   infra/deploy/pg-upgrade-16-to-18.sh there over the deploy SSH credentials, then smoke-tests.
# Used here and why: workflow_dispatch only — a database major upgrade must never happen as a side
#   effect of a merge. `confirm` must be typed as "upgrade". Same concurrency group as deploy.yml
#   so it can't overlap a deploy. Run it with the ref that carries the Postgres 18 compose file.
# How it fits the project: docs/specs/2026-10-13-postgres-18-upgrade-design.md; runbook in
#   docs/06-operations.md ("Postgres major upgrade").
# Works with: infra/deploy/pg-upgrade-16-to-18.sh, deploy.yml's Environment secrets DEPLOY_HOST,
#   DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS and variable PUBLIC_URL.
# Used by: humans, via the Actions tab or `gh workflow run pg-upgrade --ref <branch> -f environment=test -f confirm=upgrade`.
name: pg-upgrade
on:
  workflow_dispatch:
    inputs:
      environment: { type: choice, options: [test, prod], default: test }
      confirm: { type: string, description: 'Type "upgrade" to move the database from Postgres 16 to 18', required: true }
permissions:
  contents: read
concurrency:
  group: deploy-${{ inputs.environment }}
  cancel-in-progress: false
jobs:
  upgrade:
    runs-on: ubuntu-24.04-arm
    environment: ${{ inputs.environment }}
    steps:
      - name: Require confirmation
        if: inputs.confirm != 'upgrade'
        run: |
          echo "::error::Type 'upgrade' in the confirm input to run this."
          exit 1
      - uses: actions/checkout@v7
      - name: Require a configured host
        run: |
          if [ -z "${{ secrets.DEPLOY_HOST }}" ]; then
            echo "::error::Environment ${{ inputs.environment }} has no DEPLOY_HOST secret."
            exit 1
          fi
      - name: Configure SSH
        run: |
          printf '%s\n' "${{ secrets.DEPLOY_SSH_KEY }}" > "$RUNNER_TEMP/deploy_key" && chmod 600 "$RUNNER_TEMP/deploy_key"
          printf '%s\n' "${{ secrets.DEPLOY_KNOWN_HOSTS }}" > "$RUNNER_TEMP/deploy_known_hosts"
      - name: Stage the new files
        run: |
          SSH=(ssh -i "$RUNNER_TEMP/deploy_key" -o UserKnownHostsFile="$RUNNER_TEMP/deploy_known_hosts" "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}")
          "${SSH[@]}" 'rm -rf /opt/rtapps/pg-upgrade/stage && mkdir -p /opt/rtapps/pg-upgrade/stage'
          scp -i "$RUNNER_TEMP/deploy_key" -o UserKnownHostsFile="$RUNNER_TEMP/deploy_known_hosts" \
            -r infra/compose.prod.yaml infra/compose.tunnel.yaml infra/backup infra/deploy \
            "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/opt/rtapps/pg-upgrade/stage/"
      - name: Upgrade
        run: |
          ssh -i "$RUNNER_TEMP/deploy_key" -o UserKnownHostsFile="$RUNNER_TEMP/deploy_known_hosts" \
            "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
            "bash /opt/rtapps/pg-upgrade/stage/deploy/pg-upgrade-16-to-18.sh /opt/rtapps/pg-upgrade/stage"
      - name: Smoke test
        run: curl --fail --silent --show-error --max-time 20 "${{ vars.PUBLIC_URL }}/api/v1/health"
```

Lint it: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 .github/workflows/pg-upgrade.yml`. Expected: no findings, or only shellcheck style notes inside `run:` that you fix.

- [ ] **Step 5: Add the runbook section**

In `docs/06-operations.md`, add a section titled `## 9. Postgres major upgrade (16 → 18)` after §8 Rollback, and renumber the later sections (9→10, and so on, updating any in-doc references). Content:

- **What it is.** One sentence, plus a pointer to the spec.
- **When to run it.** Once per environment, with the branch or ref whose `infra/compose.prod.yaml` uses Postgres 18, before that ref is deployed. The deploy guard refuses to deploy a Postgres 18 compose file next to unmoved 16 data.
- **How to run it.** Actions → pg-upgrade → Run workflow, choosing the ref, environment `test`, and confirm `upgrade`. Or:
  `gh workflow run pg-upgrade --ref deps/pg18 -f environment=test -f confirm=upgrade`
- **What it does.** The eight steps in plain words: backup, pause, export, switch, import, verify counts, prove backup, resume.
- **Expected downtime.** Under a minute for the current data size.
- **If it fails.**
  - **Before the switch:** nothing changed.
  - **After the switch:** it rolled back to 16 automatically. Read the job log; the 18 volume `rtapps_pgdata18` was left for inspection, and `docker volume rm rtapps_pgdata18` resets it before a retry.
- **Manual rollback after a successful run**, if a problem appears later: `cp /opt/rtapps/pg-upgrade/old-<ts>/{compose.prod.yaml,compose.tunnel.yaml} /opt/rtapps/`, restore `backup/` and `deploy/` from there, then `docker compose ... up -d`. Writes made on 18 since the switch would be lost; export them first.
- **Cleanup after about a week.** `docker volume rm rtapps_pgdata`, and delete `/opt/rtapps/pg-upgrade/rtapps-pg16-*.dump` and `old-*`.

- [ ] **Step 6: Commit**

```bash
chmod +x infra/deploy/pg-upgrade-16-to-18.sh
git add infra/deploy/pg-upgrade-16-to-18.sh infra/deploy/deploy.sh .github/workflows/pg-upgrade.yml docs/06-operations.md
git commit -m "feat(infra): one-button Postgres 16 -> 18 upgrade workflow and a deploy guard

<trailer>"
```

---

### Task 2: Flip to Postgres 18 (PR 2, branch `deps/pg18`, cut from `main` after PR 1 merges)

**Files:**
- Modify: `infra/compose.prod.yaml`, at the db service (lines ~25–40) and the `volumes:` block at the end
- Modify: `infra/compose.yaml`, at the dev db service (lines ~18–35) and its `volumes:` block
- Modify: `infra/backup/Dockerfile`, the `apk add` line and its comment
- Modify: `.github/workflows/pr.yml`, `services.postgres.image`, around line 48
- Modify: `.github/workflows/main.yml`, the `postgres` service image, around line 85
- Modify: `infra/prod.env.example`, documenting `PGDATA18_PATH` next to `PGDATA_PATH`
- Modify docs:
  - `docs/03-architecture.md`: the version mentions;
  - `docs/05-setup.md`: the `docker run postgres:16` line;
  - `docs/adr/0001-backend-stack-fastapi-postgres.md`: append a dated note "2026-10: upgraded to PostgreSQL 18 (docs/specs/2026-10-13-postgres-18-upgrade-design.md)" and do not rewrite history;
  - `docs/adr/README.md` and `docs/01-problem-definition-and-scope.md`: only if they state the running version as current fact.

- [ ] **Step 1: `compose.prod.yaml` db service**

Set:

```yaml
  # Postgres 18, pinned by digest — the only database. The 18 image keeps its data under
  # /var/lib/postgresql/18/docker, so the volume mounts at /var/lib/postgresql (not .../data).
  # The 16 data stays on the old `pgdata` volume until it is removed by hand after the upgrade
  # (docs/06-operations.md, Postgres major upgrade).
  db:
    image: postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336
    environment: (unchanged)
    volumes:
      - ${PGDATA18_PATH:-pgdata18}:/var/lib/postgresql
```

In the top-level `volumes:`, keep `pgdata:` (with a comment "Postgres 16 data, kept until removed by hand after the 18 upgrade") and add `pgdata18:`.

- [ ] **Step 2: dev `compose.yaml`**

- The db image becomes `postgres:18`, and the volume becomes `pgdata18:/var/lib/postgresql`.
- Add `pgdata18:` to `volumes:`, and keep `pgdata:` with a comment that it holds the old 16 dev data and can be removed with `docker volume rm rtapps_pgdata` (check the dev project name in the file).
- Update the comments that say Postgres 16.

- [ ] **Step 3: backup Dockerfile, CI services, env example, docs**

- `infra/backup/Dockerfile`: replace `postgresql16-client` with `postgresql18-client`, and update the comment to say it must match the server's major version.
- `pr.yml` and `main.yml`: replace `postgres:16` with `postgres:18`. CI services start an empty database, so no path change is needed there.
- `prod.env.example`: next to `PGDATA_PATH`, add `PGDATA18_PATH=` (empty, so the named volume `pgdata18` is used) with a comment: set it to a host path only if `PGDATA_PATH` is a host path.
- Docs: update the version mentions as listed in Files.

- [ ] **Step 4: Verify**

```bash
grep -rn "postgres:16\|postgresql16\|Postgres 16\|PostgreSQL 16" infra .github docs --include=*.yaml --include=*.yml --include=Dockerfile --include=*.md
```

Expected: only historical mentions remain (the ADR note, the spec and plan, and the runbook's "16 → 18" text).

```bash
docker compose -f infra/compose.prod.yaml --env-file infra/prod.env.example config -q
```

Expected: exit 0. Make sure the example file has placeholder values; if it fails only on a required variable, report which one.

```bash
docker build -q infra/backup && docker run --rm --entrypoint pg_dump $(docker build -q infra/backup) --version
```

Expected: `pg_dump (PostgreSQL) 18.x`.

- [ ] **Step 5: Commit**

```bash
git add infra/compose.prod.yaml infra/compose.yaml infra/backup/Dockerfile .github/workflows/pr.yml .github/workflows/main.yml infra/prod.env.example docs/...
git commit -m "feat(infra): Postgres 18 (prod, dev, CI, backup client)

<trailer>"
```

---

### Task 3: Local rehearsal (branch `deps/pg18`)

**Goal:** prove `pg-upgrade-16-to-18.sh` on a prod-like local stack, covering:
- the happy path;
- the rollback path;
- the deploy guard.

Commit only fixes to `infra/deploy/pg-upgrade-16-to-18.sh` or `infra/deploy/deploy.sh`, if needed, and record everything in the report.

**Setup** (all in a scratch directory the controller provides, never in the repo):

1. Create a rehearsal root `R=<scratch>/opt-rtapps`, containing:
   - `compose.prod.yaml` and `compose.tunnel.yaml` **from `main`'s version, Postgres 16**, via `git show main:infra/compose.prod.yaml`;
   - `backup/` and `deploy/` from `main`;
   - a `.deployed` file holding a tag that exists for the api and web images;
   - a `.env` written with **made-up** values. This is a scratch file you create, not one of the repo's `.env*` files: it lives only in the scratch directory. It needs every variable `compose.prod.yaml` references (`POSTGRES_*`, `SESSION_SECRET` of 32+ characters, `S3_*`, `BACKUP_*`, `IMAGE_REPO`, `PUBLIC_ORIGIN`, and so on). Read `compose.prod.yaml` for the list.
2. **Images:** the api and web images need to exist for the `.deployed` tag. Either pull the public `ghcr.io/rad-therapy-apps/rtapps-{api,web}:<sha of main>`, if they are pullable anonymously, or build them locally from `apps/api/Dockerfile` and `apps/web/Dockerfile` and set `IMAGE_REPO` accordingly. If `docker compose up` can't run the proxy because ports 80/443 are busy, add a rehearsal-only override file (`ports: !reset []` on `proxy`), and put it in the `FILES` handling by setting `USE_TUNNEL=0` and passing the override path as an extra `-f`. Document exactly what you did. The script itself must not gain rehearsal-specific branches beyond the existing env knobs.
3. **Seed data:** start the stack with `COMPOSE_PROJECT_NAME=rtrehearse`, then load data. Either run the api image's `python -m app.seed`, or restore a `pg_dump` of the local dev seed. Run `alembic upgrade head` first if the image needs it.
4. Create the stage directory `S=<scratch>/stage`, holding `deploy/`, `backup/` and the compose files from the `deps/pg18` working tree.

**Runs:**

- **Run A, rollback path:**
  - Command: `RTAPPS_ROOT=$R COMPOSE_PROJECT_NAME=rtrehearse PG_UPGRADE_TS=runA SKIP_OFFSITE_BACKUP=1 FORCE_COUNT_MISMATCH=1 bash $S/deploy/pg-upgrade-16-to-18.sh $S`
  - The rehearsal runs the script in the foreground. In production `pg-upgrade.yml` launches it detached and sets `PG_UPGRADE_TS`; here you set it yourself so the exit code lands in a known file, `$R/pg-upgrade/EXIT-runA`, which the workflow reads the same way.
  - Expect:
    - exit 1 (and `EXIT-runA` containing `1`), with "rolling back to Postgres 16";
    - afterwards, the running db reports 16;
    - the row counts equal those before the run;
    - the api answers `/api/v1/health` (through the proxy, or with `docker compose exec api` curl);
    - `$R/compose.prod.yaml` is the 16 one again.
  - Then `docker volume rm rtrehearse_pgdata18`.
- **Run B, deploy guard refuses:**
  - Stage the 18 files as `deploy.yml` does: copy `compose.prod.yaml`, `compose.tunnel.yaml`, `Caddyfile.prod`, `backup/` and `deploy/` from the `deps/pg18` working tree into `$R/incoming/`. Leave the live files in `$R` as the 16 ones.
  - Run `$R/incoming/deploy/deploy.sh <tag>` (it must run from `<root>/incoming/deploy/`, and it works out `$R` from its own location, so no `cd` copy is needed). It sources `$R/.env` and runs `docker login ghcr.io` unconditionally, using `GHCR_USER` and `GHCR_TOKEN`, which `set -u` requires. Without credentials: export dummy `GHCR_USER` and `GHCR_TOKEN`, and put a `docker` wrapper first on `PATH` that passes everything through except `login`:
    ```bash
    mkdir -p $SCRATCH/bin && cat > $SCRATCH/bin/docker <<'EOF'
    #!/usr/bin/env bash
    [ "${1:-}" = login ] && exit 0
    exec /usr/local/bin/docker "$@"   # the real docker; adjust the path (`command -v docker`)
    EOF
    chmod +x $SCRATCH/bin/docker
    PATH=$SCRATCH/bin:$PATH GHCR_USER=x GHCR_TOKEN=x COMPOSE_PROJECT_NAME=rtrehearse $R/incoming/deploy/deploy.sh <tag>
    ```
  - Expect: exit 1 with the "Run the 'pg-upgrade' workflow first" message, before `docker login` is reached; `$R/compose.prod.yaml` is still the 16 file, and the db still reports 16. Clear `$R/incoming/` afterwards.
- **Run C, happy path:**
  - Command: the same as Run A with `PG_UPGRADE_TS=runC`, without `FORCE_COUNT_MISMATCH`.
  - Expect:
    - exit 0 (and `EXIT-runC` containing `0`), with "row counts and sequence values match";
    - the db reports 18, and the counts equal the pre-run counts;
    - api health is OK;
    - `rtrehearse_pgdata` still exists, untouched;
    - `$R/pg-upgrade/DONE-*` exists.
- **Run D, guard after the upgrade:** stage the 18 files in `$R/incoming/` again and run `$R/incoming/deploy/deploy.sh <tag>` with the same `docker` wrapper. Expect the guard to pass, because the `DONE` marker exists: the 18 files are installed into `$R`, and the script goes on to `login` (stubbed), `pull`, migrate and `up`. If ports 80/443 are busy the final `up` fails at the proxy. That is fine for this run: the assertion is that the guard passed and the files were installed. Also check the reverse: staging the 16 file now must be refused ("moved to 18").

**Cleanup:** `docker compose -p rtrehearse ... down -v`, remove the rehearsal images you built and the scratch directories.

- [ ] **Commit** fixes only, if any, with a message explaining what the rehearsal found.

---

## Controller steps after the tasks (not for implementers)

1. Review, then push PR 2.
2. Run CI on PR 2. That includes the alembic dry-run on 18 and the api tests on 18.
3. Run `gh workflow run pg-upgrade --ref deps/pg18 -f environment=test -f confirm=upgrade` and watch it.
4. Smoke-test the site.
5. Merge PR 2. Its deploy is a no-op for the db.
6. The owner checks the site.
7. Cleanup after about a week.
