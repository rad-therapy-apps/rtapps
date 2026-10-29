# sim-hub NPC movement and seating fixes: design

**Date:** 2026-10-29. **Status:** approved by the owner. All three stages run in order, a knee joint is added, and stage 3 uses per-room waypoints. Each stage is its own PR.

## Problem

The owner reports that in the sim-hub hospital simulator, NPCs:

- sometimes walk through walls;
- walk through each other;
- float;
- or don't sit properly.

Two read-only investigations, 2026-10-29, traced every cause to original design gaps. No commit is a regression; the affected code dates from the initial import (d4b575d, fcef239).

**Movement** (`apps/web/arcade-src/sim-hub/src/`):

- **No NPC movement checks the walls.** Wall boxes exist (`colliders` in `walk.ts:66`, filled by `wall()` in `helpers.ts`), but only the player's `canMove` uses them (`walk.ts:522`).
- **Background walkers (`movers`, `npc-behavior.ts:205-232`) follow hand-typed closed Catmull-Rom loops.** Position is a pure function of wall-clock time: `(sec*speed + offset) % 1`.
  - Several loops run through walls on every lap: `therapist` and `linacRunner` along the x=64 treatment-branch wall, `ctRunner` through the ctcontrol west wall and the corridor infill, and `hdrRunner` across the x=64 wall.
  - Others run within a body width of corridor walls: `walker` at z=±3 in a 3.5 half-width corridor, and `escort` (wheelchair) at z=3.2.
- **Nothing keeps NPCs apart.** `therapist` and `linacRunner` share segments, `escort` overlaps `ctRunner` and `walker`, and handoff final spots (`actorFinalPoint`) can already be occupied.
- **Journey and handoff moves** (`moveJourneyActor` → `movementPathFor`; `startActorHandoff`):
  - they are straight lines between few waypoints (seat → door → corridor), so they cross furniture, and one vault corner cuts a hall wall end;
  - a second move for the same actor is pushed alongside the first, so two tweens fight over its position;
  - progress uses `performance.now()` while `animate` skips frames when `document.hidden`, so actors jump to the end of their path when the tab returns.

**Height and pose:**

- **Figures have rigid legs, with no knee** (`npc.ts:102-115`).
- **The seated pose uses one offset for every seat:** `position.y = -0.35` (`npc-behavior.ts:513-516`). That puts the pelvis at y≈0.71 against seat tops of 0.54–0.65, so sitters hover 5–17 cm, with straight legs sticking out in mid-air.
- **Lobby journey patients are placed off the chairs.** Jordan sits in the gap between two chairs.
- **Some backrests ignore rotation:** `chair`, `couch` and `taskChair` always put the back at -z, and `benchSeat` is only partly fixed.
- **`sitPatient` never seats anyone.** Patients in consult, education and other rooms stand at chair coordinates.
- **The occupied wheelchair holds a standing figure** (`props.ts:78-83`).
- **Lying patients float about 18–35 cm** above the CT table and treatment couch. The `lift` constants are 0.48/0.62 against table tops of about 1.03/1.08; to be confirmed at runtime.

## Stages

1. **Walls, spacing and jumps** (this design, detailed below).
2. **Sitting and lying:**
   - a knee joint in `personFigure`;
   - a seated pose whose pelvis lands on each seat's actual top;
   - lobby and room patients seated on real chairs, with `sitPatient` really seating them;
   - the occupied wheelchair seated;
   - lying patients lowered onto the couches;
   - backrests that follow rotation.

   It gets its own detailed design and plan, with before/after screenshots for the owner.

3. **Paths inside rooms:**
   - per-room waypoints, so journey and handoff moves go around furniture to and from doors;
   - an occupancy table, so two actors are never sent to the same spot.

   It gets its own detailed design and plan.

## Stage 1 design

### 1. An automated NPC check (the failing test first)

- **Test hook:**
  - With `?npccheck` in the URL, sim-hub exposes `window.__NPC` = `{ colliders, movers, ... }`, plus the transition entry points needed below. Without it, nothing is exposed.
  - This mirrors the existing `?visibilitycheck` hook (`visibility.ts:144-147`).
  - `colliders` is exported from `walk.ts` only for this hook; its behaviour is unchanged.
- **Check script:** `apps/web/scripts/sim-hub-npc-check.mjs`.
  - It reuses `arcade-smoke.mjs`'s stubbed browser environment, extracted into a shared module both scripts import, so there is no copy-paste.
  - It sets `location.search = '?npccheck'`, imports the built sim-hub bundle and reads `window.__NPC`.
  - It needs no browser or GPU, so it runs in seconds in CI.
- **Checks:**
  - **(a) Walls.** Sample every mover's curve at 500 points. Each sample must be clear of every collider by an NPC body radius of 0.3 m (the player uses 0.32). For `escort`, use its wheelchair-plus-pusher footprint. Report the mover name, the sample point and the collider.
    - As built, `car`, `shuttle` and `techCart` are checked by their real oriented footprint (their meshes' bounding boxes) instead of a circle: plus 0.2 m for the vehicles and plus 0.1 m for the tech cart.
  - **(b) Spacing.** Step the movers' own update with a fixed seed for start offsets over 20 minutes of simulated time at 30 Hz. No two NPCs (movers plus the stationary cast) may come closer than 0.5 m centre to centre. Report the pair, the time and the place.
    - As built, the 20 minutes include scripted journey moves and real handoff moves, so movers and story actors meet over and over. The hdr and ctcontrol handoff routes stay out of the script: they start inside rooms that resident runners use, and routes inside rooms belong to stage 3.
    - It also fails if a mover ever holds for the full 8 s and is released at runtime (see section 3), because that means a lane leaves it waiting for good.
    - A static sub-check: every handoff resting spot (the final point each handoff sends its actor to) and every literal position in `journey.ts` must be at least 0.9 m from every visible mover loop. It reports the spot, the mover and the distance.
  - **(c) One move per actor.** Through the hook, start a journey move and then a second move for the same actor before the first ends. Exactly one transition may own the actor, and the actor must keep moving continuously from where it was, with no jump.
  - **(d) No jump after a hidden tab.** Simulate a 10 s gap with no frames. On the next frame, no mover or transition actor may move further than one normal frame's step.
  - **(e) Yielding.** Added during the build. A mover holds, with limbs and height still, for an obstacle 0.7 m ahead; walks on at its exact pace when it is removed; ignores one behind, 1.2 m ahead or at 70°; and yields only to lower-index movers. A blocker that never moves is outwaited: the mover is released after 8 s, walks on at its exact pace, and its `releases` counter goes up by one.
- **Run it now:** it must FAIL today on (a), (b), (c) and (d). That output is the "before" evidence.
- **Visual aid:** the script can also write an SVG floor plan (`--svg <file>`) of the walls and every mover loop, with clipping points marked. It is shared with the owner as before/after.

### 2. Redraw the background walkers' loops

- Re-author each mover loop in `npc-behavior.ts` along corridor lanes and through door points. The reference geometry is the room table in `rooms.ts` and `doorPoint`/`corridorNodesFromHub` in `walk.ts`.
- Rules:
  - keep each walker's role and general area (who walks where), so the scene reads the same;
  - change only the waypoints, and the start offsets where check (b) needs them;
  - check (a) must pass.
- As built:
  - **Speeds were rescaled** so walking pace in m/s is unchanged, because the new loops have different lengths: `speed_new = speed_old x length_old / length_new`.
  - **Areas changed** where the old route could not be kept:
    - `techCart` covers a shorter stretch of the north spine: z -9..-58 became about -21 to -41.7, with lanes at x = -1.2 and -2.4 (the south-bound lane eases east before its south turn so the cart's rear stays off the west wall).
    - The `walker` no longer reaches the hub entrance: its east end moved from -6 to -13.1.
    - The `escort`'s west end moved from 17 to 25.2.
    - The `visitor`'s loop moved south.
    - A few extra lanes moved to clear journey routes and door mouths.
    - `ctRunner` stays west of x = 30 inside CT control, so it never walks through the CT control staff at (31.1, -7.8), (31.3, -7.4) and (32.3, -7.2) or the idle staff.

### 3. Spacing: lanes and yielding

- **Lanes:** loops that share a corridor use separate lanes (corridors are 7–8 m wide). No two loops run along the same line.
- **Yielding:** crossings are unavoidable, so background walkers yield.
  - Each frame, a mover holds still when another NPC is within 0.9 m ahead of it, inside a ±50° cone of its heading.
  - "Another NPC" means a higher-priority mover, or any journey, handoff or cast actor. Movers are ordered by index, and journey and story actors always outrank movers.
  - A mover only ever waits for higher-priority NPCs, so two walkers can never wait for each other forever.
  - This needs movers to keep their own progress: `u += dt * speed`, unchanged while holding, instead of `u = sec * speed + offset`.
  - While holding, the walk swing stops, so a waiting walker stands rather than walking in place.
- Story actors (journey and handoff) never wait for background walkers.
- **Runtime release:** a cast or journey actor that stands still on a lane would freeze a walker for good. So after 8 s of continuous waiting the walker walks on, and its `releases` counter goes up. Check (b) fails if any release happens on a lane, and check (e) tests the release itself.
- Check (b) must pass.

### 4. One move per actor, and a pausing clock

- **One move per actor:**
  - As built, a second move is queued, not interrupting: it starts from the arrival point after the first move's `onComplete`. At most one transition owns an actor at a time.
  - Nothing is removed or cut short, so the first move always finishes and its `onComplete` runs first.
  - Check (c) enforces these queue semantics: no overlap, no jump, the second move starts where the first arrived, and `onComplete` runs in order.
- **A simulator clock** that only advances while frames run:
  - `animate` accumulates `simSec += dt`, where `dt` is already clamped to 0.05, and passes `simSec` to `updateMovers`, `updateDutyAnimations`, `updateHandoffTransitions`, `updateWorkflowTransitions` and `updateNpcExchanges`.
  - Every place that stamps a transition's start time uses the same clock instead of `performance.now()`.
  - A hidden tab then pauses everyone, and they resume where they were.
  - As built, the clock is `S.simSec`. It drives every consumer of `sec`, so the couch, the ambulance, the beacons and the equipment pulses also pause with the tab.
  - Consequence: below 20 fps, `dt` is clamped to 0.05, so the simulation runs in slow motion.
- Checks (c) and (d) must pass.

### 5. CI

- The web job runs `node scripts/sim-hub-npc-check.mjs` after `build:arcade`, next to the smoke step, with a step timeout.
- A future loop that clips a wall, or a change that brings back overlapping moves, then fails CI.

## Out of scope for stage 1

- Journey and handoff routes inside rooms (stage 3).
- Seated and lying poses (stage 2).
- Furniture as colliders: walls only, matching the player.
- The ambulance's route (`advanceRoute`). It is outside the building; the check does not sample it.

## Verification

1. **Automated:**
   - the NPC check fails before the fix and passes after;
   - `pnpm check`, lint and unit tests stay clean;
   - the arcade smoke check gives 3 × SMOKE OK;
   - CI e2e passes, including the sim-hub specs.
2. **Owner:**
   - the before/after SVG floor plan of walker loops;
   - the simulator walk-through.

## Stage 2 design: standing, sitting and lying

**Status:** approved by the owner on 2026-10-29: build stage 2, fix the float with longer legs, and move the backrests.

### What runtime measurement showed

Measured in the loaded simulator (stubbed harness and headless Chromium). These numbers correct the static investigation's assumption that the floor is at y = 0:

- **Floors** are at y ≈ 0.065–0.08 (lobby 0.075, vaults 0.08). Actor groups are placed at y = 0.
- **Every standing or walking person floats about 0.43 m.**
  - `personFigure` puts the hip pivots at local y = 1.06, but each leg is a single 0.5 m box plus a shoe, so the sole ends at local y ≈ 0.51.
  - Every person mover and cast/journey actor has its lowest point at 0.50–0.51.
  - A low side-on screenshot confirms the gap.
  - Vehicles, the cart and the wheelchair frame sit correctly.
- **Seated** (`setActorSeated`, y = −0.35): the hip is at 0.71 against a lobby chair seat top of 0.54, so the pelvis hovers 17 cm above it. The rigid legs stick out forward.
- **Lying patients'** lowest points are 1.20 (CT) and 1.34 (vault). The table tops are about 1.03 and 1.08.

### Design

1. **Legs that reach the floor, with knees.** Each leg becomes a thigh (hip → knee) and a shin (knee → sole) with a knee pivot.
   - The hip stays at local 1.06, and the sole lands at local 0.07 (floor height). Everything above the hips (torso, head, labels, speech bubbles) is unchanged, so the journey's camera framings still fit.
   - People look as tall as they appear today.
   - Thigh 0.47, shin 0.40 plus a 0.06 shoe; same materials and thickness. The `clothingRig` bottom parts include both segments, so gowns and colour changes still cover the whole leg.
2. **One leg-swing helper.** The five places that swing legs while walking (`npc-behavior.ts` ×4, `equipment.ts` ×1) and `poseCharacter` all call one helper, `setLegSwing(rig, swing)`. It rotates the thighs as today and bends the trailing knee a little.
3. **Seats know their seat.**
   - `chair`, `couch`, `benchSeat`, `taskChair` and the wheelchair each register a seat anchor: world `x`, `z`, facing and seat-top height.
   - `seatActor(actor, seatOrPoint)` snaps to the nearest anchor within 1 m and poses the figure: thighs level, shins down, pelvis on the seat top, hips toward the back of the seat, and facing the seat's way. On a seat taller than shin plus shoe, the feet hang.
   - `setActorSeated(actor, true)` and `sitPatient` use it.
4. **Everyone sits on a real seat:**
   - the lobby journey patients and family go onto actual chairs;
   - the patients `sitPatient` places in consult, education and the other rooms really sit;
   - the occupied wheelchair's figure is seated on its seat.
5. **Backrests follow rotation** in `chair`, `couch`, `taskChair` and `benchSeat`. Rotated chairs get their backs on the correct side.
6. **Lying patients:** the three lying-patient builders become one. It places the patient so its lowest point rests on the couch or table top. The top is measured from the actual couch/table mesh, not a constant.

### Checks (added to `sim-hub-npc-check.mjs`; they fail before the fix and run in CI)

- **(f) Feet on the floor:** every standing or walking person's sole is within 3 cm of the floor beneath them. The floor is found from the scene's floor meshes. This covers movers, cast and journey actors.
- **(g) Seated:** every seated person has a seat anchor within 0.3 m, a pelvis within 2 cm of that seat's top, and faces within 20° of the seat's facing.
- **(h) Lying:** every lying patient's lowest point is within 2 cm of the top of the couch or table under them.
- **(i) Wheelchair:** an occupied wheelchair's figure is posed seated, with its pelvis on the wheelchair seat.

### Screenshots for the owner

`apps/web/scripts/sim-hub-shots.mjs` is a dev tool, not run in CI. It loads the built simulator in headless Chromium, freezes it and renders fixed camera poses:
- a walker side-on;
- the lobby waiting chairs;
- a consult patient;
- the wheelchair escort;
- the CT table;
- the vault couch.

Before and after images go on a review page.

### Out of scope for stage 2

- Routes inside rooms, and occupancy (stage 3).
- Arm and hand poses beyond what sitting needs.
- Changing anyone's height above the hips.
