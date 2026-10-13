# Operations — test/production VM, deploys, backups

<!--
What this file does: the runbook for everything outside a developer laptop — provisioning the
VM, configuring `/opt/rtapps/.env`, choosing the ingress, wiring the GitHub Environment secrets,
deploying, verifying, backing up, restoring and rolling back.
Used here and why: one document the owner (the only operator, per ADR-0005) can follow top to
bottom; every command is copy-pasteable and every secret has exactly one home.
How it fits the project: ADR-0005 (single VM + Docker Compose + GHCR + Caddy/Cloudflare Tunnel);
docs/03-architecture.md §10.2; milestone M2 exit criteria (deploy is one workflow run; restore
drill completed).
Works with: infra/compose.prod.yaml, infra/compose.tunnel.yaml, infra/Caddyfile.prod,
infra/prod.env.example, infra/backup/*, infra/deploy/deploy.sh, .github/workflows/main.yml,
.github/workflows/deploy.yml. Used by: the owner; referenced from docs/05-setup.md.
-->

Everything below is **host-agnostic**: any Ubuntu 24.04 VM with Docker Engine ≥ 27 and Docker
Compose ≥ 2.24 (the tunnel overlay uses `!override`) works. The default plan is an Oracle Cloud
Always-Free A1 (arm64) VM behind a Cloudflare Tunnel; the fallback is a Hetzner CAX11. Nothing in
the repo depends on that choice.

## 1. Provision the VM (once)

```bash
# On the VM, as root or with sudo
apt-get update && apt-get install -y docker.io docker-compose-v2 unattended-upgrades
useradd -m -s /bin/bash -G docker deploy
mkdir -p /opt/rtapps && chown deploy:deploy /opt/rtapps && chmod 750 /opt/rtapps
```

On your laptop, create a dedicated deploy key and collect the host key (both go into GitHub in §4):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/rtapps-deploy -N '' -C rtapps-deploy   # private key → DEPLOY_SSH_KEY
ssh-copy-id -i ~/.ssh/rtapps-deploy.pub deploy@YOUR_HOST                 # or paste into ~deploy/.ssh/authorized_keys
ssh-keyscan -H YOUR_HOST                                                 # output → DEPLOY_KNOWN_HOSTS
```

If the VM sits behind a cloud firewall/security list, open **22** (SSH) and, only for the
Caddy-TLS ingress, **80** and **443**. The tunnel ingress needs no inbound ports.

## 2. Configure `/opt/rtapps/.env` (secrets live only here)

```bash
# On the VM as deploy
cp /opt/rtapps/prod.env.example /opt/rtapps/.env    # deploy.yml copies the template; or scp it from infra/
chmod 600 /opt/rtapps/.env
openssl rand -hex 32                                # → SESSION_SECRET
openssl rand -base64 24                             # → POSTGRES_PASSWORD (then mirror it in DATABASE_URL)
```

Then edit `.env`: `PUBLIC_ORIGIN` (the public URL), the `S3_*` values for your bucket (Cloudflare
R2, OCI Object Storage or any S3-compatible service), `BACKUP_BUCKET`, `SENTRY_DSN` (optional —
error tracking for both `api` and `web`; blank disables it, server-side only, see
`docs/03-architecture.md` §8), and the ingress values from §3. Every variable is documented
inline in `infra/prod.env.example`. Never commit `.env`; never put its values in GitHub secrets.

### Backup encryption key

```bash
age-keygen -o rtapps-backup.key        # keep this file OFFLINE (password manager / encrypted disk)
grep 'public key' rtapps-backup.key    # → BACKUP_AGE_RECIPIENT in .env
```

Losing the private key means the backups cannot be decrypted. Rotate it yearly (§10).

## 3. Choose the ingress

| | A. Caddy with automatic TLS | B. Cloudflare Tunnel (default) |
|---|---|---|
| Inbound ports | 80 + 443 open | none |
| `.env` | `SITE_ADDRESS=rt.example.edu` | `SITE_ADDRESS=:80`, `USE_TUNNEL=1`, `CLOUDFLARE_TUNNEL_TOKEN=…` |
| DNS | A/AAAA record → VM | Cloudflare Zero Trust → Tunnels → public hostname → `http://proxy:80` |
| TLS | Caddy/ACME on the VM | Cloudflare terminates; Caddy serves plain HTTP inside the compose network |

`USE_TUNNEL=1` makes `infra/deploy/deploy.sh` add `-f compose.tunnel.yaml`, which removes the
proxy's published ports and starts `cloudflared`. HSTS is sent by `Caddyfile.prod` in both modes
(NFR-08); in tunnel mode enable "Always use HTTPS" on the Cloudflare zone as well.

## 4. GitHub Environments and secrets

Environments `test` and `prod` exist on `rad-therapy-apps/rtapps`. The required-reviewer rule on
`prod` is **not available on the GitHub Free plan for private repos** (the API answers 422), so
the safeguard is procedural: `main.yml` deploys automatically to `test` only; `prod` is reachable
solely through a manual `workflow_dispatch` of `deploy.yml`.

Per environment (`--env test`, later `--env prod`):

```bash
gh secret set DEPLOY_HOST        --env test --body 'YOUR_HOST_OR_IP'
gh secret set DEPLOY_USER        --env test --body 'deploy'
gh secret set DEPLOY_SSH_KEY     --env test < ~/.ssh/rtapps-deploy
gh secret set DEPLOY_KNOWN_HOSTS --env test --body "$(ssh-keyscan -H YOUR_HOST 2>/dev/null)"
gh variable set PUBLIC_URL       --env test --body 'https://rt-test.example.edu'
```

Until `DEPLOY_HOST` is set, `deploy.yml` logs "no DEPLOY_HOST — nothing deployed" and exits
green, so `main.yml` stays green before the VM exists. GHCR access on the VM uses the workflow's
`GITHUB_TOKEN` at deploy time; no long-lived registry token is stored anywhere.

## 5. Deploy

- **Automatic to `test`:** every push to `main` runs `main.yml` → builds `rtapps-api`,
  `rtapps-web`, `rtapps-backup` for `linux/amd64` + `linux/arm64`, pushes them to GHCR tagged with
  the commit SHA (and `latest`), dry-runs the migrations from the published api image
  (`upgrade head` → `downgrade base` → `upgrade head` on a throwaway Postgres), then calls
  `deploy.yml` for `test` with that SHA.
- **Manual (test or prod):**
  ```bash
  gh workflow run deploy.yml -f environment=test -f image_tag=<git sha>
  gh workflow run deploy.yml -f environment=prod -f image_tag=<git sha>   # promotion = same images
  ```
- What a deploy does on the VM (`infra/deploy/deploy.sh`): copy the files to
  `/opt/rtapps/incoming/` → run `incoming/deploy/deploy.sh`, whose Postgres guard (§9) checks
  them before they are copied into `/opt/rtapps` → `docker login` to GHCR → `compose pull` →
  **one-shot** `compose run --rm api alembic upgrade head` → `compose up -d --wait` → record the
  SHA in `/opt/rtapps/.deployed`. If `up --wait` fails, it restarts the previous SHA and exits
  non-zero; the workflow then fails visibly. Migrations never run on container start (ADR-0005),
  so a bad migration can never loop a restarting container.
- **Dispatch `deploy.yml` only from `main`.** After the Postgres 18 move (§9), never dispatch it
  from a ref or tag older than the guard: that `deploy.yml` copies its files straight into
  `/opt/rtapps`, bypassing the guard.

### First deploy on `test`

```bash
ssh deploy@YOUR_HOST 'cd /opt/rtapps && IMAGE_TAG=$(cat .deployed) docker compose --env-file .env -f compose.prod.yaml -f compose.tunnel.yaml run --rm -e ENV=test api python -m app.seed'
```

(Three flags learned on the first real test deploy, 2026-09-10: manual `compose run`
needs `IMAGE_TAG` passed explicitly — the deploy workflow injects it, `.env` leaves it
blank; include the tunnel overlay when `USE_TUNNEL=1` so compose sees the same project;
and `-e ENV=test` overrides the compose file's hardcoded `ENV: prod` — the seed's
prod-guard refuses otherwise, by design.)

The seed refuses to run when `ENV=prod`. Sign in as `admin@example.com` (`rtapps-dev-password`),
open **Admin → Users**, and promote the mentor's account to `educator` (audited). On `prod`, create
the first admin by registering normally and promoting the row with `psql` once:
`UPDATE "user" SET role = 'admin' WHERE email = '…';`.

### Content updates

To load new or re-converted content (`tools/migrate-legacy scan` output, or a hand-authored
activity fixture) into a deployed environment without a full redeploy, run the importer inside
the running `api` container the same way `make seed` does, pointing at the file(s):

```bash
ssh deploy@YOUR_HOST 'cd /opt/rtapps && docker compose --env-file .env -f compose.prod.yaml run --rm api python -m app.content.importer seed/content/<subject>/<slug>.json'
```

On `test`, re-running the whole seed (`python -m app.content.importer` skipped, `python -m
app.seed` instead — see above) is simplest and idempotent: it re-imports every fixture and every
file under `seed/content/` and `seed/activities/` without duplicating rows.

### Scheduled jobs (cron)

Add to the `deploy` user's crontab on the VM (`crontab -e`) — `docs/02-requirements.md` NFR-26,
sessions purged 30 days after expiry:

```cron
# Nightly session purge, 03:30 UTC (after the backup at BACKUP_HOUR_UTC)
30 3 * * * docker compose --env-file /opt/rtapps/.env -f /opt/rtapps/compose.prod.yaml run --rm api python -m app.tasks.purge_sessions >> /var/log/rtapps-purge.log 2>&1
```

## 6. Verify

```bash
curl -fsS https://rt-test.example.edu/api/v1/health
E2E_BASE_URL=https://rt-test.example.edu pnpm --filter web e2e     # AT-05 + AT-11 against the deployed URL
```

The second command needs the seed to have run (lesson content) and creates its own throwaway
student/cohort each run.

## 7. Backups and the restore drill

The `backup` container runs `pg_dump -Fc`, encrypts it to `BACKUP_AGE_RECIPIENT` with `age`, and
uploads `postgres/rtapps-<UTC timestamp>.dump.age` to `BACKUP_BUCKET` every night at
`BACKUP_HOUR_UTC`, pruning objects older than `BACKUP_RETENTION_DAYS` (30). Media lives in the
S3 bucket; enable object versioning there.

Take a backup now / check that uploads work. Run every command in this section from `/opt/rtapps`
after `export IMAGE_TAG=$(cat .deployed)`: `compose.prod.yaml` builds image names from it, and
without it compose fails with "invalid reference format". `BACKUP_BUCKET` must exactly match a bucket the
`S3_ACCESS_KEY` token covers: R2 answers `AccessDenied`, not "no such bucket", for any bucket
outside the token's scope, including a misspelled one.

```bash
export IMAGE_TAG=$(cat .deployed)
docker compose --env-file .env -f compose.prod.yaml run --rm -e RUN_ONCE=1 backup
docker compose --env-file .env -f compose.prod.yaml run --rm --entrypoint sh backup -c '. /usr/local/bin/rclone-remote.sh && rclone ls backup:$BACKUP_BUCKET/postgres/'
```

**Monthly restore drill** (into a scratch database, never the live one):

```bash
docker compose --env-file .env -f compose.prod.yaml exec db createdb -U rtapps rtapps_restore_check
docker compose --env-file .env -f compose.prod.yaml run --rm \
  -v /path/to/rtapps-backup.key:/run/secrets/age-key:ro --entrypoint restore.sh backup \
  rtapps-<timestamp>.dump.age rtapps_restore_check
docker compose --env-file .env -f compose.prod.yaml exec db psql -U rtapps -d rtapps_restore_check -c 'SELECT count(*) FROM attempt;'
docker compose --env-file .env -f compose.prod.yaml exec db dropdb -U rtapps rtapps_restore_check
```

Record the date and the attempt count in the ops log (a note in this repo's wiki or the ledger).
A real restore is the same command with the live database name **and** `-e ALLOW_LIVE_RESTORE=1` (the script refuses the live database otherwise), after `compose stop api web`:

```bash
docker compose --env-file .env -f compose.prod.yaml run --rm -e ALLOW_LIVE_RESTORE=1 \
  -v /path/to/rtapps-backup.key:/run/secrets/age-key:ro --entrypoint restore.sh backup \
  rtapps-<timestamp>.dump.age rtapps
```

## 8. Rollback

`deploy.sh` rolls back automatically when the new containers fail their health checks. To roll
back a deploy that *passed* health checks but is wrong:

```bash
ssh deploy@YOUR_HOST 'cat /opt/rtapps/.deployed'                       # current SHA
gh workflow run deploy.yml -f environment=test -f image_tag=<previous sha>
```

Migrations are forward-only in practice: if a release added a migration, restoring the previous
image without running `alembic downgrade` is fine as long as the migration was additive (all of
ours are so far); otherwise restore last night's backup first (§7).

Run the rollback deploy from `main` too: the `image_tag` picks the old images, while the
workflow ref must still carry the guard (§5, §9). Never dispatch `deploy.yml` from a ref older
than the guard.

## 9. Postgres major upgrade (16 → 18)

A one-off, one-button move of an environment's database from Postgres 16 to 18 (a 16 data
directory cannot be opened by 18); design in `docs/specs/2026-10-13-postgres-18-upgrade-design.md`.

**When to run it.** Once per environment, using the branch or ref whose `infra/compose.prod.yaml`
uses Postgres 18, *before* that ref is deployed. Avoid 03:00–03:45 UTC: the nightly backup
(`BACKUP_HOUR_UTC`, default 03) and the 03:30 session-purge cron (§5) run then, and the script
refuses to export while any other session is connected to the database.

**The deploy guard.** `deploy.yml` copies the files to `/opt/rtapps/incoming/` and runs
`incoming/deploy/deploy.sh`, which checks the staged compose file *before* installing anything.
The check keys on `/opt/rtapps/pg-upgrade/DONE-<ts>`, which only a successful upgrade writes:

- a Postgres 18 compose file is refused while 16 data exists and there is no `DONE` marker. An
  empty or half-restored 18 volume left by a failed run does not count as moved;
- a Postgres 16 compose file is refused once a `DONE` marker exists, because it would bring 16
  back on the pre-upgrade data. It is also refused when 18 data exists (`rtapps_pgdata18`, or
  data at `PGDATA18_PATH`) and 16 data does not, which is a VM that started fresh on 18. A failed
  upgrade run leaves both, and that still passes;
- a compose file counts as Postgres 16 only if its db `image:` line says `postgres:16` (quoted,
  `docker.io/` or `docker.io/library/` prefixed, and tag or digest forms all match). Anything
  else is treated as Postgres 18;
- nothing deploys while an upgrade run holds `pg-upgrade/lock`.

A refused deploy fails red and leaves the live files in `/opt/rtapps` untouched. A host data path
that exists but that the deploy user can't read (Postgres makes it `0700`) counts as holding data.

**After a successful run, merge the Postgres 18 PR immediately, and merge nothing else to `main`
in between.** Any other merge would deploy `main`'s 16 compose file. The guard refuses that
deploy, so the site keeps running, but every deploy fails until the 18 PR is merged.

**How to run it.** Actions → pg-upgrade → Run workflow, choosing the ref, environment `test` and
confirm `upgrade`. Or:

```bash
gh workflow run pg-upgrade --ref deps/pg18 -f environment=test -f confirm=upgrade
```

The job stages the files in `/opt/rtapps/pg-upgrade/stage/`, starts the script detached on the VM
and prints its log every 10 seconds, for up to 30 minutes. **Cancelling the job or losing the
SSH connection does not stop the script.** It finishes, or recovers, on its own. Its log is
`/opt/rtapps/pg-upgrade/run-<ts>.log`, and its exit code is in `EXIT-<ts>` (0 success, 1 failed
but the site is on 16, 2 recovery incomplete).

**What it does.** `infra/deploy/pg-upgrade-16-to-18.sh` runs on the VM, in nine steps:

1. Preflight. It checks:
   - the running db is 16, and so is the live `compose.prod.yaml`;
   - the staged compose file is not 16 and mounts `${PGDATA18_PATH:-pgdata18}:/var/lib/postgresql`;
   - the 18 target is empty;
   - `.deployed` names the current tag;
   - free disk in `pg-upgrade/` is more than 3 × the database. Only that filesystem is checked, so
     if Docker's volumes live on another disk, check it by hand.
2. Backup: an off-site backup with the current 16 client.
3. Pause: stops `api`, `web` and `backup`, then checks that no other session is connected.
4. Export: exact row counts of every table and every sequence's value, then `pg_dump`. Both are
   written mode `0600`, because the dump holds personal data.
5. Switch: swaps in the staged compose files, so 18 starts on a new, empty volume (`pgdata18`).
6. Import: waits until 18 accepts TCP connections, then runs `pg_restore`.
7. Verify: every table count and sequence value must equal the 16 ones.
8. Prove backup: builds the 18-client backup image and runs one off-site backup against 18.
9. Resume: starts the whole site again and writes the `DONE` marker. The workflow then
   smoke-tests `/api/v1/health`.

**Expected downtime.** A few minutes, from the pause to the resume. That covers the export, the
import, the backup-image build and the off-site backup with the 18 client.

**If it fails.** The job's last step reports whether the site answers `/api/v1/health`, and the
end of the log says which case applies:

- **Before the pause** (preflight, the first backup): nothing changed. Exit 1.
- **After the pause, before the switch** (session check, export): `api`, `web` and `backup` are
  started again on the unchanged 16 stack ("resumed: site is on Postgres 16"). Exit 1. A partial
  dump may be left in `pg-upgrade/`.
- **After the switch:** the old files are put back and 16 restarts on its untouched volume
  ("rolled back: site is on Postgres 16"). Exit 1. The 18 target is left for inspection, and
  the next preflight refuses it, so reset it before a retry: `docker volume rm rtapps_pgdata18`,
  or for a host path, `sudo find <PGDATA18_PATH> -mindepth 1 -delete`. Check first that it is not
  `PGDATA_PATH`.
- **After a rollback from step 8 onward** (the backup-image build or later), the local backup
  image for the current tag was rebuilt with the 18 client. It still backs up 16 fine, because
  `pg_dump` 18 dumps older servers, and the next deploy pulls the official image.
- **`INCOMPLETE — site may be down`** (exit 2): the automatic recovery failed at the step it
  names. Run the commands printed below that line on the VM. The 16 data is never touched.
- **Still running after 30 minutes:** the job gives up, but the script carries on. Watch the log
  and `EXIT-<ts>`. Deploys are refused until it finishes.

**Manual rollback after a successful run**, if a problem appears later. Writes made on 18 since
the switch are lost, so export them first. On the VM:

```bash
cd /opt/rtapps
cp pg-upgrade/old-<ts>/compose.prod.yaml pg-upgrade/old-<ts>/compose.tunnel.yaml .
rm -rf backup deploy
cp -R pg-upgrade/old-<ts>/backup pg-upgrade/old-<ts>/deploy .
mv pg-upgrade/DONE-<ts> pg-upgrade/rolled-back-DONE-<ts>
IMAGE_TAG=$(cat .deployed) docker compose --env-file .env -f compose.prod.yaml up -d --remove-orphans --wait
```

Add `-f compose.tunnel.yaml` when `USE_TUNNEL=1`. Moving the `DONE` marker aside matters in two
ways:

- with it in place, the guard would refuse every 16 deploy;
- it would also *pass* the next 18 deploy, which would switch the site back to the stale 18 data.

Without it, the guard refuses 18 deploys again until the upgrade is re-run, so revert the 18 PR
on `main` as well.

**Cleanup after about a week:**

- remove the old data with `docker volume rm rtapps_pgdata`. For a host path, run
  `sudo rm -rf <PGDATA_PATH>`, after checking that it is not `PGDATA18_PATH`;
- delete `/opt/rtapps/pg-upgrade/rtapps-pg16-*.dump`, `old-*`, `counts*`, `run-*.log`, `PID-*`,
  `EXIT-*` and `stage/`;
- **keep** `pg-upgrade/DONE-*`, because the guard needs it to keep refusing 16 compose files.

## 10. Monthly checklist

- `apt-get upgrade` + reboot in a quiet window (unattended-upgrades handles security patches).
- Confirm last night's backup object exists and run the restore drill (§7).
- Review **Admin → Audit log** for unexpected educator reads or role changes.
- Review the audit log specifically for `export_csv` and `erase_user` actions — these are the two
  actions with no undo (a CSV once downloaded, an erase once run); confirm each was performed by
  the account it claims and against a cohort/user that account actually owns.
- Yearly: rotate the `age` key (new key → `.env` → next backup is encrypted to it; keep the old
  private key until its backups expire).

## 11. Retention

| Data | Retention |
|---|---|
| `audit_log` rows | ≥ 2 years (NFR-26; no purge job yet) |
| Backups | 30 days (`BACKUP_RETENTION_DAYS`) |
| Sessions | purged 30 days after expiry — `app.tasks.purge_sessions`, scheduled per §5 |
| Attempts, content versions | indefinitely (pseudonymised after erase; `POST admin/users/{id}/erase`) |

## 12. Security notes

- **Per-IP rate limiting assumes the proxy is the only path to the API.** `login`, `register`,
  password-reset and `join` are rate-limited by the caller's IP as the API sees it (NFR-13). In
  this deployment (ADR-0005) that's always the request's immediate peer address — Caddy/cloudflared
  is the only thing that can reach the `api` container, so there is no untrusted hop in front of it
  supplying a spoofable `X-Forwarded-For`. If a CDN or a second proxy is ever added in front of the
  existing proxy, the API would need to trust *that* layer's forwarded-for header instead of the
  raw peer address, and a client that reaches the API directly (bypassing the new front layer)
  could forge the header to spread requests across IPs and evade the limit. **Known follow-up, not
  yet built:** validate/pin the trusted-hop count before adding any layer in front of the current
  proxy; an issue is filed for this at PR time rather than blocking this release, since today's
  topology has no such hop to spoof.
