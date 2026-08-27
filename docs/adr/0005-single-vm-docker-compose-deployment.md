# ADR-0005: Single VM running Docker Compose, images from GHCR, Caddy or Cloudflare Tunnel

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Chris Guzman (lead developer)
- **Related:** ADR-0001 (arm64 images, Alembic), ADR-0002 (proxy is the single origin)

## Context

Nothing is in production. The 2026-10-30 objective requires a working vertical slice *deployed to a test environment* and a deploy that is one workflow run. Budget is effectively zero: the candidate host is Oracle Cloud's Always Free ARM tier (up to 4 OCPU / 24 GB across A1 instances, 200 GB block storage, 10 GB object storage) with Cloudflare for DNS, TLS or Tunnel, and R2 or OCI Object Storage for media and backups. Expected load is one institution — tens of concurrent students during a lab, near zero otherwise. The system is five containers (`proxy`, `web`, `api`, `db`, `storage`) plus a cron container. The owner is the only operator; the mentor cannot help with infrastructure. Design must stay host-agnostic (S3 API only, no cloud-specific services) because the free tier is not a contract.

Forces: simplicity of operation by one person; reproducibility between dev and prod (same Compose topology); a credible backup/restore story for student data; zero recurring cost; ability to leave the host without rewriting anything.

## Decision

- **One VM** (Oracle A1, arm64, Ubuntu LTS) runs **Docker Compose** with `compose.prod.yaml`: `proxy`, `web`, `api`, `db` (Postgres 16 on a mounted **block volume**), `backup` (cron), and either `storage` (MinIO) or an external S3 bucket (R2/OCI) — prod default is the external bucket, MinIO stays for dev.
- **Images** are built in GitHub Actions (`main.yml`, multi-arch arm64 + amd64) and pushed to **GHCR** tagged `sha` and `latest`; prod pins by `sha`. No bind mounts, no builds on the VM.
- **Ingress**: Caddy with automatic TLS on ports 80/443 **or** `cloudflared` (Cloudflare Tunnel, no inbound ports, Cloudflare terminates TLS and Caddy serves plain HTTP internally). Both variants are checked in under `infra/`; the tunnel is the default when the VM sits behind Oracle's security list, since it needs no open ports.
- **Migrations** run as a one-shot deploy step — `docker compose run --rm api alembic upgrade head` — *before* `up -d`, never on container start. A failed migration aborts the deploy with the old containers still serving.
- **Deploy** = `deploy.yml` (`workflow_dispatch`, auto to `test` on `main`; `prod` requires a reviewer via GitHub Environments): SSH → `compose pull` → migrate → `up -d` → health curl → on failure, `compose up -d` with the previous `sha` (recorded in `/opt/rtapps/.deployed`).
- **Backups**: `backup` container runs `pg_dump -Fc` nightly, encrypts with `age`, uploads to object storage with 30-day retention; weekly restore drill into a scratch database is a Phase 2 exit criterion. Media in object storage is versioned by the bucket.
- **Secrets** live only in `/opt/rtapps/.env` on the VM (mode 600), never in CI variables beyond the SSH key and GHCR token.
- **Observability** v1: structured JSON logs to stdout, `docker compose logs` with rotation, `/health` endpoints, Cloudflare analytics. No metrics stack.

## Options considered

### A. Single VM + Docker Compose + GHCR + Caddy/cloudflared — chosen

- **Pros:** zero cost; dev and prod are the same Compose file family, so "works on my machine" *is* the deployment; one SSH session explains the entire system; Postgres, MinIO, cron all colocated with no egress charges; host-agnostic — the same `compose.prod.yaml` runs on Hetzner, a campus VM or a laptop tomorrow.
- **Cons:** single point of failure (VM, disk, region); no zero-downtime deploys (a few seconds of 502 during `up -d`); the owner is the on-call; Oracle reclaims idle Always Free instances and the ARM capacity is often unavailable at creation time; security patching of the host OS is manual (`unattended-upgrades` + monthly reboot window).

### B. PaaS — Fly.io, Render, Railway

- **Pros:** git-push deploys, managed Postgres with backups, TLS, zero-downtime rollouts, health-checked restarts; the owner never touches a host.
- **Cons:** not free for this shape: managed Postgres with persistence is USD 7–20/month everywhere, three services plus a database lands at USD 20–40/month; free tiers sleep (Render) or have been removed (Railway, Fly trial credits); object storage still external; Fly's Postgres is "unmanaged managed"; egress between services can cost. A good second step (see scaling path), not a zero-budget first step.

### C. Managed Kubernetes (OKE, GKE, EKS)

- **Pros:** industry-standard orchestration, rolling deploys, secrets, horizontal scaling, Helm ecosystem; Oracle's control plane is free.
- **Cons:** the worker nodes are the same free ARM VMs, so no capacity is gained; a stateful Postgres on Kubernetes needs an operator (CloudNativePG) and PVC discipline that the sole operator would be learning under deadline; manifests/Helm for six services are several times the size of the Compose file; local dev would diverge (kind/minikube) from prod. Nothing in the requirements needs orchestration. Rejected as the wrong scale by an order of magnitude.

### D. Serverless — Cloudflare Workers/Pages + D1 or Neon

- **Pros:** genuinely free at this traffic; global edge; no host to patch; SvelteKit has a Cloudflare adapter.
- **Cons:** the API is Python (ADR-0001) and Workers run JavaScript/WASM — Python Workers exist but not with `asyncpg`, `numpy` or `pydicom`; D1 is SQLite (rejected in ADR-0001 §E) and Neon's free tier pauses; cookie-session SSR with a server-forwarded cookie works, but long-running grading, presigned uploads to R2 and a cron for backups become separate Worker/Queue/Cron products with their own limits. Would force a stack change for the hosting bill of zero that option A already achieves.

## Scaling path

| Trigger | Change | What stays the same |
|---|---|---|
| p95 API latency > 500 ms or VM CPU > 70 % during labs | Move `db` to a second VM (still Compose) or a managed Postgres (Neon/Supabase-DB-only/OCI); point `DATABASE_URL` at it | Images, `compose.prod.yaml` minus the `db` service, migrations step |
| A second institution / program | Same VM first (`program_id` is on every row); split only if data isolation is contractual | Everything; multi-tenancy is in the schema already |
| Downtime during deploy becomes unacceptable | Two `api` replicas behind Caddy with `--wait`; or move `web`+`api` to a PaaS (option B) and keep Postgres self-hosted or managed | Images, migrations step, S3 API |
| Media processing (DICOM/NIfTI derivation) needs a worker | Add `worker` service (`arq`) and Redis to Compose | API contract; storage layout |
| Free tier revoked or ARM capacity lost | Restore from `pg_dump` + bucket sync onto any Docker host | All of it — this is why nothing is Oracle-specific |
| More than ~3 services need coordination or more than one operator | Reconsider Kubernetes (option C) | Images are already OCI; Compose → Helm is mechanical |

The first split is always the database, and it never requires changing application code.

## Consequences

### Positive

- Production is reproducible from `infra/` and a `.env` file; a new maintainer can stand it up in an hour.
- Test and prod are the same shape on the same VM (separate Compose project names and ports) or on two VMs; promoting is re-running `deploy.yml` with a `sha`.
- Backups are boring: one file per night, encrypted, restore-tested.
- Zero recurring cost through Phase 4.

### Negative

- Availability is that of one VM in one region. Acceptable for a course tool; documented for the mentor so expectations are set.
- The owner must patch the host, rotate the `age` key and check that backups actually upload. A monthly checklist lives in `docs/05-setup.md`.
- Oracle Always Free is best-effort: instance creation can fail for weeks, and idle reclaim requires a keep-alive. If it fails, the fallback is Hetzner CAX11 (arm64, ~EUR 4/month) with the same files.
- No metrics or alerting beyond Cloudflare's; the first sign of trouble may be a student.

### Neutral

- `cloudflared` puts Cloudflare in the request path (TLS termination, logs). For a same-origin app this is fine; it also gives Access policies for the admin routes if wanted later.
- MinIO in prod is optional; using R2/OCI directly removes one container but adds an external dependency for media. Decided per environment in `.env`.

## Follow-ups / what would make us revisit

- Phase 2 exit: test VM up; `deploy.yml` green end-to-end; restore drill completed and timed.
- Revisit option B when the program funds ~USD 30/month or a second operator needs a dashboard rather than SSH.
- Revisit option C only at the "more than one operator, several services" trigger above.
- Re-evaluate `cloudflared` vs. Caddy TLS after the first term based on Cloudflare's WebSocket/upload limits for media.
