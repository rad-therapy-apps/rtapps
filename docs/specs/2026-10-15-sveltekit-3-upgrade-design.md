# SvelteKit 3 upgrade: design

**Date:** 2026-10-15. **Status:** approved by the owner (switch `$lib` to `#lib` with the official migration tool). **Replaces:** Dependabot PRs #141 (`@sveltejs/kit` 3.0.1) and #128 (`@sveltejs/adapter-node` 6.0.0).

## Why

- SvelteKit 3.0.0 was released on 2026-10-01. `@sveltejs/adapter-node` 6 only works with SvelteKit 3: its peer dependency is `@sveltejs/kit ^3.0.0-next.0`. So the two must move together.
- SvelteKit 2 is now the previous major. New fixes land in 3.x first, and how long 2.x keeps getting backports is not announced, so staying on 2 grows that risk over time.

## Goal

- Move `apps/web` from SvelteKit **2.70.3** to the newest **3.x** that is at least 7 days old when installed. On 2026-10-15 that is **3.0.1**; 3.1.0 becomes allowed on 2026-10-21.
- Move adapter-node from **5.5.7** to **6.0.0**.
- Users and authors see no difference: same look, same copy, same behaviour.
- Svelte (5.57), Vite (8.3), `@sveltejs/vite-plugin-svelte` (7.3), TypeScript (6) and Node (24) stay where they are. All of them already meet SvelteKit 3's requirements:

| Requirement | SvelteKit 3 needs | We have |
|---|---|---|
| Vite | `^8.0.12` | 8.3.4 |
| Svelte | `^5.57.1` | 5.57.2 |
| TypeScript | `^6` | 6.0.3 |
| `@sveltejs/vite-plugin-svelte` | `^7` | 7.3.1 |
| Node | `>=22.17` | 24 |

- Other Svelte-ecosystem packages accept SvelteKit 3:
  - `@sentry/sveltekit` 11.6.0 declares `kit 2.x || 3.x`.
  - `vitest-browser-svelte`, `svelte-check`, `eslint-plugin-svelte` and `prettier-plugin-svelte` declare no SvelteKit peer.

Sources:
- Migration guide: https://svelte.dev/docs/kit/migrating-to-sveltekit-3
- Changelogs: `packages/kit/CHANGELOG.md` and `packages/adapter-node/CHANGELOG.md` in sveltejs/kit
- Migration tool: https://svelte.dev/docs/cli/sv-migrate

## Breaking changes that touch our code

### 1. `$lib` is removed

The build now fails with "`$lib` has been removed. Use `#lib` instead" (`module_removed_lib` in kit's build errors). Our code uses it in 242 import lines across 79 files, all under `apps/web/src/`.

**Decision (owner):** rewrite to the new style rather than use the deprecated `alias: { '$lib': 'src/lib' }` escape hatch. The rewrite:
- moves imports from `$lib/x` to `#lib/x.js`, with explicit extensions;
- adds an `"imports"` map to `apps/web/package.json`.

It is done by the official tool, `sv migrate sveltekit-3` (`lib-alias` task).

### 2. TypeScript config

- `apps/web/tsconfig.json` extends `./.svelte-kit/tsconfig.json`. SvelteKit 3 replaces that with `$app/tsconfig`, and the project lists its own `include`/`exclude` (the tool's `tsconfig` task).
- The new base turns on `isolatedModules` and `verbatimModuleSyntax`. These may surface new type errors, mostly type-only imports that need `import type`. They are fixed by hand.
- `tsconfig.arcade.json` is checked the same way.

### 3. Moved or deprecated APIs

| Where | Today | SvelteKit 3 |
|---|---|---|
| `src/hooks.server.ts`, `src/lib/server/api.ts` | `$env/dynamic/private` (deprecated alias) | `$app/env/private` (tool's `environment` task; it also generates `src/env.ts`) |
| `src/hooks.server.ts` | `Handle`, `HandleServerError` from `@sveltejs/kit` | from `@sveltejs/kit/hooks` (tool's `imports` task) |
| `src/routes/health/+server.ts` | `json()` (deprecated) | `Response.json()` |
| `src/lib/author/PublishPanel.svelte` | `invalidateAll` (deprecated) | `refreshAll` |
| `src/hooks.server.test.ts` | `vi.mock('$env/dynamic/private', …)` | the mocked path must follow the import (the tool does not rewrite mocks) |

Wherever `RequestEvent` is imported (`api.ts`, `api.test.ts`, `simulator/+page.server.ts`), the type checker decides whether it moved.

### 4. The site's origin in production (adapter-node 6)

- adapter-node 6 no longer reads the `ORIGIN` environment variable; it is missing from its `expected` list in `src/env.js`. The only replacement is a build-time `paths.origin`.
- Without that setting, the adapter derives each request's origin from:
  - the `host` header;
  - the protocol, which defaults to `https` unless `PROTOCOL_HEADER` is set.

**Decision: rely on the derived origin. Do not set `paths.origin` or `PROTOCOL_HEADER`.**

- **Why not `paths.origin`:** it would fix one domain into the image. We build one image and deploy it to `test`, and later to `prod` on a different domain.
- **Why the derived origin is correct on our deployments.** Requests arrive as browser → Cloudflare (https) → `cloudflared` → Caddy (`:80`) → `web:3000`.
  - `cloudflared` and Caddy's `reverse_proxy` both pass the original `Host` through unchanged, so the host is the public hostname.
  - The default protocol is `https`, which is what the browser used.
- **Why not `PROTOCOL_HEADER=x-forwarded-proto`:** Caddy receives plain HTTP from the tunnel and would report `http`. That would produce an origin of `http://…`, which mismatches the browser's `https://` Origin and makes every form POST fail SvelteKit's CSRF check with 403.
- **Without the tunnel**, Caddy terminates TLS itself and still passes `Host`. The `https` default is still right.
- **`ORIGIN` stays in both compose files**, because `src/lib/server/api.ts` reads it for the Origin header it sends to the API (the API's own CSRF check). Only the comment changes, to say that `ORIGIN` now serves only that purpose.

### 5. Error reporting (`handleError`)

- In SvelteKit 3 the server `handleError` hook runs for every error.
- Its input carries `kind`:
  - `'app'`: our own `error(…)` calls, such as the many `error(404)` loads;
  - `'framework'`: errors SvelteKit makes, such as a route that doesn't exist;
  - `'unknown'`: real crashes.
- Today's hook would forward all of them to Sentry, including routine 404s.

**Decision:** call `Sentry.captureException` only when `kind === 'unknown'`, so Sentry stays crash-only. A test pins this.

## Behaviour changes we accept (no code change)

- **Failed form actions return their `fail()` status** (for example 400) instead of 200 on enhanced submissions. The page shows the same message. The plan checks that no unit or e2e test asserts the old status.
- **Version polling.** `version.pollInterval` now defaults to one hour, and the app checks for a new build when the tab regains focus. Clicking a link to the current page refreshes its data. This is harmless for us.
- **Static files.** adapter-node serves only the static files present at build time, and only to GET/HEAD. ETags are content hashes, and `Last-Modified` is gone.
  - Arcade games are served by our own endpoint (`(app)/arcade/[slug]/[...file]/+server.ts`), so they are unaffected.
  - `/arcade/rtapps-sdk.js` is a build-time static file and remains served.
- **Cross-origin POSTs without a `Content-Type` are rejected.** Our forms are same-origin.

## Changes we checked and do not use

None of these appear in `apps/web`:

- `svelte.config.js` options (the config lives in `vite.config.ts`)
- `$app/stores`
- `$app/environment`
- `base` / `assets` paths
- the service worker
- `src/params`
- remote functions
- shallow routing
- `error(status, object)`
- `instanceof` checks on `HttpError`/`Redirect`
- `csrf.checkOrigin`
- prerendering
- `@sveltejs/kit/node`
- external redirects

`page.url` becomes read-only, and `src/routes/+layout.svelte` only reads `.pathname`.

## Implementation shape

One PR on branch `deps/sveltekit-3`, with one commit per step so each can be reviewed alone:

1. **Docs:** this spec and the implementation plan.
2. **Tool commit:**
   - Bump both packages, run `sv migrate sveltekit-3`, and commit only its output.
   - Keep the tool's "migration instructions" report in the scratch ledger.
   - This diff must be mechanical.
3. **Manual fixes:**
   - tsconfig plus any `isolatedModules`/`verbatimModuleSyntax` type errors;
   - `Response.json`, `refreshAll`, and the `vi.mock` path;
   - every `@migration-task` item the tool left.
4. **Sentry `kind` filter:** test first, seen failing, then the filter.
5. **Compose comments** for `ORIGIN`.

## Verification

- `pnpm --filter web lint`, `check` and `test` (317 tests today) pass with no test weakened. The vitest 5 lesson applies: any assertion edit is reviewed for vacuous `.not` checks.
- CI's `e2e` job passes. It runs the **dev server** (`infra/compose.yaml`), so it does not exercise adapter-node.
- **Production-build check before merge (closes the gap CI doesn't cover):**
  - Build the real `web` image and run the full Playwright suite against the local prod-like stack (`infra/compose.prod.yaml`, scratch env).
  - Sign in once through the browser. That proves the form POST passes the origin/CSRF check on adapter-node 6.
  - The local stack is plain `http://localhost`, where the `https` default would mismatch. So that scratch run alone sets `PROTOCOL_HEADER=x-forwarded-proto` on `web`; there Caddy truthfully sends `http`. The setting goes in a scratch compose override file in the session scratchpad, is recorded in the plan, and is never committed.
  - Separately, the same stack is run once **without** that override, matching the committed config. Two curl form POSTs to `http://localhost:8080/login` (`Content-Type: application/x-www-form-urlencoded`) are expected to behave as follows:
    - With `Origin: https://localhost:8080`, SvelteKit's CSRF check must pass: any response except 403 "Cross-site POST form submissions are forbidden".
    - With `Origin: http://localhost:8080`, it must be rejected with that 403.

    That proves the derived origin is `https://` plus the forwarded host, which is what the browser sends on test.rttlearn.com.
- **After deploy:** `/login` and `/api/v1/health` return 200, and one real sign-in on test.rttlearn.com succeeds.
- **Rollback:** this is one squash commit, so `git revert` plus the normal deploy restores SvelteKit 2. There are no database or API changes.
