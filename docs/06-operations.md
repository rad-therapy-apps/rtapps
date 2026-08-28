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
R2, OCI Object Storage or any S3-compatible service), `BACKUP_BUCKET`, and the ingress values from
§3. Every variable is documented inline in `infra/prod.env.example`. Never commit `.env`; never
put its values in GitHub secrets.

### Backup encryption key

```bash
age-keygen -o rtapps-backup.key        # keep this file OFFLINE (password manager / encrypted disk)
grep 'public key' rtapps-backup.key    # → BACKUP_AGE_RECIPIENT in .env
```

Losing the private key means the backups cannot be decrypted. Rotate it yearly (§9).

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
- What a deploy does on the VM (`infra/deploy/deploy.sh`): copy the compose files → `docker login`
  to GHCR → `compose pull` → **one-shot** `compose run --rm api alembic upgrade head` → `compose up
  -d --wait` → record the SHA in `/opt/rtapps/.deployed`. If `up --wait` fails, it restarts the
  previous SHA and exits non-zero; the workflow then fails visibly. Migrations never run on
  container start (ADR-0005), so a bad migration can never loop a restarting container.

### First deploy on `test`

```bash
ssh deploy@YOUR_HOST 'cd /opt/rtapps && docker compose --env-file .env -f compose.prod.yaml run --rm api python -m app.seed'
```

The seed refuses to run when `ENV=prod`. Sign in as `admin@example.com` (`rtapps-dev-password`),
open **Admin → Users**, and promote the mentor's account to `educator` (audited). On `prod`, create
the first admin by registering normally and promoting the row with `psql` once:
`UPDATE "user" SET role = 'admin' WHERE email = '…';`.

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

Take a backup now / check that uploads work:

```bash
docker compose --env-file .env -f compose.prod.yaml run --rm -e RUN_ONCE=1 backup
docker compose --env-file .env -f compose.prod.yaml run --rm --entrypoint mc backup ls backup/rtapps-backups/postgres/
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

## 9. Monthly checklist

- `apt-get upgrade` + reboot in a quiet window (unattended-upgrades handles security patches).
- Confirm last night's backup object exists and run the restore drill (§7).
- Review **Admin → Audit log** for unexpected educator reads or role changes.
- Yearly: rotate the `age` key (new key → `.env` → next backup is encrypted to it; keep the old
  private key until its backups expire).

## 10. Retention

| Data | Retention |
|---|---|
| `audit_log` rows | ≥ 2 years (NFR-26; no purge job yet) |
| Backups | 30 days (`BACKUP_RETENTION_DAYS`) |
| Sessions | purged 30 days after expiry — purge job is plan-3 backlog |
| Attempts, content versions | indefinitely (pseudonymised after erase — erase itself is plan-3) |
