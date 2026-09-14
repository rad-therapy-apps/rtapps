# sim-hub Modularization Implementation Plan (#77 phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/web/arcade/sim-hub/index.html` (single 1,715-line file; one dense 1,309-line module script) into a Vite-built ES-module source tree at `apps/web/arcade-src/sim-hub/` with identical serving semantics — same URL, same SDK contract, e2e untouched.

**Architecture:** Strangler refactor in two PRs. PR 1 proves the build pipeline with the entire script moved verbatim into `src/main.js` (Vite bundles it plus npm `three@0.160.0` back to the exact path served today). PR 2 extracts grouped modules from `main.js` one gated commit at a time, then enables eslint over the new source as its own final commit.

**Tech Stack:** Vite 8 (already in the workspace via SvelteKit), three@0.160.0 (exact pin, matching today's CDN import map), plain JavaScript ES modules, prettier.

## Global Constraints

- **Mechanical move only.** Moved code must be textually identical modulo (a) prettier formatting, (b) `import`/`export` statements, (c) the Task-2 state-object rename (`x` → `S.x`) for top-level `let`/`var`. Any bug discovered is FILED as a GitHub issue, never fixed inline.
- Behavior baseline = current main (perf commits `3c0db2b`, `f0e6e6f`, `e818515`, `0b53921`, owner-verified smooth). Zero behavior change is the spec.
- `rtapps-sdk.js` (`apps/web/static/arcade/rtapps-sdk.js`) is untouched. The shell keeps `<script src="/arcade/rtapps-sdk.js"></script>` verbatim.
- Zero changes to: `apps/web/Dockerfile`, CI workflows, the serving route (`src/routes/(app)/arcade/[slug]/[...file]/+server.ts`, `src/lib/server/arcade.ts`), `simulator.e2e.ts`, any other arcade app.
- Gates before every push, run from repo root: `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test` (expect 28 files / 161 tests) and `pnpm --filter web build:arcade` succeeds.
- NEVER read/create/edit any `.env*` file. No force-push. Repos stay private.
- Version pin: `"three": "0.160.0"` exact (no caret) — must match the CDN version the import map pins today.
- Commit messages end with `Co-Authored-By:` per repo convention.

---

## Verbatim-move protocol (applies to Tasks 2–9)

1. Identify the task's **anchor symbols** (listed per task). In `src/main.js`, cut each anchor's complete declaration — including any functions nested inside it — and paste into the task's module file(s) unchanged.
2. **Sole-use helpers move with their anchor:** a top-level function referenced only by this task's anchors moves too. A helper referenced by anchors of *multiple* modules goes to `helpers.js` (Task 3 owns it; later tasks import it).
3. Add `export` to each symbol other modules reference; add the matching `import { … } from './x.js'` lines at the top of consuming modules (including `main.js`).
4. Top-level `const` data used by the moved code moves to the module that owns it and is exported if shared.
5. Mutable top-level state is NOT re-declared in modules — it lives in `S` (Task 2). Extracted code already references `S.x` after Task 2.
6. Verify: `pnpm --filter web build:arcade` (Rollup fails on any unresolved import — the net for missed dependencies), then full gates, then commit. CI e2e on push is the behavioral arbiter.
7. Reviewer contract: the diff must show pure relocation — no logic edits. Spot-verify by comparing moved bodies against the pre-move file (`git show HEAD~1:apps/web/arcade-src/sim-hub/src/main.js`).

---

### Task 1: Pipeline proof — Vite scaffold + verbatim main.js (all of PR 1)

**Files:**
- Create: `apps/web/arcade-src/sim-hub/index.html`, `apps/web/arcade-src/sim-hub/src/main.js`, `apps/web/vite.arcade.config.ts`
- Modify: `apps/web/package.json`, `apps/web/eslint.config.js:33`, root `.gitignore`
- Delete (git rm): `apps/web/arcade/sim-hub/index.html`

**Interfaces:**
- Produces: the `build:arcade` script and the source-tree layout every later task edits; `src/main.js` as the single module later tasks extract from.

- [ ] **Step 1: Branch** — `git checkout -b refactor/sim-hub-vite` (from up-to-date main).

- [ ] **Step 2: Create the source tree.** Split the current `apps/web/arcade/sim-hub/index.html` (1,715 lines):
  - `arcade-src/sim-hub/index.html` = lines 1–404 minus line 377, with the script replaced:
    - DELETE line 377 (the `<script type="importmap">…three CDN…</script>` line) entirely.
    - Keep line 404 `<script src="/arcade/rtapps-sdk.js"></script>` verbatim.
    - Replace the opening `<script type="module">` (line 405) and everything through the closing `</script>` (line 1713) with exactly:
      ```html
      <script type="module" src="./src/main.js"></script>
      ```
    - Keep lines 1714–1715 (`</body></html>` closers) as-is.
  - `arcade-src/sim-hub/src/main.js` = the script body, lines 406–1712, VERBATIM (starts with the `import * as THREE from 'three';` line). Do not edit a character.

- [ ] **Step 3: Create `apps/web/vite.arcade.config.ts`:**
  ```ts
  // What this file does: standalone Vite build config for the arcade source trees
  // (arcade-src/*) — bundles each app back into apps/web/arcade/<app>/ as the same
  // static index.html + assets the auth-gated arcade route has always served.
  // Used here and why: kept separate from vite.config.ts (the SvelteKit app build);
  // `pnpm build:arcade` runs it, and the main `build`/`dev` scripts chain it first.
  // How it fits: output is gitignored; Docker/CI produce it via `pnpm --filter web build`.
  import { defineConfig } from 'vite';

  export default defineConfig({
  	root: 'arcade-src/sim-hub',
  	base: '/arcade/sim-hub/',
  	build: {
  		outDir: '../../arcade/sim-hub',
  		emptyOutDir: true
  	}
  });
  ```

- [ ] **Step 4: Wire `apps/web/package.json`.** Add dependency and scripts (keep everything else untouched):
  - deps: `"three": "0.160.0"` (exact pin, no caret) — then run `pnpm install` at repo root to update `pnpm-lock.yaml`.
  - scripts:
    ```json
    "dev": "pnpm build:arcade && vite dev --host 0.0.0.0 --port 5173",
    "build": "pnpm build:arcade && vite build",
    "build:arcade": "vite build -c vite.arcade.config.ts",
    "dev:arcade": "vite build -c vite.arcade.config.ts --watch",
    ```
    (`dev`/`build` chain explicitly — pnpm does not run `pre*` hooks by default.)

- [ ] **Step 5: Ignore wiring.**
  - Root `.gitignore`: add a line `apps/web/arcade/sim-hub/` (build output; the old tracked file is removed in Step 6).
  - `apps/web/eslint.config.js` line 33: `{ ignores: ['arcade/**'] }` → `{ ignores: ['arcade/**', 'arcade-src/**'] }` with a trailing comment `// arcade-src ignore is temporary: lifted by the modularization plan's final task`.
  - `apps/web/.prettierignore`: NO change (arcade-src is intentionally covered).

- [ ] **Step 6: Swap tracked file for build output.** `git rm apps/web/arcade/sim-hub/index.html`, then `pnpm --filter web build:arcade` and confirm `apps/web/arcade/sim-hub/index.html` + `apps/web/arcade/sim-hub/assets/*.js` exist and `git status` shows them ignored.

- [ ] **Step 7: Prettier-format the new source only:** `pnpm --filter web exec prettier --write arcade-src` (the dense legacy JS expands a lot — expected, one-time). Then run full gates (see Global Constraints). Expect lint/check/test green.

- [ ] **Step 8: Local smoke.** `pnpm --filter web build:arcade` output check: built `index.html` must contain `/arcade/rtapps-sdk.js` (sdk tag intact), must NOT contain `importmap` or `cdn.jsdelivr`, and must reference `/arcade/sim-hub/assets/`. `grep -c updatePerfFloor apps/web/arcade/sim-hub/assets/*.js` ≥ 1.

- [ ] **Step 9: Commit + PR.**
  ```bash
  git add -A && git commit -m "refactor(sim-hub): build from arcade-src via Vite, verbatim main.js (pipeline proof, #77)"
  git push -u origin refactor/sim-hub-vite && gh pr create --fill
  ```
  Wait for CI (web + api + e2e on the self-hosted runner) fully green — do NOT arm auto-merge. Merge, then confirm auto-deploy success and request the **owner walk** (identical behavior + perf).

---

## PR 2 — branch `refactor/sim-hub-modules` (Tasks 2–10, one commit each)

Branch from main after PR 1 merges: `git checkout -b refactor/sim-hub-modules`.

### Task 2: `state.js` — shared mutable state object

**Files:** Create `arcade-src/sim-hub/src/state.js`; modify `src/main.js`.

**Interfaces — Produces:** `export const S = { … }` holding every formerly top-level `let`/`var`; all other modules do `import { S } from './state.js';` and reference `S.<name>`.

- [ ] **Step 1:** Enumerate ALL top-level `let` and `var` declarations in `main.js` (top-level = zero brace depth; the file is prettier-formatted after Task 1, so scan column-0 `let `/`var ` plus any multi-declarator lines). Expected members include (verify against the file — this list is indicative, the file is authoritative): `mode`, `travel`, `activeRoom`, `player`-related mutables, `ROOM_APP_URL`, `ROOM_APP_DOORS`(if `let`), `CONSOLE_APP_URL`, `CONSOLE_APP_DOORS`(if `let`), journey/handoff cursors, ambulance state, pointer-lock state.
- [ ] **Step 2:** Create `state.js`: a documented `export const S = {}` initializing each member to its original initializer (or `null`/`undefined` where the original deferred assignment). Preserve initializer expressions verbatim. Order members as they appeared.
- [ ] **Step 3:** In `main.js`: delete the moved declarations, add `import { S } from './state.js';`, and rename every reference `name` → `S.name` using word-boundary search — **manually reviewing each match** to skip occurrences inside strings/template HTML (e.g. a `'mode'` in markup or ids must NOT change). `window.CONSOLE_APP_URL` mirror assignments (e2e reads them) stay exactly as-is.
- [ ] **Step 4:** Special case: `const` declarations are NOT migrated (they stay put and move to owning modules in later tasks).
- [ ] **Step 5:** `pnpm --filter web build:arcade` + full gates. This task is the riskiest rename, so add one extra check: `grep -n "S\.S\.\|'S\." arcade-src/sim-hub/src/main.js` must return nothing (no double-renames, no renames leaked into string literals starting quotes). CI e2e on push is the behavioral smoke (local app login needs the full compose stack — don't block on it).
- [ ] **Step 6:** Commit `refactor(sim-hub): extract shared mutable state to state.js (S object)`.

### Task 3: `helpers.js` — primitives, textures, signs, small utils

Anchors: `box`, `cyl`, `sphere`, `eRbox`, `std`, `wall`, `makeCanvasPanel`, `makeSignTexture`, `makeWallSign`, `makeDirectionalSign`, `makeDoorHeaderSign`, `makeDoorHeaderTexture`, `makeDoorNameLabel`, `makeLobbyEntranceSign`, `chestBadgeTexture`, `workflowDisplayTexture`, `engineeringLinacOverviewTexture`, `engineeringShieldingTexture`, `escHtml`, `zeroY`, `samePoint`, `cleanPoints`, `commonPrefixLen`, `later`, `architecturalWallMaterial`, plus shared material/geometry `const`s they use. Follow the verbatim-move protocol; commit `refactor(sim-hub): extract helpers.js`.

### Task 4: `scene.js` — renderer, cameras, lights, perf floor, ambience

Anchors: renderer/camera/`orbit`/light setup block (the top-of-script scene bootstrap `const`s: `renderer`, `scene`, `camera`, `labelRenderer`, hemisphere/sun lights), `resize`, `PERF_FLOOR`, `updatePerfFloor`, `initAmbience`, `updateAmbience`, `ambienceProfile`. Export `renderer`, `scene`, `camera`, `labelRenderer`, `orbit`. Commit `refactor(sim-hub): extract scene.js`.

### Task 5: `rooms.js` + `props.js` — world geometry and furnishings

- `props.js` anchors (prop/furniture builders): `chair`, `taskChair`, `stool`, `desk`, `couch`, `examTable`, `cabinetBank`, `wallShelf`, `wallArt`, `wallClock`, `wallSpeaker`, `plant`, `tree`, `lampPost`, `benchSeat`, `brochureRack`, `biohazardBox`, `aedWallBox`, `sanitizerDispenser`, `soapDispenser`, `sinkStation`, `gloveBoxRack`, `immobilizationStorage`, `medCartObject`, `ivPoleObject`, `gurneyObject`, `wheelchairObject`, `vehicleObject`, `ctScanner`, `couchSideControlPanel`, `emergencyStopPanel`, `consoleKeyboard`, `workstationRow`, `monitor`, `monitorWall`, `framedWallMonitor`, `customTextureWallMonitor`, `cctvCamera`, `emulatorLinacShell`, `hdrSuite`, `orientationKiosk`, `privacyChangingNook`, `monumentSign`, `interiorRoomSign`, `warningPlaque`.
- `rooms.js` anchors: `buildRoom`, `buildSide`, `buildDoor`, `addDoorWindow`, `doorLabel`, `doorTypeFor`, `floorMatFor`, `zoneAccentColor`, `zoneFloorColor`, `roomLightProfile`, `addRoomLighting`, `addRoomBaseboards`, `addRoomDecor`, `addClinicalWallPolish`, `clinicalCeilingAccents`, `furnish`, `addCirculationProps`, `buildHubLobby`, `buildLobbyEntrance`, `lobbyWallWithGap`, `buildExteriorAmbient`, `buildCorridorInfillWalls`, `infillH`, `infillV`, `buildVaultMazeEntries`, `addVaultDoorwaySigns`, `corridorFloor`, `corridorLightsHorizontal`, `corridorLightsVertical`, `corridorAnchor`, room-definition `const` tables.

(The spec's module map allowed ±1 module; `props.js` is that refinement — recorded here, no spec edit needed.) Commit `refactor(sim-hub): extract rooms.js and props.js`.

### Task 6: `npc.js` + `npc-behavior.js`

- `npc.js` anchors: `personFigure`, `poseCharacter`, `addChestBadge`, `addLabCoat`, `setPatientGown`, `setNpcRole`, `setNamedNpcRole`, `roleClass`, `npcBubble`, `bubble`, `bubbleVis`, `updateNpcLabels`, `faceNpcToward`, `faceAlong`, `departmentStaff`, `isDirectCareProvider`.
- `npc-behavior.js` anchors: `addMover`, `addMovingActors`, `moverPath`, `movementPathFor`, `updateMovers`, `advancePed`, `advanceRoute`, `walkSwing`, `registerDutyActor`, `updateDutyAnimations`, `registerNpcExchange`, `updateNpcExchanges`, `updateHandoffTransitions`, `startActorHandoff`, `castActorForHandoff`, `buildActorHandoffPath`, `setActorSeated`, `actorEntryPoints`, `actorExitPoints`, `actorFinalPoint`.
Commit `refactor(sim-hub): extract npc.js and npc-behavior.js`.

### Task 7: `equipment.js` — clinical layer, beacons, ambulance, live feeds, clocks, workflow displays

Anchors: `buildClinicalEquipmentLayer`, `updateClinicalEquipment`, `setClinicalFocus`, `clearClinicalFocus`, `syncClinicalFocus`, `equipmentRoomName`, `makeStatusBeacon`, `setStatusBeacon`, `updateStatusBeacons`, `statusColorForState`, `setupAmbulance`, `updateAmbulance`, `ambPatient`, `createOperatorFeed`, `createOperatorMonitor`, `renderOperatorLiveFeeds`, `buildOperatorLiveConsole`, `buildCtLiveConsole`, `createCtFeed`, `flashCtScanner`, `pulseCtObject`, `startCtCouchScan`, `updateCtCouchMotion`, `resetCtCouchMotion`, `ctPatientTarget`, `activeVaultPatientTarget`, `updateWallClocks`, `addJourneyWallClocks`, `buildPhase4WorkflowDisplays`, `createWorkflowDisplay`, `paintWorkflowDisplay`, `updateWorkflowDisplay`, `updateWorkflowTransitions`, `workflowState`, `buildLinacHeadWallStation`, `buildEngineeringWallSchematics`, `buildPhase5Wayfinding`. Commit `refactor(sim-hub): extract equipment.js`.

### Task 8: `walk.js` + `interact.js`

- `walk.js` anchors: `setMode`, `updateWalk`, `canMove`, `collider`, `applyWalkMouseDelta`, `requestWalkPointerLock`, `roomContainingWalkPoint`, `updateDoors`, `setDoorTarget`, `doorCenter`, `doorNormal`, `doorPoint`, `nearestDoor`, `beginTravel`, `updateTravel`, `finishTravel`, `aimPlayerAt`, `shortestCorridorRoute`, `shortestCorridorRouteFromPosition`, `corridorNodesFromHub`, `nearestCorridorProjection`, `approachPoint`, `insidePoint`, `makeRouteToApproach`, `makePolylineCurve`, `branchRouteBetween`.
- `interact.js` anchors: `registerInteractable`, `nearestInteractable`, `performInteraction`, `updateInteractionUI`, `toast`, `openStaffDialogue`, `closeStaffDialogue`, `resetStaffDialogue`, `openKioskDialog`, `closeKioskDialog`, `openProcedureLab`, `closeProcedureLab`, `procedureRoomMarkup`, `procMarkDone`, `procRefreshRelease`, `procRenderSite`, `procResetAll`, `procSetResult`, `procSetTab`, `openLinacHeadLab`, `closeLinacHeadLab`, `lhAnimate`, `lhBox`, `lhCanvasClick`, `lhDraw`, `lhPreviewTexture`, `lhReset`, `lhRound`, `lhSetEnergy`, `lhSetMode`, `lhUpdateText`, `showEquipmentPanel`, `closeEquipmentPanel`, `bindPanelToggle`, `bindProcedureRoomButtons`, `bindRoomEquipmentButtons`, `roomEquipmentMarkup`, `enableRoomInspection`, `disableRoomInspection`, `roomInspectPose`, `updateRoomUI`, `renderRoomList`, `updateFacilityInfo`, `STAFF_GUIDES` const.
Commit `refactor(sim-hub): extract walk.js and interact.js`.

### Task 9: `journey.js` + `sdk-bridge.js` — main.js becomes bootstrap + animate

- `journey.js` anchors: all `journey*`/`*Journey*` symbols (`startTreatmentJourney`, `startJourneyFromKiosk`, `resetTreatmentJourney`, `advanceTreatmentJourney`, `advanceNewPatientJourney`, `showJourneyCheckinIntro`, `releaseJourneyAfter`, `setJourneyKind`, `setJourneySeated`, `moveJourneyActor`, `journeyActors`, `journeyActorRoom`, `journeyFocusActors`, `journeySpeech`, `journeyIntercom`, `playIntercomAudio`, `journeyAudioCue`, `updateJourneyUI`, `updateJourneyCameraFollow`, `setJourneyCameraFollow`, `clearJourneyCameraFollow`, `updateJourneyRoomTiming`, `clearJourneyTimer`, `roomElapsedLabel`, `currentJourneyMeta`, `journeyProgress`, `journeyNextLabel`, `applyJourneyPatientFocus`, `activeJourneyPatientActor`, `createJourneyLyingPatient`, `createJourneyTreatmentPatient`, `showDayTransition`, `beginEntryPhase`, `beginRoutePhase`, and the `begin<Name>…` escort/pickup/handoff sequence functions: `beginJordanEscortToVault`, `beginJordanPickupSequence`, `beginMiaConsultSequence`, `beginMiaFirstTreatmentEscort`, `beginMiaFirstTreatmentPickup`, `beginMiaFirstTreatmentReturn`, `beginMiaPlanningHandoff`), `conversationCameraPose`, `focusConversationCamera`, `applyWalkConversationComposition`, `enableGuidedConversationComposition`, `walkCompositionReady`, `focusTargetsForRoom`.
- `sdk-bridge.js` anchors: the `ROOM_APP_URL`/`CONSOLE_APP_URL` sdk_slug fetch-resolvers (IIFE blocks near the top of the script), `ROOM_APP_DOORS`/`CONSOLE_APP_DOORS`, the CT QA flow: `showCtQaDock`, `syncCtQaProgress`, `focusCtQaEquipment`, `qaToast`, `genLaser`, `genWater`, `judgeLaser`, `judgeWater`, `focusCtPatientFromControl`, and the `__rtappsVerdictLocked` latch + `RTApps.recordResult` call sites. `window.CONSOLE_APP_URL` mirroring preserved byte-for-byte (e2e reads it).
- `main.js` after this task: imports, DOM-ready boot sequence, event-listener wiring, `animate` loop, nothing else.
Commit `refactor(sim-hub): extract journey.js and sdk-bridge.js; main.js is bootstrap+loop`.

### Task 10: Enable eslint over arcade-src

**Files:** Modify `apps/web/eslint.config.js` (remove `'arcade-src/**'` from ignores; add an override block for `arcade-src/**/*.js` if rule relaxations are needed); modify `arcade-src/sim-hub/src/*.js` only as eslint requires.

- [ ] **Step 1:** Remove `'arcade-src/**'` from the ignores entry added in Task 1. Run `pnpm --filter web lint`.
- [ ] **Step 2:** Triage findings: apply ONLY auto-fix-safe changes (`eslint --fix`: `prefer-const` etc.) and targeted `// eslint-disable-next-line <rule>` comments for legacy patterns. Browser globals (`document`, `window`, `requestAnimationFrame`, `RTApps`) may need a `languageOptions.globals` block in the override — add it rather than disabling `no-undef` (that rule is this task's payoff: it catches any reference the extraction orphaned).
- [ ] **Step 3:** ANY finding whose fix would change behavior (unused-but-maybe-load-bearing var, suspicious equality, dead branch) → do NOT fix; report it to the controller for issue filing.
- [ ] **Step 4:** Full gates + `build:arcade`. Commit `refactor(sim-hub): enable eslint over arcade-src`.

### Task 11 (controller): Final review + merge + acceptance

- [ ] Final whole-branch review (most capable model, review package from `git merge-base main HEAD`).
- [ ] Push branch, PR, CI fully green (do NOT arm auto-merge), merge, confirm auto-deploy.
- [ ] **Owner walk** of test.rttlearn.com: walk mode across wings, one full guided journey, CT QA scoring, both doors (Treatment Vault + Learning Commons console).
- [ ] Update #77 (phase 1 done, linac-ct = phase 2 remains), update memory, ledger closed.

---

## Verification summary

Per task: gates (lint/check/test, 161 tests) + `build:arcade` success + reviewer relocation-purity check. Per push: CI fresh-stack e2e (`simulator.e2e.ts`) on the self-hosted runner. Owner walks after PR 1 and PR 2. Ledger: `.superpowers/sdd/progress-simhub-mod.md`.
