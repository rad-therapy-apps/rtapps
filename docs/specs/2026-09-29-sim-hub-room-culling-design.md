# sim-hub room visibility culling — design

**Status:** approved by owner 2026-09-29 ("approved"). Stage 2 of the vault-1 lag work.
**Evidence:** `.superpowers/sdd/perf-arch-report.md` (measured on M1/ANGLE Metal, 2026-09-29).
Stage 1 (#98): LINAC feeds gated to the control room, shader precompile, shadow map every 4th frame.

## Problem

The renderer frustum-culls only; walls occlude nothing. From the vault-1 arrival view 2,296 draw
calls produce 114 on-screen meshes (95% waste), and every render pass (main, console feeds,
shadow) pays it. The scene is ~3,390 individual meshes. Hiding every room other than the one the
camera is in measured vault-1 JS time 44.5 → 8.6 ms/frame and the lobby 11.4 → 5.9 ms.

## Approach: one-level portal culling of room contents

- Each room's **contents** (floor, ceiling, furniture, fixtures, decor, stationary duty NPCs) live
  in one `THREE.Group` per room. **Shells are never culled:** walls, doors, door/window frames,
  window glass, wall signs, and anything straddling a room boundary stay always-drawn, because
  they are visible from the outside (hiding them would open holes into the void).
- Each room has at most one door (`doorSide`) and one window (`windowSide`); their openings are
  derived from the same numbers `buildSide()` uses (door gap 2.6 m, 4.8 m for vaults, 2.65 m
  high; window 4.5 m wide, 1.0–2.82 m high) and stored as world-space `Box3` **portals**.
- Per render pass, for a given camera:
  - the room containing the camera (rect test on room `x,z,w,d`, centre convention) is visible;
  - the "outside" cell (hallways, lobby circulation, exterior) is visible if the camera is outside
    all rooms, or if the current room's portal intersects the camera frustum;
  - another room is visible if any of its portals intersects the camera frustum and the outside
    cell is visible.
  This is conservative: it may draw a hidden room, never hide a visible one.
- **Overview mode is exempt** (bird's-eye with ceilings hidden sees everything): all groups visible.
- **Cameras above the walls are exempt too:** culling assumes an eye-level camera, and from higher
  up roofs and ceilings are on screen (the overview-to-guided descent, high guided orbits). When
  the camera is above its room's wall top minus 0.25 m (3.75 m rooms, 4.15 m lobby, 5.7 m vaults;
  outside every room the lowest, 3.75 m), all groups and actors are visible. The per-room test
  keeps the LINAC 'Overhead' feed camera (y 5.4 inside a 5.7 m vault) culling.
- The **hub lobby** is treated like any room, and its wall gaps (`lobbyWallWithGap`) are its portals.
- **Actors are never reparented** (any cast actor can be picked for a handoff and walk out of its
  room): movers, cast/duty actors, journey actors and `userData.inHandoff` stay scene-level. They
  are ~38% of all meshes, so they are culled **per frame by position**: an actor is visible if the
  room containing its world position is visible (the outside cell if it stands in no room).
- **Console feed renders** apply visibility computed from the feed camera (the LINAC feed cameras
  sit inside vault 1), then restore the main camera's visibility.
- **Shadows:** three.js skips invisible objects in the shadow pass, so culled objects cast no
  shadows. With the shadow map refreshed every 4th frame, newly visible contents' shadows can lag
  up to 3 frames. Contents near a doorway may not cast into a visible hallway (check on the owner
  walk).

## Grouping mechanism

Grouping happens in **one pass after the building is built**, not by editing hundreds of
`scene.add` call sites. Every top-level scene child is classified by its world-space bounding box.
If the box lies wholly inside a room's interior (the room rect shrunk by half the wall thickness),
the child is reparented into that room's content group with `Object3D.attach`, which keeps its
world transform. Anything else stays where it is. Existing `userData.roomId` groups from
`furnish()` move as a unit. The pass is a no-op visually until culling is switched on.

## Known behaviours

- CSS2D NPC labels are distance-faded today, independent of walls (existing behaviour, unchanged).
- A culled room's contents cast no shadows. Sun shadows from one room's contents onto another
  room's visible surfaces are not expected, because contents sit inside walls. Check this on the
  owner walk.

## Out of scope (measure after culling; do only if still needed)

Static geometry merging or instancing, material sharing, and matrix freezing. Merging also
complicates interactables, which need individual meshes for raycasts and highlights.

## Verification

1. **Visibility invariant.** An ID-buffer render from sample poses (every room plus hallway
   points, four headings, walk and guided) with culling OFF vs ON. The set of on-screen mesh ids
   must be identical. This is a committed, re-runnable script.
2. **Measurement harness targets:** vault-1 arrival ≲ 10 ms JS mean, lobby no worse than
   Stage 1, zero program growth.
3. Gates, CI e2e (`simulator.e2e.ts`), and the owner walk.
