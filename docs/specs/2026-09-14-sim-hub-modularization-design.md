# Design: sim-hub modularization (issue #77, phase 1 of 2)

**Status:** approved by owner 2026-09-14 (brainstorm + plan-mode review)
**Scope:** `apps/web/arcade/sim-hub` only. linac-ct follows as a separate plan reusing this setup; the ~27 small single-file arcade games are explicitly out of scope.

## Problem

sim-hub is a single-file port from the legacy repo: `apps/web/arcade/sim-hub/index.html`, 1,715 lines, of which lines 405–1713 are one dense 1,309-line `<script type="module">` (multiple statements per line) holding the entire walkable clinic — scene setup, 19 room builders, NPC system, guided-journey state machine, interaction/walk mechanics, and SDK wiring. The phase-4 porting strategy (ship legacy content behind the SDK contract first, restructure later) was deliberate, but maintenance is now line-number surgery in a monolith: the 2026-09 performance work required a three-agent census just to map the file.

## Goal

Convert sim-hub into a Vite-built ES-module source tree with **identical serving semantics**: same URL (`/arcade/sim-hub/index.html`), same SDK postMessage/fetch contract, e2e suite untouched. The behavioral baseline is the owner-accepted perf state (commits `3c0db2b`, `f0e6e6f`, `e818515`, `0b53921` — verified smooth 2026-09-14).

## Decisions (owner-approved)

1. **Build output is gitignored** and produced by the existing `pnpm --filter web build` chain. The Dockerfile already runs that script and packages `arcade/` + `build/` (package.json `"files"`), so Docker, CI, e2e, deploy, and the auth-gated serving route need **zero changes**.
2. **JavaScript, not TypeScript.** The refactor is a mechanical extraction verified by behavior; TS can be adopted per-module later.
3. **Mechanical move only.** Code relocates verbatim (modulo prettier formatting and import/export wiring). Any pre-existing bug discovered mid-move is filed as a GitHub issue, never fixed inline.
4. **Strangler sequence (approach A).** First a pipeline-proof commit moving the whole script verbatim into `src/main.js`; then grouped per-module extraction commits in dependency order, each gated and independently revertible.
5. **`three@0.160.0` becomes a pinned npm dependency and is bundled.** Same version today's CDN import map pins; the import map is deleted. `three/addons/*` import specifiers work unchanged (the npm package exports that alias). Classrooms stop depending on jsdelivr at runtime.
6. **`rtapps-sdk.js` is untouched.** It lives at `apps/web/static/arcade/rtapps-sdk.js` (SvelteKit static); its absolute `<script src="/arcade/rtapps-sdk.js">` tag passes through Vite unmodified.
7. **Execution: subagent-driven development** (fresh implementer + task reviewer per task, final whole-branch review), two PRs.

## Layout

```
apps/web/arcade-src/sim-hub/
  index.html          # shell: head, CSS block, DOM markup, sdk script tag,
                      #   <script type="module" src="./src/main.js"></script>
                      #   (importmap deleted)
  src/*.js            # the modules (below)
apps/web/vite.arcade.config.ts   # root: 'arcade-src/sim-hub', base: '/arcade/sim-hub/',
                                 # build: { outDir: '../../arcade/sim-hub', emptyOutDir: true }
apps/web/arcade/sim-hub/         # BUILD OUTPUT — gitignored, old index.html git-rm'd
```

`apps/web/package.json` additions: `"build:arcade": "vite build -c vite.arcade.config.ts"`; `"build"` becomes `"pnpm build:arcade && vite build"`; `"dev"` becomes `"pnpm build:arcade && vite dev --host 0.0.0.0 --port 5173"` so `pnpm dev` always has fresh output on disk for the serving route (chained explicitly — pnpm does not run `pre*` hooks by default); `"dev:arcade"` watch variant as a convenience; dependency `"three": "0.160.0"` (exact pin).

## Target module map

Boundaries may shift ±1 function during extraction; the implementation plan pins the exact symbol list per task.

| Module | Responsibility |
|---|---|
| `state.js` | shared mutable state: mode, player, camera refs, JOURNEY handle |
| `helpers.js` | box/cyl/sphere/eRbox mesh helpers, canvas-texture makers, materials |
| `scene.js` | renderer, cameras, lighting, shadow config, adaptive perf floor |
| `rooms.js` | 19 room builders, lobby, doors, room lighting |
| `npc.js` | rigs, roles, labels, speech bubbles |
| `npc-behavior.js` | movers, duty animations, exchanges, handoffs |
| `equipment.js` | clinical equipment, beacons, ambulance, operator feeds, wall clocks |
| `walk.js` | player movement, collision, door proximity, travel |
| `interact.js` | interactables, prompts, staff dialogues |
| `journey.js` | guided-journey state machine, camera follow, room timing |
| `sdk-bridge.js` | ROOM_APP_URL/CONSOLE_APP_URL resolution, QA scoring, recordResult wiring |
| `main.js` | bootstrap + animate loop composing everything |

## Lint/format policy

- New `arcade-src/` source is prettier-covered from the first commit (formatting-only, safe; makes extraction diffs readable). The dense legacy code expands considerably under prettier — this is expected and happens once, in the pipeline-proof commit.
- `arcade-src/**` is **eslint-ignored during extraction** (the project rules would spray non-mechanically-fixable findings across legacy Three.js code). The final task of the plan enables eslint for `arcade-src/**` and resolves findings in its own reviewed commit — auto-fixes and targeted disables only; any behavior-touching fix is escalated, not applied silently.
- Built output at `apps/web/arcade/sim-hub/` remains excluded from prettier/eslint via the existing `arcade/` ignore entries.

## Delivery structure

- **PR 1** (branch `refactor/sim-hub-vite`): the pipeline proof — scaffold, verbatim `main.js`, script/ignore wiring, `git rm` of the old tracked `index.html` plus the `.gitignore` entry for the output dir. Merge → auto-deploy → **owner walk** confirming identical behavior and perf.
- **PR 2** (branch `refactor/sim-hub-modules`): the grouped extractions (state+helpers → scene → rooms → npc+npc-behavior → equipment → walk+interact → journey+sdk-bridge), then the eslint-enablement task; final whole-branch review; merge → deploy → **owner walk**.

## Verification

- Per task: `pnpm --filter web lint`, `check`, `test` (161 tests) all green and `pnpm --filter web build:arcade` succeeds; the task reviewer verifies the diff is pure relocation (moved code textually identical modulo prettier + import/export wiring).
- Per push: CI's fresh-stack e2e (`simulator.e2e.ts`: sdk_slug resolve → hub load → door handoff → SDK submit) on the self-hosted runner arbitrates. The spec relies on the e2e matching frames by `/arcade/sim-hub` URL substring, which tolerates hashed asset filenames; the serving route's extension allow-map already admits `.js`, and sim-hub references zero static assets, so output is only `index.html` + hashed JS.
- Owner acceptance: walk the deployed site after each PR (walk mode across wings, one full guided journey, QA scoring, both doors — Treatment Vault and Learning Commons console).

## Out of scope

TypeScript, any logic/behavior change, linac-ct (phase 2, own plan), the small games, cache-header upgrades for hashed assets, geometry/draw-call optimizations.
