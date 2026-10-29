# sim-hub NPC Stage 2 (Standing, Sitting, Lying) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sim-hub people stand on the floor, sit on real seats with bent knees, the wheelchair patient sits, and lying patients rest on the couches. Automated checks prove it in CI, and before/after screenshots show the owner.

**Architecture:**
- Four new checks in the existing NPC check (`apps/web/scripts/sim-hub-npc-check.mjs`), red first, plus a screenshot dev tool.
- The person figure gets thigh, shin and knee segments reaching the floor, with one shared leg-swing helper.
- Seat props register seat anchors, and a `seatActor` helper poses people onto them.
- One lying-patient builder rests patients on the measured couch or table top.

Spec: `docs/specs/2026-10-29-sim-hub-npc-movement-design.md`, section "Stage 2 design".

**Tech Stack:** TypeScript sim-hub modules (`apps/web/arcade-src/sim-hub/src/`), three.js 0.160 (pinned, do not change), Vite/rolldown arcade build, Node scripts, Playwright Chromium (already a dev dependency) for screenshots.

## Global Constraints

- **Scope:** only `apps/web/arcade-src/sim-hub/src/*.ts`, `apps/web/scripts/*.mjs` (new and existing) and the stage 2 section of the spec change. No new dependencies, and three.js stays pinned.
- **Leg geometry (exact):**
  - hip pivots stay at local y = 1.06;
  - thigh 0.48, shin 0.45 and shoe 0.06, so the sole is at local y = 0.07;
  - box thickness 0.12 and shoe 0.13 × 0.06 × 0.2, offset z +0.03 as today;
  - same materials.
- **Nothing above the hips changes:** torso, shoulders, arms, head, hair, face, coat, labels and speech bubbles keep their exact local positions.
- **Tolerances:**
  - (f) feet: within 0.03 m of the floor beneath;
  - (g) seated: a seat anchor within 0.3 m, the pelvis (hip pivot world y − 0.06) within 0.02 m of the seat top, and facing within 20° of the seat's facing;
  - (h) lying: the lowest point within 0.02 m of the couch or table top beneath;
  - (i) wheelchair: the occupant is posed seated, with its pelvis within 0.02 m of the wheelchair seat top.
- **Seat-anchor snap radius:** 1.0 m.
- **Stage 1 must keep passing:** checks (a)–(e) and the resting-spot sub-check stay PASS on every task.
- **Gates for every task:**
  - `pnpm check`: 0 errors (23 pre-existing warnings);
  - `pnpm exec eslint arcade-src src scripts`;
  - `pnpm exec prettier --check arcade-src scripts`;
  - `pnpm test`: 326 passed;
  - `pnpm build:arcade`, then the arcade smoke check gives 3 × SMOKE OK;
  - the NPC check, with the results each task specifies.
- **Rules:**
  - Write scratch files only under /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/, and never delete a file you did not create.
  - Never read, create or edit any file whose name starts with `.env`.
  - Never `git add` anything under `.superpowers/`.
- **Git:** stay on branch `fix/sim-hub-npc-seating`. Never switch branches, push, stash or force.
- **Commit trailer:** `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: Checks (f)–(i) and the screenshot tool (red first)

**Files:**
- Modify: `apps/web/scripts/sim-hub-npc-check.mjs` (checks f–i, a floor finder, `--only` letters f–i)
- Modify (behaviour-neutral tags only):
  - `npc.ts`: `sitPatient` sets `group.userData.shouldSit = true`;
  - the lying-patient builders set `userData.lying = true`;
  - `props.ts` `wheelchairObject(…, true)` sets `userData.wheelchairOccupant = true` on its figure;
  - plus any `?npccheck` hook additions in `npc-check-hook.ts`, e.g. exposing the scene root.
- Create: `apps/web/scripts/sim-hub-shots.mjs`

**Reference probes, which already work:** in /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/stage2/:
- `probe-heights.mjs`: floor finder, mesh world bounds, journey actors after `resetTreatmentJourney(true)`;
- `probe-feet.mjs`: movers' lowest points;
- `shot.mjs`: serves the built sim-hub, captures renderer, scene and camera via `__THREE_DEVTOOLS__`, closes the "Start Exploring" dialog, hides the DOM except the canvas, places the camera, renders and screenshots.

- [ ] **Step 1: Floor finder.** For a point (x, z), the floor top is the highest top below 0.8 among meshes whose world bounds contain (x, z) and span more than 3 m in both x and z, as in `probe-heights.mjs`. Expected values: about 0.065–0.08.
- [ ] **Step 2: Check (f), feet on the floor.**
  - **Who is checked:** every person-figure group that is standing or walking: movers that contain a `walkRig`, cast and duty actors, and journey actors. Exclude anything with `userData.lying`, seated (pose `'seated'` or `userData.seated`), or `wheelchairOccupant`.
  - **Measure:** the sole is the lowest world y of that group's meshes. Fail if `|sole − floorTop(x, z)| > 0.03`.
  - **Samples:** check after the journey reset, and at 3 moments while movers walk (t = 2 s, 30 s and 90 s).
  - **Report:** id or name, the sole, the floor and the gap.
  - **Expected now:** FAIL, with gaps of about 0.43 m.
- [ ] **Step 3: Check (g), seated.**
  - **Who is checked:** actors that are seated (lobby journey patients after reset, and anyone with pose `'seated'`) or have `userData.shouldSit`.
  - **Seats:** until Task 3 adds anchors, find the nearest seat-like mesh (a top between floor + 0.35 and floor + 0.75, width over 0.35, thickness under 0.2) within 0.6 m of the actor. Fail if there is none.
  - **Measure:** pelvis = the hip pivot's world y − 0.06. Fail if `|pelvis − seatTop| > 0.02`, or the facing is off by more than 20°. Use the seat mesh's yaw, or skip the facing test until Task 3 and say so in the output.
  - **Expected now:** FAIL. The lobby sitters are about 0.17 m high, and the `shouldSit` patients are standing.
- [ ] **Step 4: Check (h), lying.** For each `userData.lying` group, find the highest mesh top under its centre that is not part of the patient, within 1.6 m vertically (the couch or table). Fail if `|lowest − top| > 0.02`. **Expected now:** FAIL, about 0.18–0.35 m.
- [ ] **Step 5: Check (i), wheelchair.** For each `wheelchairOccupant` figure, it must be posed seated, with its pelvis within 0.02 m of the wheelchair's seat-top mesh. **Expected now:** FAIL (standing figure).
- [ ] **Step 6: Screenshot tool `scripts/sim-hub-shots.mjs <outDir>`.**
  - Build it from `shot.mjs`, with a fixed, named pose list: `walker-low` (side-on at 0.35 m), `lobby-chairs`, `consult-patient`, `escort-wheelchair`, `ct-table` and `vault-couch`.
  - Movers can be located by id through `window.__NPC`. Rooms come from ROOMS (`window.__simHubVisibility` only exists with `?visibilitycheck`, so load `?hq&npccheck&visibilitycheck`, or expose ROOMS on `__NPC`).
  - Pick camera positions by trial until each shot clearly shows its subject.
  - It writes `<outDir>/<name>.png`, prints one line per shot, and is not part of CI.
- [ ] **Step 7: Run it.**

```bash
cd apps/web && pnpm build:arcade >/dev/null 2>&1 && node scripts/sim-hub-npc-check.mjs; echo "exit $?"
node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/stage2/before
```

Expected:
- (a)–(e) and the resting-spot check PASS;
- (f), (g), (h) and (i) FAIL;
- exit 1;
- six PNGs.

Open each PNG and confirm its subject is visible; report any that aren't.

- [ ] **Step 8: Gates**, then commit: `test(sim-hub): NPC checks for feet, seating, lying and wheelchair; screenshot tool`.

### Task 2: Legs that reach the floor, with knees (check f)

**Files:** `npc.ts` (`personFigure`, `poseCharacter`, the new `setLegSwing`), `npc-behavior.ts` and `equipment.ts` (call sites).

- **Rebuild each leg** in `personFigure` with the exact Global Constraints geometry:
  - the hip pivot group (`legLP`/`legRP`, kept under those names) holds a thigh box, centred at −0.24, and a knee pivot group (`kneeLP`/`kneeRP`) at −0.48;
  - the knee group holds a shin box centred at −0.225, and the shoe with its bottom at local −0.99 from the hip (sole at 0.07);
  - add `kneeLP` and `kneeRP` to `walkRig`;
  - `clothingRig.bottomParts` lists all four leg boxes.
- **`export function setLegSwing(rig, swing: number)`:**
  - sets `legLP.rotation.x = -swing`, `legRP.rotation.x = swing`;
  - sets each knee to `max(0, ±swing) × 0.9`, so only the trailing leg bends, toward the back;
  - resets knee rotation when `swing` is 0.
- **Call sites:** replace the five per-site leg-swing assignments with it:
  - `npc-behavior.ts` near 151, 324, 763 and 1010;
  - `equipment.ts` near 987.

  Keep each site's amplitude by passing the same scaled value: the sites use `swing * 0.85`, `0.86` and `0.88`, so pass `swing * k`.
- **`poseCharacter`:**
  - `'neutral'` and `'idle'` reset the knees;
  - `'seated'` sets thighs to −π/2 and knees to +π/2 (shins vertical). Its y stays as `setActorSeated` sets it today; Task 3 fixes heights.
- **Verify:**
  - (f) PASS;
  - (a)–(e) and the resting-spot check PASS;
  - (g), (h) and (i) may still fail.
- **Screenshots:** run the tool to `.../stage2/after-legs/` and compare `walker-low` with before: the feet must now be on the floor, and nothing above the hips may move. Report both paths.
- **Gates**, then commit: `fix(sim-hub): person figures stand on the floor; legs get knees and one swing helper`.

### Task 3: Seat anchors, everyone on a real seat, backrests (checks g, i)

**Files:** `props.ts` (seat props and anchors), `npc.ts` (`sitPatient`), `npc-behavior.ts` (`setActorSeated`, `seatActor`), `journey.ts` (lobby seat positions) and `rooms.ts` (only if a seat call needs an anchor id).

- **Anchors:** `chair`, `couch`, `benchSeat` (one anchor per 0.6 m of bench length), `taskChair` and `wheelchairObject` each push a seat anchor `{ x, z, facing, top, kind }` to an exported `SEATS` array, in world coordinates. Compute world positions with the prop group's transform, or record them after the group is placed; document which.
- **Backrests:** the backrest offset follows `rot` in `chair`, `couch` and `taskChair`. `benchSeat` gets full rotation, with the offset computed as the rotated local −z.
- **`export function seatActor(actor, at)`:**
  - takes the nearest anchor within 1.0 m of `at` (an anchor or `{x, z}`);
  - sets the actor's x and z so the hips sit 0.12 m behind the seat centre along its facing;
  - sets y = top + 0.06 − 1.06 + (actor's floor offset, if any);
  - sets rotation.y to the facing, applies pose `'seated'`, and sets `userData.seated = true`;
  - if no anchor is found, returns false and leaves the actor standing. The check then fails, so nothing silently floats.
- **Callers:**
  - `setActorSeated(actor, true)` calls `seatActor(actor, actor.position)`;
  - `setActorSeated(actor, false)` restores y = 0 and the neutral pose, and clears `userData.seated`;
  - `sitPatient` calls `seatActor` after placing the figure;
  - the lobby journey positions in `journey.ts` (Mia, Jordan, family: about lines 836–842, 975 and 1479) target real chair anchors, either by snapping or by updating the coordinates to the chair centres. Report which.
  - The occupied wheelchair's figure is posed seated on that wheelchair's own anchor, local to the wheelchair group so it moves with it.
- **Verify:**
  - (g) and (i) PASS;
  - (a)–(f) and the resting-spot check PASS;
  - (h) may still fail.

  Stage 1's checks matter here: seated actors moved slightly, so the resting-spot check (0.9 m from loops) must still pass. If it fails, move the seat or report; don't move a walker loop without saying so.
- **Screenshots** to `.../stage2/after-seats/`; compare `lobby-chairs`, `consult-patient` and `escort-wheelchair` with before.
- **Gates**, then commit: `fix(sim-hub): seats register anchors; patients sit on real seats with bent knees; backrests follow rotation`.

### Task 4: Lying patients rest on the couches (check h)

**Files:** `npc.ts` and `journey.ts` (the lying-patient builders and their callers).

- **One builder:** replace the three lying-patient builders (`npc.ts` near 408–456; `journey.ts` near 400, 444, 459 and 503) with one exported builder, keeping their current look.
- **Placement:** when placing a lying patient on a couch or table, measure that couch's or table's top from its mesh (world bounds), and set the patient's y so its lowest point equals that top. Keep the current per-room x/z offsets unless they put the patient off the couch; report any change.
- **Verify:** every check (a)–(i) and the resting-spot check PASS, exit 0.
- **Final screenshots** to `.../stage2/after/` for all six poses.
- **Gates**, then commit: `fix(sim-hub): lying patients rest on the CT table and treatment couch`.
- **Report:** before and after paths for all six screenshots.
