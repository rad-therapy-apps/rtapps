# sim-hub room culling — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Stop drawing room contents the camera cannot see, per `docs/specs/2026-09-29-sim-hub-room-culling-design.md`.
**Architecture:** post-build spatial grouping of room contents → portal data → per-pass visibility
from the camera → invariant check proving no visible mesh is ever culled.
**Tech:** Three.js 0.160, TypeScript (`apps/web/arcade-src/sim-hub/src/`), Playwright for measurement.

## Global constraints

- Walls, doors, frames, window glass, wall signs and boundary-straddling objects are NEVER culled.
- Overview mode: every group visible (culling off).
- Movers, `JOURNEY` Object3D actors and `userData.inHandoff` actors are never reparented.
- Culling is conservative: a visible mesh is never hidden (the invariant check enforces this).
- No behaviour change to interactables, raycasts, doors, journeys, SDK, or CSS2D labels.
- Gates per task: `pnpm --filter web lint && pnpm --filter web check && pnpm --filter web test`,
  `pnpm --filter web build:arcade`, `node apps/web/scripts/arcade-smoke.mjs` over the 3 pages.
- Measurement harness: `.superpowers/sdd/perf-arch/` (see perf-arch-report.md re-run steps; the
  `--outDir` must be `../../../../.superpowers/sdd/perf-arch/build/sim-hub` from `apps/web`).
- NEVER read, create or edit `.env*` files.

### Task 1: room content groups (no culling yet)

**Files:** create `apps/web/arcade-src/sim-hub/src/visibility.ts`; modify `main.ts` (call after build).
- `export const ROOM_CONTENT = new Map<string, THREE.Group>()`, with one group per room added to the scene.
- `groupRoomContents()`: for each top-level scene child, skip the protected set (movers, JOURNEY
  actors, in-handoff actors, the room groups themselves). Compute `Box3.setFromObject`. If it lies
  wholly inside exactly one room's interior rect (room rect shrunk by the wall thickness 0.18/2),
  call `group.attach(child)`. Otherwise leave the child at scene level.
- Call it once in main.ts after every room, prop, NPC and console is built, and BEFORE the Stage-1
  `precompileShaders()` call.
- Write an inventory to the report: for each room, content meshes vs meshes left at scene level; the
  total left at scene level by category (shell, corridor, exterior, movers).
- Verify the change is invisible: the harness draw counts are identical before and after, and an
  ID-buffer or pixel comparison at the vault and lobby poses matches.
- Commit `perf(sim-hub): group room contents per room (no culling yet)`.

### Task 2: portals + visibility computation (pure, unit-tested)

**Files:** `visibility.ts`; test `visibility.spec.ts` (next to it). Add the sim-hub src glob to
the vitest **node** project in `apps/web/vite.config.ts` (or the vitest config that defines the
projects) so the spec runs under `pnpm --filter web test`.
- `roomAt(x, z): Room | null` (centre-convention rect test, shared with walk.ts semantics).
- `buildPortals()`: per room, door and window `Box3`s from `doorSide`/`windowSide` and the
  `buildSide()` dimensions. The hub lobby's portals come from its `lobbyWallWithGap` gaps (read
  `buildHubLobby`).
- `visibleRooms(camera): Set<string>`, implementing the spec rules exactly (current room;
  outside-cell visibility; another room is visible if its portal is in the frustum and the outside
  cell is visible).
- Unit tests with synthetic cameras cover:
  - inside a room facing a wall: only that room;
  - inside a room facing its door: that room, the outside cell, and a room whose door is in view
    across the hall;
  - in the hallway: rooms whose portals are in view;
  - a camera exactly on a room boundary.
- Commit `perf(sim-hub): portal data and visibility computation`.

### Task 3: apply culling per render pass

**Files:** `visibility.ts`, `main.ts`, `equipment.ts`.
- `applyVisibility(camera)`: sets `group.visible` for every content group, and sets each
  scene-level actor (the protected set from Task 1: movers, ROOM_CAST actors, JOURNEY actors,
  interaction-scene actors) visible iff `roomAt(actor world x,z)` is visible (the outside cell when
  null). No per-call allocation. In overview, everything is visible.
- main.ts calls `applyVisibility(camera)` immediately before the main `renderer.render`.
- `renderOperatorLiveFeeds` calls `applyVisibility(feed.camera)` before each feed render, for both
  LINAC and CT, then re-applies the main camera's visibility at the end.
- Must not conflict with `ceilings` visibility toggling in walk.ts (a ceiling inside a hidden group
  is hidden; its own flag stays untouched).
- Before and after harness table: vault-1 arrival and 90° poses, lobby, and hallway.
- Commit `perf(sim-hub): cull unseen room contents per render pass`.

### Task 4: visibility invariant check (committed, re-runnable)

**Files:** create `apps/web/scripts/sim-hub-visibility-check.mjs`, built on the harness's
ID-buffer technique.
- Poses: the centre of every room (guided `cam` pose and walk pose), four headings each, plus 6
  hallway points.
- Culling OFF vs ON: the on-screen mesh-id sets must be equal. Exit 1 on any mesh visible with
  culling OFF but hidden with it ON, listing the mesh, the room and the pose.
- Document how to run it in the script header. It runs locally with a GPU and, where available,
  headless SwiftShader; ID renders are deterministic.
- Commit `test(sim-hub): visibility invariant check for room culling`.

## Close-out

Whole-branch review, run on the most capable model: it executes the invariant check and the
harness. Then PR, CI, merge, deploy, and the owner walk: vault 1 via guided and walk, the hallway,
the lobby, the control room monitors, and NPC shadows.
