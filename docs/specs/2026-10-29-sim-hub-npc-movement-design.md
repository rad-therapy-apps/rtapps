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
   - Thigh 0.48, shin 0.45 plus a 0.06 shoe (0.99 m from hip to sole); same materials and thickness. Seated on a lobby chair (seat top 0.54), the sole then ends about 1.5 cm above the floor. The `clothingRig` bottom parts include both segments, so gowns and colour changes still cover the whole leg.
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
  - It samples 12 moments over one leg-swing cycle after the journey reset, then t = 30 s and t = 90 s, then 8 moments 0.6 s apart over each of the ambulance crew's two walks (unload and load).
- **(g) Seated:** every seated person has a seat anchor within 0.3 m, a pelvis within 2 cm of that seat's top, and faces within 20° of the seat's facing. The pelvis is the hip pivot minus 0.06 m, scaled with the figure (0.82× for the wheelchair occupant). Four sub-checks:
  - **seat facing:** no seat (wheelchairs aside, 55 seats) faces a wall within 3.0 m;
  - **exchange facing:** in every speech exchange with a seated member, the partner is within 60° of the seat's facing;
  - **pickup facing:** the journey's lobby pickup, run for Jordan and for Mia, ends with the seated patient facing the therapist within 60°, and the therapist's leg column clear of furniture;
  - **handoff seating:** "Have a seat" (from the check-in desk) and patientcare → lobby end with the patient seated on its chair. "Have a seat" for a patient already seated in the lobby starts no move.
- **(h) Lying:** every lying patient rests on its couch or table top. The check finds the top by its `props.ts` geometry (the 5.8 m CT table, the vault couch's 4.2 m carbon insert, the 2.2 m exam table), not by the rule `restLyingPatient` uses.
  - The lowest point, and the undersides of the torso and the pelvis, are within 2 cm of the top.
  - The footprint of the lowest parts reaches no more than 7 cm past any edge of the top.
  - The CT patients are measured again with the couch slid 0, 1, 2 and 3.15 m into the gantry.
- **(i) Wheelchair:** an occupied wheelchair's figure is posed seated, with its pelvis on the wheelchair seat.
- **(j) Stand-up:** a seated actor that starts a move keeps its leg column out of furniture for the first 30 frames. The leg column runs from the soles to the knees, with a 0.15 m radius around the soles' midpoint. Furniture is any non-person mesh under 3 m across whose top is above 0.15 m. Four flows are checked: the consult → education handoff, patientcare → lobby, "Have a seat", and Mia's journey move from her lobby chair.
- **(c) One move** (stage 1) now starts from the reset seat, so it also measures the stand-up: no step over 0.25 m.

### Screenshots for the owner

`apps/web/scripts/sim-hub-shots.mjs` is a dev tool, not run in CI. It loads the built simulator in headless Chromium, freezes it and renders fixed camera poses:

- a walker side-on;
- the lobby waiting chairs;
- a consult patient;
- the wheelchair escort;
- the CT table;
- the vault couch;
- low, side-on views level with the CT table, the vault couch and the HDR exam table (`ct-low`, `vault-low`, `hdr-low`), which show the lying patients' contact with the top.

The before and after shots go to the owner on a review page.

### Out of scope for stage 2

- Routes inside rooms, and occupancy (stage 3).
- Arm and hand poses beyond what sitting needs.
- Changing anyone's height above the hips.

### As built

1. **Pelvis drop.**
   - `setLegSwing` writes `walkRig.body.position.y` each frame: the depth of the lower sole corner (heel or toe) below rest. So the planted foot stays at local 0.07 at every phase of the swing.
   - The head moves with the body: −3.8 to +1.3 cm for walkers and the ambulance crew (peak thigh swing 0.357 rad), and down to −5.8 cm on handoff walks (0.422 rad).
   - This is a recorded exception to "everything above the hips is unchanged".
2. **Person bob removed.** Movers carrying a person lost the ±1 cm sine bob on y; the pelvis drop is now their walking bob. Only the car and the shuttle keep it; the tech cart and the wheelchair escort carry a person, so they lost it too.
3. **Ambulance crew.** The crew stands on the apron outside the lobby floor (y = apron top − 0.07 = −0.071), and at y = 0 on the lobby floor. Check (f) samples both crew walks.
4. **Knee cap.** A 0.12 m cube at each knee pivot, in the leg material, fills the wedge between thigh and shin when the knee bends. It is one of the `clothingRig` bottom parts.
5. **Seat anchors.**
   - `SEATS` (`props.ts`) holds one `{ x, z, facing, top, kind, group? }` per sitting place. Furniture anchors are world coordinates. A wheelchair's anchor is in its own group's frame (`group`), so it moves with the chair; `seatInWorld` resolves it.
   - There are 61 anchors:
     - 20 chairs;
     - 9 couch places (3 couches, one place per 0.6 m);
     - 10 bench places;
     - 8 task chairs;
     - 8 exam-table places;
     - 6 wheelchairs.
   - Each exam table has 2 places, one 0.2 m in from each long edge, each facing out off its edge.
   - The offsets toward the seat front and the tops:

     | Seat       | Offset  | Top                 |
     | ---------- | ------- | ------------------- |
     | chair      | 0.06 m  | 0.54                |
     | couch      | 0.07 m  | 0.59                |
     | bench      | 0.045 m | 0.60                |
     | task chair | 0.06 m  | 0.65                |
     | exam table | —       | 0.945               |
     | wheelchair | —       | 0.64 × scale + 0.04 |

   - `seatActor` puts the hips 0.12 m behind the anchor along its facing, with the pelvis (hip − 0.06) on the top; both scale with the figure. It keeps the anchor in `userData.seatAnchor`.
6. **Furniture `rot` changes.**
   - The rotations were authored while backrests ignored `rot`, so a seat's facing never showed. With backrests following `rot`, these were turned:
     - the lobby's front-row chairs, 0 → π (face reception);
     - the lobby couches and bench, π/2 → −π/2 (face into the lobby);
     - the social couch, 0 → π (faces the chairs and the social worker);
     - the education chairs, 0 → −0.4 × i for i = −1, 0, 1 (the outer chairs turn in toward the desk);
     - the education bench, π/2 → −π/2 (it faced a wall 0.9 m away);
     - the manager's visitor chairs, 0 → π (face the desk).
   - Check (g)'s "seat facing" and "exchange facing" sub-checks guard these.
7. **Standing up.**
   - A seated actor that starts a journey move or a handoff stands up out of its seat first (`beginRise`/`stepRise`). Over 0.5 s, the hips travel from the seat to 0.5 m in front of the seat anchor, along its facing (off the table edge for an exam table), and rise to standing height.
   - Meanwhile the soles slide from where they rest to under the hips (`setLegReach`, a two-joint knee solve), so the lower legs stay in front of the seat. The root moves at most about 0.06 m a frame.
   - The walk then starts from that point.
   - `setActorSeated(actor, false)` only drops the figure to y = 0 where it is and poses it neutral; the journey uses it right after placing an actor directly.
   - `faceNpcToward` leaves seated figures alone: a seated body keeps its seat's facing.
8. **Sitting down at a handoff's end.**
   - A patient handoff whose final point is within 0.3 m of a free seat anchor ends with the patient seated on it. The finals of "Have a seat" (−3.3, 3.54) and patientcare → lobby (−4.75, 3.54) are lobby chair anchors.
   - "Have a seat" for a patient already seated in the lobby does nothing.
9. **Moved positions.**
   - Jordan is seated at reset, on the lobby chair at (−1.85, 3.6); he used to stand at (−2.5, 3.0). Mia sits at (−6.2, 3.6) (it was 3.3).
   - Both lobby pickups walk the patient to the chair at (−3.3, 3.6); it was (−2.8, 3.4), between two chairs.
   - The therapist collecting them stops at (−2.9, 2.5), in front of that chair, about 20° off the seated patient's facing. It was (−0.6, 2.9), 74° off.
   - The consult patient moved to dz 0.8 (was 1.2), the social patient to (0.57, 1.65) (was (1.25, 1.0)), and the patientcare patient to dz 1.1 (was 1.5). Each now sits on its exam table edge, couch or chair.
10. **Lying placement.**
    - `createLyingPatient` is the one builder. Its back is flat: the undersides of the pillow, torso, pelvis, arms, forearms, legs and feet are one plane, the figure's lowest point, and the head rests on the pillow.
    - `restLyingPatient(cont, surface, x, z)` puts that plane on the top of the mesh it is given. `LYING_SURFACES` (`props.ts`) holds one per room: the CT table, each vault couch's carbon insert and the HDR exam table top.
    - Only x and z change afterwards (the CT couch slide), so the contact holds without per-frame work.
    - The HDR patient is centred on its 2.2 m table (dx −1.57). The 2.27 m resting figure's pillow ends 1 cm past the head end; the head and hair overhang it by 6–7 cm, and the shoe tips by 6 cm at the foot end.

## Stage 3 design: routes inside rooms, and nobody in furniture

**Status:** approved by the owner on 2026-10-30. The owner also reported stationary NPCs "standing in furniture, phasing through it".

### What runtime measurement showed (2026-10-30)

The probe sampled the leg and torso boxes of every person against every furniture mesh. Furniture was classified by geometry, excluding floors, walls, ceilings, mats and wall items above 2 m, and the seat a person sits on.

- **Stationary staff inside their desks (7):**
  - Medical Dosimetrist (dosimetry) 15 cm;
  - CT control therapist 9 cm into the console, with shoulder and head into the window partition;
  - Manager 2.5 cm;
  - Physicist, Safety Officer, Navigator and LINAC control therapist 1–2 cm.
- **Hand-over routes through furniture:** of 21 HANDOFFS, most cross furniture. Examples:
  - the CT control console, 37 cm, where a route starts at the staff spot;
  - exam tables in consult and patientcare, up to 28 cm;
  - the education desk, 36 cm;
  - the lobby and social couches, 16 cm;
  - the LINAC control console, 14 cm;
  - the manager and dosimetry desks, 11 cm.
- **Hand-over end points inside furniture:**
  - education (−41.1, −6.2), inside the desk;
  - LINAC control (50.5, 7.2), inside the console;
  - QA (−6.2, −43.2), inside a 1.55 m glass enclosure, 44 cm deep.
- **Shared end points (occupancy):**
  - (−41.1, −6.2) ×2;
  - (40.4, −7.2) ×2;
  - (6.4, −17.2) ×2;
  - (−6.2, −43.2) ×2;
  - (50.5, 7.2) ×4, which is also 0.22 m from the stationary LINAC control therapist;
  - "Have a seat" and commons → lobby on the same lobby chair.
- **Journey moves:** both journeys driven to the end give 38 moves (treatment 11, new patient 27). 20 of them go more than 2 cm into furniture:
  - the education desk, 36 cm, where Mia's education end point is inside the desk;
  - the CT control console, 22 cm;
  - the vault 1 bench, 18 cm;
  - a lobby couch, 16 cm, on every walk out of the lobby to the east;
  - the CT sim bench, 15 cm;
  - the consult exam table and lobby chairs, 6 cm.
- **Background walkers:** within 3 cm of furniture (the visitor 3 cm, ctRunner 2 cm, hdrRunner 1 cm, with a 0.15 m ring).

### Design

1. **Checks first,** RED, then in CI:
   - **(k) Rest clearance:** every person at rest is at least 0.05 m clear of furniture (seated people exclude their own seat). This covers the stationary cast and duty actors, and every person at the end of each hand-over and journey move.
   - **(l) Routes clear:** every frame of every hand-over and journey move (both journeys) keeps the body within 0.02 m of furniture, at most. Stand-up and sit-down frames count. A sub-check samples the background walkers' loops: a 0.2 m ring around each walker, at heights from 0.1 to 1.3 m, stays within 0.02 m of furniture.
   - **(m) Occupancy:** no two people at rest, or route end points, are within 0.5 m of each other, and a seat anchor holds one person.

   The furniture classifier from the probe becomes a shared script module. The check drives both patient journeys from start to finish on a simulated clock: the page's timers run in simulated time, so the journey's own sequence runs headlessly in seconds.

2. **Stationary staff** move to clear spots by their desks or consoles, still facing their work.
3. **Arrival spots:** each room gets a short list of clear standing spots (position plus facing). A hand-over into the room takes the first free spot instead of a fixed literal. A spot is freed when its person leaves. Journey moves keep their authored end points, because they are story positions (beside a particular couch or console). Checks (k), (l) and (m) hold them to the same rules, and an end point that fails moves the least distance that passes.
4. **Per-room waypoints:**
   - each room gets a small hand-placed graph of clear points linking its door to its spots, seats and arrival spots;
   - routes go spot → graph → door → corridor (and the reverse), taking the shortest clear path through the graph instead of straight lines;
   - authored by hand and verified by (l), as the owner chose over automatic pathfinding.
5. **Sit-down mirrors stand-up:** a walk to a seat ends at the seat's approach point (anchor + 0.5 m along its facing). The person then eases into the seat over about 0.4 s, with every step under check (c)'s 0.25 m.
6. **Leftovers from stages 1 and 2:**
   - hdrRunner's loop clear of the HDR nook desk;
   - the HDR and CT control hand-over routes, which stage 1 left out;
   - the consult patient walking back through the exam table;
   - Mia's consult end point grazing the exam table.

### Out of scope for stage 3

- Dynamic avoidance between moving story actors.
- Furniture as colliders for the player.
- Pathfinding in the corridors (stage 1 lanes stay).

### As built

1. **Checks (k), (l) and (m)** (`scripts/sim-hub-npc-check.mjs`, furniture in `scripts/lib/furniture.mjs`).
   - **Furniture** is every visible mesh except people, movers, floors, walls, ceilings, mats, glass panes, planes and wall items above 2 m: 775 records. It is built once at the journey reset, while every room shows. The **body** is the leg meshes and the torso, sampled on a grid over each mesh's box: 6 × 6 × 6 points for (k), 4 × 4 × 4 for (l).
   - **Simulated clock.** The page's timers (`later()`, the door timers) run on the check's clock. `driveJourney` drives each journey through its own sequence to `done`: treatment 11 moves, new patient 27.
   - **Count floors**, so the checks cannot pass by measuring nobody:
     - at least 40 people at rest after the journey reset;
     - exactly 21 hand-overs and 11 + 27 journey moves followed;
     - every followed move has an end, measured or dropped.
   - **Reset between runs.** `snapshotPeople`/`resetPeople` put every person back as the page built it. The rotation is restored as Euler angles: a figure restored from a quaternion and turned more than 90° came back as (π, π − y, π), then turned the mirrored way and walked backwards.
   - **(l)** follows every frame of a move, stand-up and sit-down included. It leaves out the seats within 0.6 m of the move's start, its curve's end or the actor's own seat. Its ring sub-check samples 500 points of the walker, visitor, therapist, ctRunner, linacRunner and hdrRunner loops.
   - **(c)** queues three moves for Jordan: lobby → consult → education → back to the lobby chair at (4.40, 3.34), with `{ sit: true }`. That chair is free, its approach point is clear, and no other move uses it. onComplete order [1, 2, 3]; the largest step is 0.097 m, 0.077 m during the sit-down.
   - **Output:** `--svg` draws the furniture, every (l) route and a red dot per (k) or (l) failure. There are four new shots: `dosimetry-desk`, `ctcontrol-console`, `manager-desk` and `linac-console`.
   - The whole check runs in about 20–25 s.
2. **Staff moved out of their desks** (world x/z; facing and pose unchanged unless noted). Each moved to the nearest spot on a 0.05 m grid at least 0.06 m clear; the extra 1 cm covers the duty animation's torso turn.

   | Person                                  | Old             | New             | Move   |
   | --------------------------------------- | --------------- | --------------- | ------ |
   | Medical Dosimetrist (dosimetry:staff:0) | (5.40, −50.80)  | (5.40, −50.45)  | 0.35 m |
   | Medical Physicist, Dr. Priya Shah       | (7.10, −47.90)  | (7.10, −48.35)  | 0.45 m |
   | Rad Onc Manager                         | (20.00, 6.90)   | (20.00, 7.10)   | 0.20 m |
   | Radiation Safety Officer                | (−7.50, −19.10) | (−7.50, −18.95) | 0.15 m |
   | Patient Navigator                       | (−43.60, −6.60) | (−43.60, −6.95) | 0.35 m |
   | LINAC control therapist, Marcus Hill    | (50.60, 7.00)   | (50.80, 7.00)   | 0.20 m |
   | Radiation Oncologist (consult)          | (−20.30, −8.80) | (−20.30, −8.75) | 0.05 m |
   | CT control therapist, Avery Woods       | (30.20, −11.00) | (31.00, −11.00) | 0.80 m |
   - Avery also turns from ry 0.3 to −π/2, facing the console like the operators. No spot within 0.6 m cleared the console and the window partition, so the 0.8 m move was approved.
   - Marcus moved 0.15 m first, then 0.05 m more when the routes were checked: at 50.75 every departure put a thigh into the console top, because the pelvis drops 6 cm while walking.

3. **Arrival spots** (`room-routes.ts` `ARRIVAL_SPOTS`, world x/z with the facing taken on arrival).
   - Each room that a hand-over targets has one spot more than the hand-overs into it, and at least 3.
   - Each spot is:
     - at least 0.06 m clear of furniture;
     - 0.65 m from the room's other spots;
     - 0.55 m from its residents;
     - 0.5 m from any seat anchor, and 0.6 m from a seated resident's feet;
     - 0.95 m from every mover loop.
   - Facings point at the room's primary staff member. In LINAC control they point at the console centre (50, 9), and in the lobby at reception.
   - **Taking a spot.** A hand-over without its own `final` takes `takeArrivalSpot(target, actor)`: the first spot that no other actor holds, with no other visible person within 0.5 m. The hold ends when the actor starts another move, or at `clearArrivalSpots()` (the journey reset). The seat finals keep their `final`.

   | Room         | Spots (x, z, facing)                                                                                    |
   | ------------ | ------------------------------------------------------------------------------------------------------- |
   | lobby        | (−3.2, 1.3, −2.53), (−3.45, 0.7, −2.5), (−2.6, 1.05, −2.41), (−3.75, 1.65, −2.66)                       |
   | consult      | (−16.7, −6.85, −2.06), (−17.3, −7.1, −2.07), (−16.5, −6.2, −2.16)                                       |
   | social       | (−28.9, −6.05, −2.25), (−28.9, −6.7, −2.12), (−29.6, −6.95, −2.16)                                      |
   | education    | (−41.1, −5.4, −2.13), (−41.5, −7.0, −1.55), (−41.8, −5.4, −2.28)                                        |
   | patientcare  | (−27.4, 4.95, 0.53), (−27.4, 6.05, 1.27), (−26.65, 5.5, 0.06)                                           |
   | physics      | (6.4, −17.2, −2.66), (5.75, −17.2, −2.93), (6.15, −17.8, −2.63)                                         |
   | qa           | (−5.65, −43.4, −2.16), (−5.65, −42.4, −2.32), (−5.6, −44.05, −2.03)                                     |
   | ctcontrol    | (31.3, −7.4, 1.05), (31.3, −6.75, 1.46), (31.85, −7.75, 0.64)                                           |
   | ctsim        | (40.4, −7.2, 2.58), (40.4, −7.9, 2.3), (40.5, −6.5, 2.77)                                               |
   | linaccontrol | (52.75, 7.2, −0.99), (52.75, 6.5, −0.83), (52.75, 7.9, −1.19), (52.75, 8.6, −1.43), (52.75, 9.3, −1.68) |
   | vault1       | (75.0, −14.25, 2.36), (74.8, −14.9, 1.36), (75.45, −13.75, 3.09)                                        |
   | vault2       | (75.15, 14.3, 0.66), (74.8, 14.85, 1.71), (75.8, 14.25, −0.54)                                          |
   - The commons → lobby hand-over now ends at a lobby spot, not in "Have a seat"'s chair.

4. **Room graphs** (`room-routes.ts` `ROOM_GRAPHS`, `inRoomPath`).
   - Every room a hand-over or journey move enters or leaves has a graph; there are 18 (radbio has no moves). Node 0 is `doorPoint(room)`. The lobby's nodes 0–2 are its exits: E (12.8, 0), W (−12.8, 0) and T (0, −10.8).

     | Room        | Nodes / edges | Room         | Nodes / edges |
     | ----------- | ------------- | ------------ | ------------- |
     | lobby       | 16 / 23       | qa           | 3 / 2         |
     | consult     | 6 / 6         | dosimetry    | 2 / 1         |
     | social      | 5 / 4         | commons      | 2 / 1         |
     | education   | 8 / 7         | manager      | 3 / 2         |
     | patientcare | 6 / 5         | ctcontrol    | 6 / 5         |
     | safety      | 2 / 1         | ctsim        | 8 / 8         |
     | physics     | 2 / 1         | linaccontrol | 6 / 6         |
     | engineering | 3 / 2         | vault1       | 7 / 6         |
     | hdr         | 2 / 1         | vault2       | 6 / 5         |

   - **Edges** keep a 0.25 m half-width strip clear of furniture at heights 0.1–1.3 m. The exceptions are the vault and HDR door edges, which cross the 2 cm door leaf across each doorway by 1.0 cm at most.
   - **`inRoomPath(room, from, to)`** goes from the node nearest `from`, along the shortest graph path (Dijkstra, no node repeated), to the node nearest `to`. Nodes within 0.22 m of either end are dropped.
   - **Placing nodes.** A walker's legs swing about 0.6 m behind and 0.4 m ahead at foot height. So each start or final's nearest node lies along a heading on which the person can leave or arrive cleanly.
   - **Routing** (`buildActorHandoffPath`):
     - start → graph → door when leaving a room;
     - door → graph → final when entering one;
     - start → graph → final within a room;
     - in the lobby, start → graph → the exit nearest the first corridor point.
   - **Lobby pass-through.** A corridor leg that crosses the lobby rectangle goes through the lobby graph too: J (0, 0) → G1 (4.2, −0.6) → G2 (6.8, −0.6), through the gap between the two east couches. Walks out of the lobby go along N2–M–C, at z ≈ 2.3–2.4.
   - **Vaults.** The maze lives in the vault graphs. Its first point, in line at (65.1, ±18), became a step beside the entrance marker at (64.75, ±18.95). Vault 1's node P (69.05, −12.9) lets the patient beside the bench leave along it.
   - **NPC treatment lane.** NPC routes walk the treatment corridor's x = 64 line at `NPC_TREATMENT_LANE_X` = 63.4, junction (64, 0) included. The red vault entrance markers (0.24 × 3 × 0.05 m, y 0.5–3.5, at x 63.76–64.00, z ±18; `rooms.ts`) hang in the walkway, and a body centred on x = 64 walked into them by 2.5 cm. `walk.ts` and `rooms.ts` are unchanged, so the player's guided travel is too. The owner has been asked whether the markers are intended.
   - **Last-frame heading.** Both transition walkers keep the heading when the curve's last two points coincide (within 1 µm). Before, `atan2(0, 0)` faced the walker +z on its last frame and kicked the furniture beside the final, by up to 17.6 cm.
5. **Journey finals moved** (old → new; the shortest move that passes, on a 0.05 m grid):

   | Move(s)                                                         | Old            | New             | Move    |
   | --------------------------------------------------------------- | -------------- | --------------- | ------- |
   | treatment 4, new patient 18 (patient beside vault 1's bench)    | (68.8, −14.15) | (68.95, −14.15) | 0.15 m  |
   | treatment 7, new patient 21 (vault therapist → LINAC control)   | (50.8, 8.6)    | (50.85, 8.6)    | 0.05 m  |
   | treatment 8, new patient 22 (treatment control → LINAC control) | (50.8, 10.2)   | (51.1, 10.2)    | 0.30 m  |
   | new patient 2 (Mia → consult)                                   | (−17.2, −6.35) | (−17.2, −5.9)   | 0.45 m  |
   | new patient 3 (Mia → education)                                 | (−40.9, −6.1)  | (−40.9, −5.4)   | 0.70 m  |
   | new patient 4 (navigator → CT sim)                              | (38.0, −4.7)   | (38.1, −4.7)    | 0.10 m  |
   | new patient 5 (Mia → CT sim bench)                              | (37.15, −4.7)  | (37.15, −4.4)   | 0.30 m  |
   | new patient 26 (treatment control → lobby)                      | (−0.65, 3.65)  | (−0.4, 4.1)     | 0.515 m |
   - Mia's education final went to −5.5 for (k), then to −5.4 once the last-frame heading was fixed: facing her real arrival heading, she stood 1.2 cm into the desk top.
   - Her CT bench final went to −4.45, then −4.5 after the rotation fix, then −4.4 for (l): a coat hook hangs at torso height at (37.77, −4.70).
   - Move 26 had left the treatment-control therapist on the CT sim therapist's lobby spot.

6. **Sitting down** (`beginSit`/`stepSit`, `npc-behavior.ts`).
   - A walk to a seat ends at its approach point, `seatApproach(anchor)`: STAND_CLEAR (0.5 m) in front of the anchor, along its facing. It is the point the stand-up rises to, and the graph path is routed to it, not to the seat.
   - Over SIT_S = 0.4 s:
     - the yaw turns the shortest way from the arrival heading to the seat's facing, in the first half (smoothstep);
     - the hips travel from standing at the approach point to `seatActor`'s pose along a smoothstep: 0.12 m behind the anchor, with the pelvis on the top;
     - the soles slide back from under the hips to under the knees (`setLegReach(rig, THIGH_LEN × e, hip − sole)`);
     - the arms ease from the walk's swing to the seated pose's;
     - the last frame calls `seatActor(actor, anchor)`.
   - The largest root step is 0.077 m per 1/30 s frame (check c).
   - **Hand-overs:** a patient whose final is within 0.3 m of a free anchor (the existing rule, decided when the walk starts) walks to that seat's approach point. It sits only if the anchor is still free on arrival; otherwise it stands there.
   - **Journey moves** passed `{ sit: true }` sit on the anchor nearest `final` (`seatAnchorAt`, within 1.0 m). These are Jordan to `LOBBY_PICKUP.chair`, Mia to her lobby chair (−6.2, 3.6), and Mia to `LOBBY_PICKUP.chair`. Their `onComplete` then finds the actor already seated on that anchor. Other journey walks end in the 'neutral' pose as before.
   - The transition stays listed until the figure is seated, so check (l) measures the sit-down frames.
7. **Mover loops** (`addMovingActors`).
   - The ring flagged two walkers, each walking through a parked wheelchair.
   - **visitor:** its west corners moved, (−10, 5) → (−10, 4.75) and (−10, 7.5) → (−10, 7.8). Its lanes now pass the lobby wheelchairs at (−8.5, 5.3) and (−7.6, 7.2) instead of going through their seats.
   - **ctRunner:** its west-bound corridor lane moved north, (30.65, −1.4) and (27.5, −1.4) → z −0.85, past the wheelchair parked at (28.6, −1.4) (`addCirculationProps`).
   - Each is the least move, on a 0.05 m grid, that keeps both the 0.2 m ring and the walker's own body (legs and torso) within 0.02 m of furniture. The ring alone is blind to a wheelchair seat, a slab at y 0.57–0.65 between its 0.5 m and 0.9 m heights.
   - The deepest ring is now: visitor 2.0 cm, ctRunner 1.1 cm, hdrRunner 0.4 cm (the HDR nook desk, under the limit, so unchanged).
     - The visitor's 2.0 cm is the brochure rack at (8.88, 4.60), unchanged by this edit: the ring's 0.5 m and 0.9 m heights sit exactly 2 cm under its shelf tops.
   - Speeds were rescaled as in stage 1, so the walking pace in m/s is unchanged:
     - visitor: 45.325 → 45.864 m, speed 0.01727 → 0.017067 (0.783 m/s);
     - ctRunner: 37.604 → 38.017 m, speed 0.011522 → 0.011397 (0.433 m/s).
8. **patientcare → lobby sits in the east row.**
   - Its `final` moved from the chair at (−4.75, 3.54) to the one at (5.8, 3.34).
   - A wall-box AED cabinet (`rooms.ts`) hangs at y 1.23–2.01 at (−4.6, 3.02), with no wall behind it, right at the old chair's approach point (−4.75, 3.04). The walk there put the patient's torso 6.8 cm into it.
   - Of the two free east-row chairs, (5.8, 3.34) backtracks least past the lobby node N2 (6.9, 2.4).
   - The cabinet itself is unchanged; the owner will be asked about it.
9. **Open questions for the owner:**
   - the red vault entrance markers on the treatment corridor's x = 64 line, which NPC routes avoid on the 63.4 lane (item 4);
   - the floating lobby AED cabinet (item 8);
   - the three wheelchairs parked on or beside walker loops (item 7).
