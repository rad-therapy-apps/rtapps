# ADR-0002: Same-origin reverse proxy with server-side cookie sessions

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Chris Guzman (lead developer)
- **Related:** ADR-0001 (stack), ADR-0005 (proxy deployment)

## Context

The app is two services: SvelteKit (`web`, SSR, adapter-node) and FastAPI (`api`). The browser must call the API directly (client-side fetches after hydration) *and* SvelteKit must call it during `load()` on the server. Users are students on shared lab machines and personal devices, educators, an author (the mentor) and an admin. Requirements: email + password and Google OAuth, self-hosted (budget ≈ free, student PII stays in our database), roles `student / educator / admin`, instant revocation, an `audit_log` of educator reads of student data.

Forces: solo developer — the auth surface must stay small and testable; no CORS if avoidable; the SDK for games/simulators (ADR-0004, Phase 4) may later run on another origin; instant logout/revoke is required because students share machines; the mentor is not going to configure an identity provider.

## Decision

1. **One origin.** A reverse proxy (`proxy` service: Caddy with auto-TLS, or plain HTTP behind `cloudflared`) routes `/api/*` → `api:8000` and everything else → `web:3000`. The browser only ever sees `https://app.example/…`. No CORS configuration exists.
2. **Opaque server-side sessions.** Login creates a 256-bit random token; the database stores `sha256(token)` in `session` (`user_id, expires_at, ua_hash, revoked_at, created_at`). The raw token is only in the cookie.
3. **Cookie.** `rt_session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, 14-day sliding expiry (extended on any authenticated request older than 1 hour since last extension). Set by the API on `/api/v1/auth/login`, `…/register`, `…/google/callback`; cleared and row revoked on `…/logout`.
4. **SSR forwarding.** SvelteKit `hooks.server.ts` calls `GET http://api:8000/api/v1/auth/me` once per request, forwarding the incoming `Cookie` header, and stores the result in `locals.user`; route groups `(student) (educator) (author) (admin)` redirect or 403 from their `+layout.server.ts`. `load()` functions call the API with the same forwarded header. `web` never touches the database.
5. **CSRF.** `SameSite=Lax` blocks cross-site cookie sends on non-navigation requests; the API additionally rejects any non-GET request whose `Origin` (or `Referer` fallback) is not in the allow-list (`APP_ORIGIN`). No CSRF tokens.
6. **Passwords** argon2id (`argon2-cffi`); **Google** via Authlib authorization-code flow, linked to a user by verified email through the `identity` table; account exists only if email matches or is newly registered.

### Login

```mermaid
sequenceDiagram
  participant B as Browser
  participant P as proxy (Caddy)
  participant A as api (FastAPI)
  participant D as Postgres
  B->>P: POST /api/v1/auth/login {email, password} (Origin: app)
  P->>A: forward
  A->>A: check Origin allow-list, argon2id verify
  A->>D: INSERT session(user_id, token_hash, expires_at, ua_hash)
  A-->>B: 200 {user} + Set-Cookie: rt_session=…; HttpOnly; Secure; SameSite=Lax
  B->>P: GET /student (navigation, cookie attached)
```

### SSR page load

```mermaid
sequenceDiagram
  participant B as Browser
  participant P as proxy
  participant W as web (SvelteKit SSR)
  participant A as api
  participant D as Postgres
  B->>P: GET /student/lessons/rbe (Cookie: rt_session)
  P->>W: forward
  W->>A: GET http://api:8000/api/v1/auth/me (Cookie forwarded)
  A->>D: SELECT session JOIN user WHERE token_hash=… AND not revoked AND not expired
  A-->>W: 200 {user, role}  (or 401 → redirect /login)
  W->>A: GET /api/v1/lessons/rbe (Cookie forwarded)
  A-->>W: 200 snapshot (answers stripped)
  W-->>B: rendered HTML; later client fetches hit /api/* on the same origin
```

## Options considered

### A. Same-origin proxy + API-owned cookie sessions, SSR forwards the cookie — chosen

- **Pros:** one auth implementation, in the service that also enforces authorization; no CORS; revocation is a row update; SDK/games can reuse the same API; `web` stays stateless; cookie attributes are the entire client-side security model.
- **Cons:** every SSR request costs one extra `GET /auth/me` round-trip (in-network, ~1 ms, but present); two services must agree on cookie name and path; the proxy is a hard dependency even in dev (mitigated: Compose runs Caddy on :8080 with the prod routing).

### B. Full BFF — SvelteKit owns sessions and proxies every API call

- **Pros:** the API can be private with no auth of its own (trusts a header from `web`); SvelteKit's `cookies` API is convenient; one hop from browser to `web`.
- **Cons:** the API then *cannot* be called by anything but `web` — games, simulators and the future educator app would all have to go through the SvelteKit process; authorization logic would live in TypeScript while the data it guards is in Python; every API call is proxied by Node, doubling the serialisation work; a header-trusting API is one misconfiguration away from an open database. Rejected because the API is explicitly a shared service.

### C. JWT access + refresh tokens

- **Pros:** stateless verification; works identically from any origin (games SDK); familiar to most developers.
- **Cons:** revocation requires a denylist, which is a session table by another name; refresh-token rotation and storage (`localStorage` is XSS-readable, so a cookie is needed anyway) reintroduce all the cookie questions; token contents (role) go stale until refresh, which matters when an admin changes a role or deactivates a student on a shared machine. More moving parts for no benefit at this scale.

### D. Third-party auth (Clerk, Auth0, Firebase Auth)

- **Pros:** hosted login UI, MFA, social providers, breach handling done by specialists; fastest to demo.
- **Cons:** student PII leaves our database and jurisdiction; free tiers cap monthly active users (Auth0 7,500, Clerk 10,000) which is fine today but is a pricing cliff for an educational program; every backend request still needs a verifier and a local `user` row; vendor outage = nobody can log in; mentor/institution is more comfortable with a self-hosted list of students. Rejected for data ownership and lock-in.

## Consequences

### Positive

- The client-side security model is four cookie attributes plus an `Origin` check; the server-side model is one table. Both are unit-testable.
- Logout and admin deactivation take effect on the next request, everywhere.
- `web` has no secrets except `API_INTERNAL_URL`; it can be rebuilt or scaled without touching auth.
- No CORS headers anywhere, so no preflight requests and no accidental wildcard.

### Negative

- `SameSite=Lax` means an authenticated cross-site *top-level GET* still sends the cookie; therefore GET endpoints must never mutate state (enforced by convention and an API test that asserts all mutating routes are non-GET).
- The `Origin` allow-list must be updated for every new origin (test VM, prod); a mismatch silently 403s all writes. Mitigated by a startup log line and a health check that posts to a no-op endpoint.
- Session rows accumulate; a nightly delete of expired/revoked rows is needed (goes in the `backup` cron container, ADR-0005).
- The games SDK on a *different* origin cannot use this cookie. Phase 4 must add either a subdomain layout (`games.app.example`, cookie `Domain=.app.example`) or a scoped bearer token minted from a session. Decision deferred to Phase 4.

### Neutral

- Argon2id parameters (`time_cost=3, memory_cost=64 MiB`) are tuned for the ARM free-tier VM; login p95 should stay under 300 ms.
- `ua_hash` is stored for the session list UI ("log out other devices"), not for enforcement.

## Follow-ups / what would make us revisit

- Phase 2: permission-matrix test (every role × every route group × GET/mutating) must be green before the vertical slice is deployed.
- Phase 4: decide subdomain cookie vs. bearer token for the SDK; if a second first-party origin appears, revisit CORS.
- Revisit option D if the institution mandates SSO (SAML/OIDC against a campus IdP); Authlib can add an OIDC provider without changing the session model.
- Revisit option C only if the API must be consumed by a mobile app or a third party without a browser.
