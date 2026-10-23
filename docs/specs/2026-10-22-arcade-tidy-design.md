# Arcade tidy-up (#77 follow-ups): design

**Date:** 2026-10-22. **Status:** approved by the owner ("small no-change tidy PR").

## Why

The sim-hub and linac-ct modularization (#77 phases 1–2: #78, #79, #80, #87, #89, #90, #97) is done. #77 stays open only for small follow-ups. This PR does the no-behaviour-change ones. It files the two larger ones as their own issues, so #77 then waits only on the owner's walkthrough of both simulators.

## Changes

1. **One shared type for the platform SDK on `window`.**
   - `window.RTApps` (`activityUrl(slug): Promise<string>`, `recordResult(slug, opts?): Promise<{ percent: number | null }>`) is declared today only in `arcade-src/sim-hub/src/sdk-bridge.ts`'s `declare global`. linac-ct type-checks only because `tsconfig.arcade.json` sees sim-hub's declaration.
   - Move it to `apps/web/arcade-src/shared/rtapps-sdk.d.ts`.
   - sim-hub keeps its own app-only globals (`CONSOLE_APP_URL`, `__rtappsVerdictLocked`) in its `declare global`.
   - Member signatures stay exactly as today.
2. **Type-check the CT suite → LINAC messages.**
   - `ct-suite/imaging.ts`'s `rtapps-ct-complete` post gets `satisfies CtCompleteMsg`.
   - `ct-suite/bridge.ts`'s two posts change from `as CtCaseLoadedMsg` / `as CtReadyMsg` to `satisfies`. A cast would accept a missing or misspelled field; `satisfies` rejects it.
   - The message objects themselves are unchanged.
3. **`LinacState.bdSyncFromMachine`** is typed `unknown` (`linac-ct/src/state.ts`) but holds a function (assigned in `main.ts`). Give it its real nullable function type, derived from that assignment and its call sites.
4. **CI runs the arcade bundle smoke check.**
   - In `.github/workflows/pr.yml`'s `web` job, after `test`, add `pnpm --filter web build:arcade`, then from `apps/web`: `node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html`.
   - The script already exists. It stubs a minimal DOM/WebGL and evaluates each built bundle top to bottom. This catches a module-evaluation crash (a page that never loads), which lint, `check` and unit tests cannot see. The phase-1 review found two such crashes that way.
   - Expected cost: about 1–2 minutes per CI run.
5. **File as separate issues:**
   - (a) the LINAC console's startup mirror refresh: `rtapps-linac-bridge-ready` is dispatched after a `return` in `RTAppsLinacMirrorBridge.snapshot()`, so `console-patch.ts`'s listener (`syncMirror()`) has never run on startup. A fix changes simulator behaviour and needs an owner check; moving the dispatch as-is would fire it on every snapshot call.
   - (b) sim-hub's circular imports and the phase-1 dead-code list.

## Constraints

- **No runtime or behaviour change.** The built JavaScript of all three pages must be identical before and after, apart from content-hash file names. Items 1–3 are type-only.
- No new dependencies. The CI step only adds commands.
- GitHub Actions stay SHA-pinned (#145). No new `uses:` is expected.

## Verification

- Web gates: `check` (which includes `tsc -p tsconfig.arcade.json`), lint, `test`, `build:arcade`.
- The smoke check passes for all three pages, locally and in CI.
- Build the arcade on `main` and on the branch, then diff the emitted JS with content hashes normalized: expect no difference.
- The PR's CI `web` job shows the new smoke step passing.
