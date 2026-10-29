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
  - **(b) Spacing.** Step the movers' own update with a fixed seed for start offsets over 20 minutes of simulated time at 30 Hz. No two NPCs (movers plus the stationary cast) may come closer than 0.5 m centre to centre. Report the pair, the time and the place.
  - **(c) One move per actor.** Through the hook, start a journey move and then a second move for the same actor before the first ends. Exactly one transition may own the actor, and the actor must keep moving continuously from where it was, with no jump.
  - **(d) No jump after a hidden tab.** Simulate a 10 s gap with no frames. On the next frame, no mover or transition actor may move further than one normal frame's step.
- **Run it now:** it must FAIL today on (a), (b), (c) and (d). That output is the "before" evidence.
- **Visual aid:** the script can also write an SVG floor plan (`--svg <file>`) of the walls and every mover loop, with clipping points marked. It is shared with the owner as before/after.

### 2. Redraw the background walkers' loops

- Re-author each mover loop in `npc-behavior.ts` along corridor lanes and through door points. The reference geometry is the room table in `rooms.ts` and `doorPoint`/`corridorNodesFromHub` in `walk.ts`.
- Rules:
  - keep each walker's role and general area (who walks where), so the scene reads the same;
  - change only the waypoints, and the start offsets where check (b) needs them;
  - check (a) must pass.

### 3. Spacing: lanes and yielding

- **Lanes:** loops that share a corridor use separate lanes (corridors are 7–8 m wide). No two loops run along the same line.
- **Yielding:** crossings are unavoidable, so background walkers yield.
  - Each frame, a mover holds still when another NPC is within 0.9 m ahead of it, inside a ±50° cone of its heading.
  - "Another NPC" means a higher-priority mover, or any journey, handoff or cast actor. Movers are ordered by index, and journey and story actors always outrank movers.
  - A mover only ever waits for higher-priority NPCs, so two walkers can never wait for each other forever.
  - This needs movers to keep their own progress: `u += dt * speed`, unchanged while holding, instead of `u = sec * speed + offset`.
  - While holding, the walk swing stops, so a waiting walker stands rather than walking in place.
- Story actors (journey and handoff) never wait for background walkers.
- Check (b) must pass.

### 4. One move per actor, and a pausing clock

- **One move per actor:**
  - Starting a journey move or a handoff for an actor first removes any transition that already owns that actor, from both `workflowTransitions` and `handoffTransitions`.
  - The new path starts from the actor's current position. That is the existing behaviour of `movementPathFor`; only the duplicate transition goes away.
- **A simulator clock** that only advances while frames run:
  - `animate` accumulates `simSec += dt`, where `dt` is already clamped to 0.05, and passes `simSec` to `updateMovers`, `updateDutyAnimations`, `updateHandoffTransitions`, `updateWorkflowTransitions` and `updateNpcExchanges`.
  - Every place that stamps a transition's start time uses the same clock instead of `performance.now()`.
  - A hidden tab then pauses everyone, and they resume where they were.
- Checks (c) and (d) must pass.

### 5. CI

- The web job runs `node scripts/sim-hub-npc-check.mjs` after `build:arcade`, next to the smoke step, with a step timeout.
- A future loop that clips a wall, or a change that brings back overlapping moves, then fails CI.

## Out of scope for stage 1

- Journey and handoff routes inside rooms (stage 3).
- Seated and lying poses (stage 2).
- Furniture as colliders: walls only, matching the player.
- The ambulance's route (`advanceRoute`). It is outside the building; it is sampled by the wall check only for the information.

## Verification

1. **Automated:**
   - the NPC check fails before the fix and passes after;
   - `pnpm check`, lint and unit tests stay clean;
   - the arcade smoke check gives 3 × SMOKE OK;
   - CI e2e passes, including the sim-hub specs.
2. **Owner:**
   - the before/after SVG floor plan of walker loops;
   - the simulator walk-through.
