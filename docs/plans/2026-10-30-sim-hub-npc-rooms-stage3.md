# sim-hub NPC Stage 3 (Routes Inside Rooms, Nobody in Furniture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sim-hub people stop standing in desks and consoles, never share a spot, walk around furniture inside rooms, and sit down without passing through the seat. Automated checks prove it in CI, and before/after screenshots and route maps show the owner.

**Architecture:**
- Three new checks in the existing NPC check (`apps/web/scripts/sim-hub-npc-check.mjs`), red first. They share a furniture classifier ported from the stage 3 probe into `apps/web/scripts/lib/furniture.mjs`. The check drives both patient journeys from start to finish on a simulated clock.
- Stationary staff move to clear spots. Hand-overs into a room take the first free arrival spot.
- Each room gets a hand-placed waypoint graph. Every hand-over and journey route goes through it instead of in straight lines.
- A walk to a seat ends in front of it, and the person eases into the seat, mirroring the stage 2 stand-up.

Spec: `docs/specs/2026-10-29-sim-hub-npc-movement-design.md`, section "Stage 3 design".

**Tech Stack:** TypeScript sim-hub modules (`apps/web/arcade-src/sim-hub/src/`), three.js 0.160 (pinned, do not change), Vite/rolldown arcade build, Node scripts, Playwright Chromium (already a dev dependency) for screenshots.

## Global Constraints

- **Scope:**
  - `apps/web/arcade-src/sim-hub/src/*.ts`, plus one new module `room-routes.ts`;
  - `apps/web/scripts/sim-hub-npc-check.mjs`, `apps/web/scripts/sim-hub-shots.mjs`, `apps/web/scripts/lib/*.mjs` (new `furniture.mjs`);
  - the stage 3 section of the spec;
  - the comment above the NPC check step in `.github/workflows/pr.yml` (comment only).

  No new dependencies, and three.js stays pinned.
- **Furniture** is the classifier in `scripts/lib/furniture.mjs` (Task 1): every visible mesh except people, movers, floors, walls, ceilings, mats, glass panes, planes and wall items above 2 m. Seated people exclude their own seat's meshes. Lying patients are left to check (h).
- **Body** is the legs and the torso: the leg meshes under `walkRig.legLP`/`legRP` and `faceRig.torso`, sampled on a grid of points over each mesh's box. Arms and head are not checked.
- **Tolerances (exact):**
  - (k) rest clearance: at least 0.05 m between the body and furniture;
  - (l) routes: the body at most 0.02 m into furniture on every frame;
  - (l) mover loops: a 0.2 m ring around the walker at heights 0.1, 0.5, 0.9 and 1.3 m, at most 0.02 m into furniture;
  - (m) occupancy: at least 0.5 m between any two people at rest, measured between figure roots in x/z; one person per seat anchor.
- **Sit-down:** approach point = the seat anchor + 0.5 m along its facing (the stand-up's `STAND_CLEAR`); the ease into the seat takes 0.4 s. No frame moves the root more than check (c)'s 0.25 m.
- **Journey finals** are story positions: the patient beside a particular couch, the therapist at a particular console, and so on. They stay authored literals. A final that fails (k), (l) or (m) moves the shortest distance that passes; report each move with its old and new value. Hand-overs use arrival spots.
- **Earlier checks keep passing:** (a)–(j) and the resting-spot sub-check stay PASS on every task. Don't loosen any earlier tolerance.
- **Run time:** the whole NPC check stays under 60 s on the dev machine (CI's step limit is 5 minutes). Report the time on every task.
- **Gates for every task**, run from `apps/web`:
  - `pnpm check`: 0 errors, and the same warning count as the base commit;
  - `pnpm exec eslint arcade-src src scripts`;
  - `pnpm exec prettier --check arcade-src scripts`;
  - `pnpm test`: the same passed count as the base commit;
  - `pnpm build:arcade`, then the arcade smoke check gives 3 × SMOKE OK;
  - the NPC check, with the results each task specifies.

  Task 1 records the base warning count and passed count in its report.
- **Rules:**
  - Write scratch files only under /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/, and never delete a file you did not create.
  - Never read, create or edit any file whose name starts with `.env`.
  - Never `git add` anything under `.superpowers/`.
- **Git:** stay on branch `fix/sim-hub-npc-rooms`. Never switch branches, push, stash or force.
- **Commit trailer:** `Co-Authored-By: <your model name> <noreply@anthropic.com>`.

---

### Task 1: Checks (k), (l) and (m), red first, with the furniture module and the journey driver

**Files:**
- Create: `apps/web/scripts/lib/furniture.mjs`
- Modify: `apps/web/scripts/sim-hub-npc-check.mjs` (sim-clock timers, checks k–m, `--only` letters a–m, header comment, `--svg` additions)
- Modify: `apps/web/arcade-src/sim-hub/src/npc-check-hook.ts` (expose `setJourneyKind`, `startTreatmentJourney` and `advanceTreatmentJourney` from `journey.ts`)
- Modify: `apps/web/scripts/sim-hub-shots.mjs` (four new shots)

**Reference probes, which already work:** in /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/stage3/:
- `furn.mjs`: the classifier (`buildFurniture`), signed distance (`sdf`, for box, cylinder, torus and sphere geometry), body points, seat exclusion and `measure`;
- `stationary.mjs`: rest clearance of every cast, duty and journey actor;
- `routes.mjs`: every hand-over, sampled every frame;
- `jlib.mjs` and `jdrive.mjs`: sim-clock timers, and both journeys driven to `done`: treatment 11 moves in about 355 simulated seconds, new patient 27 moves in about 954;
- `jroutes.mjs`: journey moves sampled every frame;
- `jmovers.mjs`: mover loops against furniture.

`jlib.mjs`/`jdrive.mjs` need the three hook exports this task adds; they were run against a temporary build.

- [ ] **Step 1: `scripts/lib/furniture.mjs`.** Port `furn.mjs`. It takes the `__NPC` object as a parameter instead of importing it, and exports:
  - `buildFurniture(NPC)` → `{ list, near(x, z) }`;
  - `sdf(rec, point)`;
  - `bodyPoints(g, n)`;
  - `seatMeshes(F, anchors)`: the seat meshes for a list of world seat anchors;
  - `measure(F, g, skip, pts)` → `{ depth, clearance, hits }`;
  - `describe(rec)`.

  Keep the classifier rules exactly as in the probe, and document each rule in one comment line.
- [ ] **Step 2: Sim-clock timers in the check.**
  - Before the bundle import, replace `globalThis.setTimeout` and `clearTimeout` with a queue keyed to `simNow`, as in `jlib.mjs`. `step()` runs every due timer, earliest first, before `stepSimulation`.
  - The journey's `later()` and the door timers then fire in simulated time.
  - (a)–(j) must still pass. If one changes, report it; don't change its tolerance.
- [ ] **Step 3: Journey driver.**
  - `driveJourney(kind, onFrame)`: `resetTreatmentJourney(true)`, `setJourneyKind(kind, true)`, `startTreatmentJourney()`. Then step until `JOURNEY.stage === 'done'`, calling `advanceTreatmentJourney()` on any frame where the journey is not busy, there is no `state.travel` and the stage is not `done`.
  - Call `onFrame` every frame.
  - Fail with a setup error if a journey hasn't reached `done` within 40 simulated minutes.
- [ ] **Step 4: Check (k), rest clearance.**
  - **Rest set:**
    - every cast and duty actor and journey actor 10 frames after the journey reset;
    - every hand-over's actor when its move completes (each hand-over run alone from reset, as in `routes.mjs`);
    - every journey move's actor when its move completes (both journeys, through the driver).
  - **Measure:** the body against furniture, with the person's own seat excluded when seated, on a 6 × 6 × 6 point grid per mesh. Fail if clearance is below 0.05 m.
  - **Report:** who, where, the clearance or depth, and the furniture (`describe`).
  - **Expected now:** FAIL. The probe found 7 staff inside desks and consoles (dosimetrist 15 cm, CT control partner 9 cm, manager 2.5 cm, four more 1–2 cm) and the consult doctor 3.2 cm clear. Hand-over ends: education, LINAC control and QA are inside furniture. Journey ends: education (−40.9, −6.1) is inside the desk, and the CT sim bench end is at (37.15, −4.7).
- [ ] **Step 5: Check (l), routes clear.**
  - **Routes:**
    - every hand-over in `HANDOFFS` (21), each run alone from reset;
    - every journey move of both journeys, through the driver.
  - **Frames:** every frame from the move's start to its end, including stand-up and (after Task 4) sit-down frames.
  - **Measure:** the body on a 4 × 4 × 4 grid per mesh. Exclude the seat meshes of any seat anchor within 0.6 m of the move's start, its end or the actor's own anchor (as in `routes.mjs`).
  - **Fail** if the depth is over 0.02 m. Report each failing route once: its worst depth, the frame, the position, the room and the furniture.
  - **Mover-loop sub-check:**
    - for movers whose person figure stands at the group's origin (walker, visitor, therapist, ctRunner, linacRunner, hdrRunner), sample 500 loop points;
    - put the 0.2 m ring at each point;
    - fail if any ring point is more than 0.02 m into furniture.

    The escort and the tech cart are left to check (a); say so in an info line.
  - **Expected now:** FAIL.
    - Hand-overs: the CT control console 37 cm, the education desk 36 cm, exam tables up to 28 cm, couches 16 cm, and others.
    - Journey moves: 20 of 38 over 2 cm. The education desk 36 cm; the CT control console 22 cm; the vault 1 bench 18 cm; the lobby couch at (5.5, 0.8) 16 cm on every eastward walk out of the lobby; the CT sim bench 15 cm.
    - Mover loops: probably the visitor and ctRunner. Report what the 0.2 m ring finds.
- [ ] **Step 6: Check (m), occupancy.**
  - **At rest:** at journey reset plus 10 frames, no two people at rest (cast, duty, journey actors; lying patients excluded) within 0.5 m.
  - **Hand-over ends:**
    - for each target room, start together every hand-over into it whose actors differ, run to completion, and check the end positions against each other and against the room's residents;
    - also run each hand-over alone and check its end against the residents.
  - **Journey ends:** when a journey move completes, its actor is at least 0.5 m from every other person at rest at that moment.
  - **Seats:** at every one of these moments, no seat anchor holds two seated people, and nobody standing has a root within 0.3 m of an occupied anchor.
  - **Expected now:** FAIL. LINAC control (50.5, 7.2) is 0.22 m from the resting LINAC control therapist; the shared hand-over ends; and commons → lobby ends standing in "Have a seat"'s chair.
- [ ] **Step 7: `--svg` route map.** When `--svg` is given, also draw:
  - every furniture mesh's x/z bounds as a light rectangle;
  - every (l) route's frame positions as a polyline, one colour per route;
  - a red dot at each (l) or (k) failure.

  It is the authoring aid for Tasks 3 and 4 and the owner's before/after map. Keep the existing loop and collider drawing.
- [ ] **Step 8: Four new shots** in `sim-hub-shots.mjs`, picked by trial until each clearly shows the person and the desk:
  - `dosimetry-desk` (the dosimetrist);
  - `ctcontrol-console` (the CT control partner and the window);
  - `manager-desk`;
  - `linac-console` (the LINAC control therapist).
- [ ] **Step 9: Run it.**

```bash
cd apps/web && pnpm build:arcade >/dev/null 2>&1 && time node scripts/sim-hub-npc-check.mjs --svg /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/stage3/before/routes.svg; echo "exit $?"
node scripts/sim-hub-shots.mjs /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/stage3/before
```

  Expected:
  - (a)–(j) and the resting-spot check PASS;
  - (k), (l) and (m) FAIL with the problems above;
  - exit 1;
  - a route map, and 13 PNGs (9 existing shots plus 4 new).

  Open the four new PNGs and confirm each subject is visible.
- [ ] **Step 10: Gates**, then commit: `test(sim-hub): NPC checks for furniture clearance, routes and occupancy; journey driver; route map`.

### Task 2: Staff out of desks, arrival spots and occupancy (checks k and m)

**Files:** `npc.ts` (staff `place(...)` offsets and the partner placements), `npc-behavior.ts` (`actorFinalPoint`, the hand-over start and end), new `room-routes.ts` (arrival spots), `journey.ts` (journey finals and the reset positions of journey staff, only where a check fails).

**Interfaces:**
- Produces, in `room-routes.ts`:
  - `export const ARRIVAL_SPOTS: Record<string, { x: number; z: number; facing: number }[]>` (world coordinates);
  - `export function takeArrivalSpot(roomId: string, actor: THREE.Object3D): { x: number; z: number; facing: number } | null`;
  - `export function releaseArrivalSpot(actor: THREE.Object3D): void`;
  - `export function clearArrivalSpots(): void`.

  Task 3 adds the room graphs to the same module.

- **Stationary staff:**
  - move every person (k) reports at rest to the nearest clear spot by its desk or console: at least 0.05 m clear, still facing its work, with its pose unchanged;
  - keep each move as small as passes, and report each old and new position;
  - this covers the dosimetrist, the CT control partner (clear of the console and the window partition), the manager, the physicist, the safety officer, the navigator, the LINAC control therapist and the consult doctor;
  - journey aliases (for example `JOURNEY.dosimetrist`) are the same figures, so they move with them.
- **Arrival spots:**
  - every room that a hand-over targets gets 3 or more spots, enough for every hand-over into it at once plus one;
  - each spot is at least 0.05 m clear of furniture, at least 0.6 m from the others and at least 0.5 m from the room's residents;
  - each faces the room's resident staff or its work area;
  - the old `actorFinalPoint` map point is the first spot where it passes.
- **First free:**
  - a hand-over without `final` takes `takeArrivalSpot(target, actor)`: the first spot not held by another actor and with no other visible person within 0.5 m;
  - a hold ends when its actor starts another move or `clearArrivalSpots()` runs (from `resetTreatmentJourney`);
  - the actor ends facing the spot's `facing`.

  A hand-over with an explicit `final` (the seat finals) keeps it.
- **commons → lobby and "Have a seat":** they no longer share the chair. The staff hand-over takes a lobby arrival spot.
- **Journey finals and journey staff resets** that fail (k) or (m) move as the Global Constraints say. Known: education (−40.9, −6.1), inside the desk; the CT sim bench end (37.15, −4.7); Mia's consult end (−17.2, −6.35), 6 cm into the exam table.
- **Verify:**
  - (k) and (m) PASS;
  - (a)–(j) and the resting-spot check PASS;
  - (l) may still fail.
- **Screenshots** to `.../stage3/after-staff/`; compare the four desk shots with before.
- **Gates**, then commit: `fix(sim-hub): staff stand clear of their desks; hand-overs take the first free arrival spot`.

### Task 3: Per-room waypoint graphs (check l, hand-overs and journeys)

**Files:** `room-routes.ts` (graphs and the in-room path), `npc-behavior.ts` (`buildActorHandoffPath`, `actorExitPoints`, `actorEntryPoints`).

**Interfaces:**
- Consumes `ARRIVAL_SPOTS` (Task 2).
- Produces, in `room-routes.ts`:
  - `export const ROOM_GRAPHS: Record<string, { nodes: [number, number][]; edges: [number, number][] }>` (world x/z);
  - `export function inRoomPath(roomId: string, from: { x: number; z: number }, to: { x: number; z: number }): [number, number][]`. It returns the points strictly between `from` and `to`: from's nearest node, the shortest graph path, then to's nearest node. With no graph for the room, it returns `[]` (a straight line, as today).

- **Graphs:**
  - hand-place a graph for every room that a hand-over or journey move enters or leaves, the lobby included;
  - nodes sit on open floor;
  - edges are straight lines that keep a 0.25 m half-width corridor clear of furniture;
  - the door node is `doorPoint(room)`;
  - the vaults' maze points (`actorExitPoints`/`actorEntryPoints`) become part of their graphs;
  - the lobby has one exit node per corridor it opens to: east (12.8, 0), west (−12.8, 0) and technical (0, −10.8);
  - every resting place in the room must have a nearest node it can walk to in a straight line: arrival spots, staff spots, seat approach points and journey finals. If one doesn't, add a node.
- **Routing:** `buildActorHandoffPath` puts `inRoomPath` between:
  - the start and the door, when leaving a room;
  - the door and the final, when entering one;
  - the start and the final, for a same-room move;
  - in the lobby, the start and the exit node nearest the first corridor point.

  The corridor part (`corridorNodesFromHub`, `shortestCorridorRoute`) is unchanged. A graph path runs with no node repeated, and the 0.22 m de-duplication stays.
- **Authoring aid:** use `--svg` (Task 1) and (l)'s per-route reports. A route that still fails gets a node or an edge, not a tolerance change.
- **Verify:**
  - (l) PASS for every hand-over and journey move (the mover-loop sub-check may still fail);
  - (a)–(k), (m) and the resting-spot check PASS;
  - check (b)'s 20-minute spacing still PASS. Stage 1's lanes are unchanged, but routes inside rooms now take longer.
- **Route map** to `.../stage3/after-routes/routes.svg`.
- **Gates**, then commit: `fix(sim-hub): hand-overs and journey walks follow per-room waypoints around furniture`.

### Task 4: Sit-down, mover loops, and the as-built notes (all checks pass)

**Files:** `npc-behavior.ts` (`beginSit`/`stepSit`, the end of `updateHandoffTransitions`), `equipment.ts` (`updateWorkflowTransitions`), `journey.ts` (`MoveJourneyActorOptions.sit`, the three seated journey moves), `npc-behavior.ts` `addMovingActors` (mover loop points, only where the ring fails), and the spec.

- **Sit-down mirrors the stand-up.**
  - A move that ends on a seat stops at the seat's approach point, the anchor + 0.5 m along its facing.
  - `beginSit(actor, anchor)`/`stepSit(actor, s, sec)` then run over 0.4 s:
    - the yaw turns the shortest way from the arrival heading to the seat's facing in the first half;
    - the hips travel from standing at the approach point to the `seatActor` pose (0.12 m behind the anchor, pelvis on the top) along a smoothstep;
    - the soles slide back under the knees with `setLegReach`;
    - the last frame calls `seatActor(actor, anchor)`.
- **Which moves end on a seat:**
  - hand-overs: the existing rule (a patient, with the final within 0.3 m of a free anchor);
  - journey moves: those passed `{ sit: true }`. These are the three moves whose `onComplete` seats the actor: Jordan to `LOBBY_PICKUP.chair` (`journey.ts` ~941), Mia to her lobby chair (~1441), and Mia to `LOBBY_PICKUP.chair` (~1586).

  Their `onComplete` seating then finds the actor already on that anchor.
- **Check (c)** measures the sit-down: Task 1's (c) flow does not end on a seat, so add a third queued move ending on a lobby chair with `sit`. No frame steps over 0.25 m.
- **Mover loops:** move the loop points that (l)'s ring flags by the least that passes, and keep (a), (b) and the resting-spot check passing. The spec's leftover is hdrRunner's loop near the HDR nook desk.
- **Verify:** every check (a)–(m) and the resting-spot check PASS, exit 0, under 60 s.
- **Final screenshots and route map** to `.../stage3/after/`: all 13 shots, plus `routes.svg`.
- **Spec:** add "### As built" under "Stage 3 design", in the style of stage 2's. It covers the checks, the moved staff (old → new), the arrival spots, the graphs, the moved journey finals (old → new), the sit-down, the mover loop changes and anything the review rounds changed.
- **Gates**, then commit: `fix(sim-hub): people ease into seats; walker loops clear of furniture; stage 3 notes`.
