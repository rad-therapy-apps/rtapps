# Arcade Tidy-up (#77 follow-ups) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type-only clean-ups in the two arcade simulators, plus a CI step that runs the existing arcade bundle smoke check, with no change to what runs in the browser.

**Architecture:** One task on branch `chore/arcade-tidy`, delivered as two commits:
- the type changes, proven behaviour-neutral by diffing the built JS;
- the CI step.

Spec: `docs/specs/2026-10-22-arcade-tidy-design.md`.

**Tech Stack:** TypeScript (`apps/web/tsconfig.arcade.json`), Vite arcade builds (`vite.arcade.config.ts`, `vite.arcade.linac-ct.config.ts`), GitHub Actions.

## Global Constraints

- **No runtime or behaviour change.** The built JS of `arcade/sim-hub`, `arcade/linac-ct` (index) and `arcade/linac-ct/ct-suite` must be identical before and after, apart from content-hash file names.
- Member signatures of `window.RTApps` stay exactly: `activityUrl: (slug: string) => Promise<string>` and `recordResult: (slug: string, opts?: { score?: number }) => Promise<{ percent: number | null }>`.
- No new dependencies. No new `uses:` in workflows. Actions stay SHA-pinned.
- Never read, create or edit any file whose name starts with `.env`. Never `git add` anything under `.superpowers/`.
- Stay on branch `chore/arcade-tidy`. Never switch branches, push, stash or force.
- Commit trailer: `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: Arcade type tidy + CI smoke step

**Files:**
- Create: `apps/web/arcade-src/shared/rtapps-sdk.d.ts`
- Modify: `apps/web/arcade-src/sim-hub/src/sdk-bridge.ts` (its `declare global`, near line 50)
- Modify: `apps/web/arcade-src/linac-ct/src/ct-suite/imaging.ts` (the `rtapps-ct-complete` post, near line 793)
- Modify: `apps/web/arcade-src/linac-ct/src/ct-suite/bridge.ts` (lines ~22 and ~30)
- Modify: `apps/web/arcade-src/linac-ct/src/state.ts` (`bdSyncFromMachine: unknown;`, line ~365)
- Modify: `.github/workflows/pr.yml` (the `web` job)

- [ ] **Step 1: Baseline build, before any edit.**

```bash
cd apps/web && pnpm build:arcade >/dev/null 2>&1 && echo built
B=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/arcade-before
rm -rf "$B" && mkdir -p "$B" && cp -R arcade/sim-hub arcade/linac-ct "$B"/
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
```

Expected: `built`, then three `SMOKE OK` lines (one per page).

- [ ] **Step 2: Shared SDK type.**
  - Create `apps/web/arcade-src/shared/rtapps-sdk.d.ts`. It holds a header comment in the project style ("What this file does / Used here and why / How it fits / Depends on / Used by"), then:

```ts
export {};

declare global {
	interface Window {
		RTApps?: {
			activityUrl: (slug: string) => Promise<string>;
			recordResult: (
				slug: string,
				opts?: { score?: number }
			) => Promise<{ percent: number | null }>;
		};
	}
}
```

  - In `sim-hub/src/sdk-bridge.ts`, remove only the `RTApps?` member from its `declare global { interface Window { … } }`. Keep `CONSOLE_APP_URL?` and `__rtappsVerdictLocked?`.
  - Update the comment above that block to say the SDK type now lives in `arcade-src/shared/rtapps-sdk.d.ts`.
  - Confirm `apps/web/tsconfig.arcade.json`'s `include` covers `arcade-src/shared/**`. It includes `arcade-src/**/*.ts`, which matches `.d.ts`.
  - Also confirm the two Vite arcade configs type-check nothing themselves. Vite strips types, so a `.d.ts` needs no import.

- [ ] **Step 3: Typed CT messages.**
  - In `ct-suite/imaging.ts`, the posted object becomes `{ type: 'rtapps-ct-complete', key: …, patient: …, series: …, images: n } satisfies CtCompleteMsg`. Import `type CtCompleteMsg` from `../ct-protocol`, using the same relative path style as `bridge.ts`.
  - In `ct-suite/bridge.ts`, replace `} as CtCaseLoadedMsg,` with `} satisfies CtCaseLoadedMsg,` and `{ type: 'rtapps-ct-ready' } as CtReadyMsg` with `{ type: 'rtapps-ct-ready' } satisfies CtReadyMsg`.
  - If `satisfies` reports a real mismatch, STOP and report it. Do not change the message shape.

- [ ] **Step 4: `bdSyncFromMachine` type.**
  - Read the assignment in `linac-ct/src/main.ts` (`S.bdSyncFromMachine = (control, delta) => { … }`, ~line 2089) and every call site (`grep -rn "bdSyncFromMachine" arcade-src`).
  - In `state.ts`, replace `bdSyncFromMachine: unknown;` with a nullable function type matching them. For example, if `control` is a string axis name and `delta` a number and it returns nothing: `bdSyncFromMachine: ((control: string, delta: number) => void) | null;`. Use the narrowest parameter types the call sites actually pass.
  - Leave the initial `bdSyncFromMachine: null,` as is.
  - Remove any casts at call sites that become unnecessary. Do not change logic.

- [ ] **Step 5: Gates and the no-runtime-change proof.**

```bash
cd apps/web
pnpm check 2>&1 | tail -1                      # 0 ERRORS (23 pre-existing warnings OK)
pnpm exec eslint arcade-src src && echo eslint ok
pnpm exec prettier --check arcade-src | tail -1
pnpm test 2>&1 | grep -E "Test Files|Tests " | tail -2   # 326 passed, unchanged
pnpm build:arcade >/dev/null 2>&1 && echo built
node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
B=/private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/arcade-before
# Compare every emitted .js/.html with content hashes normalized:
python3 -I - "$B" <<'PY'
import sys, pathlib, re, hashlib
before = pathlib.Path(sys.argv[1]); after = pathlib.Path('arcade')
norm = lambda t: re.sub(r'-[A-Za-z0-9_-]{8}\.(js|css)', r'-HASH.\1', t)
def files(root):
    out = {}
    for p in root.rglob('*'):
        if p.suffix in ('.js', '.html') and p.is_file():
            rel = norm(str(p.relative_to(root)))
            out[rel] = hashlib.sha256(norm(p.read_text(errors='replace')).encode()).hexdigest()
    return out
a = files(before); b = files(after)
b = {k: v for k, v in b.items() if k.split('/')[0] in ('sim-hub', 'linac-ct')}
diff = sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))
print('IDENTICAL' if not diff else 'DIFFERENT: ' + ', '.join(diff))
PY
```

Expected:
- `0 ERRORS`, `eslint ok`, prettier clean, 326 tests passed, `built`, three `SMOKE OK`, and `IDENTICAL`.
- If not `IDENTICAL`, a type-only change emitted different code. Find out why, and STOP and report if it is a real code change.

- [ ] **Step 6: Commit the type changes.**

```bash
cd ../..
git add apps/web/arcade-src
git commit -m "refactor(arcade): shared RTApps SDK type, typed CT messages, bdSyncFromMachine type

Type-only (#77 follow-ups): window.RTApps moves from sim-hub's declare
global to arcade-src/shared/rtapps-sdk.d.ts (linac-ct no longer borrows
it); the CT suite's three parent messages use satisfies against
ct-protocol.ts instead of casts; LinacState.bdSyncFromMachine gets its
real function type. Built JS of sim-hub, linac-ct and the CT suite is
identical before and after (content hashes normalized).

Co-Authored-By: <your model name> <noreply@anthropic.com>"
```

- [ ] **Step 7: CI smoke step.** In `.github/workflows/pr.yml`'s `web` job, after the `- run: pnpm --filter web test` line, add (same indentation):

```yaml
      # Evaluates each built arcade bundle top to bottom in a stubbed DOM/WebGL, so a module-eval
      # crash (a simulator that never loads) fails CI; lint, check and unit tests can't see it (#77).
      - run: pnpm --filter web build:arcade
      - run: node scripts/arcade-smoke.mjs arcade/sim-hub/index.html arcade/linac-ct/index.html arcade/linac-ct/ct-suite.html
        working-directory: apps/web
```

Then validate:

```bash
python3 -I -c "import yaml; yaml.safe_load(open('.github/workflows/pr.yml')); print('pr.yml parses')"
git add .github/workflows/pr.yml
git commit -m "ci: run the arcade bundle smoke check in the web job (#77)

Co-Authored-By: <your model name> <noreply@anthropic.com>"
```

Report:
- the baseline and final smoke output;
- the `IDENTICAL` line;
- every gate's output;
- the exact `bdSyncFromMachine` type chosen, and why;
- both commit hashes.
