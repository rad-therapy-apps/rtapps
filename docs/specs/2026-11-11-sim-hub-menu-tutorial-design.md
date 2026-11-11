# sim-hub title menu, free mode, simulator merge and tutorial: design

**Date:** 2026-11-11. **Status:** approved by the owner on 2026-11-11. The owner chose every screen shown here from browser mockups on 2026-11-11 (the pages are kept, not committed, in `.superpowers/brainstorm/99200-1794416889/content/`).

The work ships as three PRs:

1. **Menu and free mode**: the title menu, free mode, the room pop-up, the E prompt and the Esc settings menu. Also removes the old panels.
2. **Simulator merge**: the LINAC/CT simulator is reached only from inside the center. Also archives the gantry game.
3. **Tutorial, Chapter 1**: Jordan's treatment day, played as the patient and then the therapist.

Paths are relative to `apps/web/arcade-src/sim-hub/src/` unless given in full.

## Problem

The sim hub opens on a "How to use" dialog over a screen full of panels:

- a top bar with Overview, Guided Travel, Walk, Help and Ambience;
- a facility directory and a journey box on the left;
- a room panel on the right, with Talk with staff, Travel / Recenter and Facility Overview.

All of them stay open while you walk. The patient journeys move the camera from room to room for you.

The Simulator page also lists three separate entries: the center, the LINAC/CT console and the gantry position game. The center already opens the LINAC/CT simulator through three of its doors.

The owner wants:

- a game-style start;
- no panels while walking;
- room information that pops up as you walk in;
- staff you talk to by walking up and pressing E;
- a tutorial you walk yourself, with objectives, a guide marker and your current role;
- one simulator.

## Owner decisions (2026-11-11)

- **Title menu:** side menu (mockup B). It has two entries, Free Mode and Tutorial, over the clinic seen from above, which turns slowly.
- **Both modes** start outside the main entrance, on the plaza where walk mode starts today.
- **Free mode:** no panels.
  - A controls bar shows at first and hides after about a second of moving.
  - Walking up to a person shows an E prompt beside their head. It fades in from about 5.5 m and grows until E works.
- **Room pop-up:** a centered card that pauses the game (mockup A). It shows the department zone, the room type and "What happens here", plus a "Don't show this again" tick.
- **Esc:** opens the settings menu as mocked up: Sound, Room introductions, Help, Resume and Main menu.
- **Tutorial screen:** one card at the top-left with your role, the objective and a progress bar (mockup B). An orange floating marker shows the distance and leads you door by door.
- **Floor path:** dropped; the marker does the guiding.
- **"Playing as":** you are the character. While you play Jordan there is no Jordan NPC. While you play the therapist, that therapist's NPC is hidden.
- **Chapters:** Chapter 1 is Jordan's treatment day. Chapter 2, Mia's visit from consult to first treatment, is on hold for later.
- **Hints and answer reveal:** use the CT simulator's pattern (`linac-ct/src/ct-suite/console.ts` `validateTechnique`). A wrong answer gets a hint; after three misses the answer is shown.
- **Merge:** option 1. The Simulator page keeps only the center, and LINAC/CT is reached through the center's doors. A single 3D world is the long-term goal and is not part of this work.
- **Gantry game:** archived. It is taken off the Simulator page and unpublished; its files and past scores stay.
- **Way of working:** git worktrees in parallel. The owner wants a message just before implementation starts, so they can compact first.

## Global constraints

- **NPC check:** `node apps/web/scripts/sim-hub-npc-check.mjs` checks a–m stay green.
  - The count floors stay: REST_FLOOR 40, HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15.
  - Never loosen the check, and check j stays unchanged.
  - The check runs on `journey.ts` (`resetTreatmentJourney`, the `JOURNEY` actors, both journeys driven to `done` in check l). So `journey.ts`'s journeys, actors and route builders stay, even though nothing in the game starts the old journeys any more.
- **Scene check, visibility check and vitest:** all stay green.
  - `node apps/web/scripts/sim-hub-scene-check.mjs`
  - `ANGLE=metal node apps/web/scripts/sim-hub-visibility-check.mjs`
  - `pnpm exec vitest run --project server arcade-src/sim-hub/src`
  - The visibility check enters walk mode by clicking `#modeSeg button[data-mode="walk"]` (line 163). It will enter through the new Free Mode entry instead. This changes only how the check starts, not what it checks.
- **e2e:** these must keep working.
  - `#watermark`
  - `#siteChoices`, filled by `procRenderSite()` at the end of boot
  - `#releaseClinical` and `#holdClinical`
  - `window.CONSOLE_APP_URL` and `window.__rtappsVerdictLocked`
  - The player iframe title "Center QA walkthrough".
  - The QA verdict, `RTApps.recordResult('sim-hub-qa', …)` in `sdk-bridge.ts`, is the only score the hub reports. Its path through the CT QA menu stays.
- **CI:** `pnpm build:arcade`, `arcade-smoke.mjs` and the NPC check run in the web job. None of them may be weakened.
- **Commands to run:**
  - `prettier --write` and eslint on the touched files only; not the package-wide `pnpm lint`.
  - `pnpm check` and `prettier --check .`
- **Dependencies:** three.js stays pinned at 0.160.0. No new dependency without the 7-day release age.
- **People in text and comments:** they/them or names.
- **Storage:** the pages use `localStorage`/`sessionStorage` only inside try/catch, and still work when storage throws.

---

## PR 1: Menu and free mode

### Title menu

Shown when loading finishes, in place of today's "How to use" dialog (`#studentHelp`, auto-opened 1150 ms after load in `main.ts`).

- **Backdrop:** today's overview camera pose (`setMode('overview')` in `walk.ts`), slowly orbiting about the same target. A dark gradient covers the left 60% of the screen.
- **Left column:** eyebrow "RTApps", title "Radiation Oncology Center", and subtitle "A walk-through of a working radiation therapy department". Two entries follow:
  - **Free Mode:** "Walk anywhere at your own pace and talk to the staff".
  - **Tutorial:** "Follow objectives as a patient and a radiation therapist". Until PR 3 lands, it shows as disabled, with "Coming soon" in place of the subline.
- **Footer:** "Esc Settings".
- **Controls:** mouse, or Up/Down and Enter.
- **Style:** uses the existing HUD tokens in `index.html` `:root` (`--panel`, `--teal`, `--ink`, `--dim`, `--stroke`).

**Free Mode** hides the menu, enters walk mode at the plaza start (`player.pos` (4.2, PLAYER_EYE_Y, 20.4), aimed at the doors, as in `walk.ts`) and requests pointer lock. The click on the entry is the user gesture the lock needs.

### Removed

**Markup and CSS:**

- `#topbar` (mode buttons, Help, Ambience)
- `#roomRail` (directory, zone chips, `#journeyBox`)
- `#infoPanel`
- `#studentHelp`
- `#overviewNote`, `#roomLookHint`, `#travelHUD`
- `#patientJourneyHUD`, `#dayTransition`, `#clinicalFocusHUD`
- the kiosk dialog's two journey buttons (`#kioskTreatment`, `#kioskNewPatient`)
- the CT QA dock's "Return focus to CT room" button (`#ctQaGoRoom`)

`#watermark`, `#copyright`, `#toast`, the staff dialog, the equipment panel, the LINAC head lab, the procedure lab and the CT QA dock stay.

**Code that writes to removed elements:**

- **UI-only code goes:** `updateRoomUI`, `renderRoomList`, `updateFacilityInfo`, the `#modeSeg`, `#locText`, `#backBtn` and `#homeBtn` handling, and the journey box wiring.
- **The journey HUD writes in `journey.ts` become null-safe:** the NPC check still runs that code (in node, with stub elements), and nothing in the browser may throw if it is ever reached.
- **Kept:** `showCtQaDock`, `syncCtQaProgress` and `procRenderSite`.

**Unreachable from the UI, code kept:**

- Guided travel (`beginTravel`), because the visibility check's guided poses and the journeys use it.
- Overview mode, now the title-menu backdrop.

### Free mode HUD

- **Crosshair:** as today (`#walkReticle`).
- **Controls bar:** "W A S D move · Mouse look · Shift run · E interact · Esc settings", at the bottom centre. It shows when walking starts in either mode. It fades out over 0.4 s once the player has moved for 1.0 s in total. It does not come back on its own; Settings > Help shows the controls.
- **E prompt** (replaces today's `#interactPrompt` below the crosshair):
  - **Candidates:** the nearest interactable or door, decided as today in `nearestInteractable`/`nearestDoor`, measured from `REACH_Y`. Only one prompt shows at a time.
  - **Line of sight:** a candidate is ignored when a wall collider lies between the player and it (a 2D segment test against the walk colliders). So people in the next room never show a prompt through the wall.
  - **Where it sits:**
    - A person: beside the head, at the top of their bounding box minus 0.12 m, offset to the right by half the head's on-screen width plus a small gap.
    - An object: beside the top centre of its bounding box.
    - A door: beside the door centre at 2.0 m.
    - The prompt is projected every frame, so it follows a person who moves.
  - **Fading in:** for a target whose reach is `range` (2.4 m for staff, 2.5–4.2 m for objects), the prompt starts to appear at `range + 3.0` m (5.4 m for staff). Its opacity rises from 0 to 1 over the first 0.5 m, smoothed over 0.25 s so it never pops.
  - **Growing:** its scale goes from 0.6 at `range + 2.5` m to 1.0 at `range`.
  - **Pressing E:** works only within `range`, as today.
  - **Text:**
    - Staff: "Talk to {name}", with the role on a second line. Name and role come from `STAFF_GUIDES` through the NPC's `guideKey`.
    - Others: the interactable's label.
    - Doors: "Open {room}" or "Close {room}", or "Enter {room}" for the doors that open another simulator.
  - **What E does:** unchanged (`performInteraction`). Staff open their conversation. Equipment, the LINAC head lab and the kiosk open their dialogs. Doors open, close, or leave for another simulator.

### Room pop-up

- **When it shows:** the player enters a room (`roomContainingWalkPoint` changes to a room id, the lobby included) and stays inside for 0.3 s. It shows again on the next entry after the player has been out in a hallway or outside, unless that room is ticked.
  - Today's entry hook (`applyWalkConversationComposition`) only fires in rooms with staff, so it is not used.
  - Vaults count from their entrance maze, like everywhere else.
- **Content:**
  - the kicker (`r.kicker`) and the name;
  - the description (`r.desc`);
  - **Department zone:** front → Patient Services, technical → Technical / Support, clinical → Clinical;
  - **Room type:** today's mapping in `updateRoomUI`;
  - **What happens here:** `r.what`;
  - **the staff line**, when the room has a guide: "{name} · {role}" and "Walk up and press E to talk".
- **Pausing:** the card pauses the game: no player movement, no simulation steps and no clock, though rendering continues. It also releases the pointer lock.
- **Closing:** Continue (the button or Enter) closes the card, resumes and locks the pointer again.
- **"Don't show this again":** stores the room id in `localStorage` `simhub.roomCards.hidden`.
- **Settings > Room introductions:**
  - **Off:** no cards at all (`simhub.roomCards.enabled`).
  - **Back on:** clears the hidden list, so every card shows again.
- **Tutorial:** the same rules apply.

### Settings (Esc)

- **When it opens:** the browser releases the pointer lock on Esc without sending the key to the page. So the menu opens:
  - when the pointer lock is lost while walking and no dialog or card is open;
  - on an Esc keydown while unlocked in walk mode or on the title menu.
- **Esc with a dialog open** (staff conversation, equipment, labs, CT QA menu, room card): Esc closes that dialog instead.
- **Contents:**
  - "Paused" and the mode name.
  - **Sound:** the ambience on/off (`toggleAmbience`). It also mutes the intercom beeps and speech. Off by default as today, remembered in `localStorage` `simhub.sound`.
  - **Room introductions:** as above.
  - **Help:** a controls panel (W A S D, mouse, Shift, E, Esc) and three lines on how to play.
  - **Resume.**
  - **Main menu:** back to the title, stopping the walk. In the tutorial it first asks "Leave the tutorial? Your progress in this chapter will be lost." inside the menu (the viewer has no `confirm()`).
- **On the title menu:** there is no Main menu button.
- **Pausing:** the menu pauses like the room card.

### Other behaviour changes

- **CT QA menu:**
  - It no longer pops up when you walk into CT Sim (the `showCtQaDock(r.id === 'ctsim')` call on room entry goes).
  - An interactable on the CT scanner, "CT QA menu", opens the dock and releases the pointer.
  - The dock still opens the procedure lab, and the QA verdict still reports.
- **Staff handoffs** that set `follow`: the staff member walks to the target room (`startActorHandoff`), and the camera no longer flies there (`beginTravel` is removed from `resetStaffDialogue`).
- **Kiosk:** keeps its welcome text and Close; loses the journey buttons.
- **Pause:** a `paused` flag in the main loop skips `updateWalk` and `stepSimulation` but keeps rendering. The NPC check calls `stepSimulation` directly and is not affected.

### New files

- **`menu.ts`:** title menu, settings, help.
- **`hud.ts`:** controls bar, E prompt, room card.
- **`prefs.ts`:** the storage keys, wrapped in try/catch.
- **`hud-math.ts`:** pure helpers, so they can be unit-tested:
  - the prompt's opacity and scale for a distance and range;
  - whether a room card should show;
  - the 2D line-of-sight test.

### Verification

- **vitest:** `hud-math.spec.ts` covers:
  - prompt opacity and scale at 6, 5.4, 4.9, 3.5, 2.4 and 2.0 m for range 2.4;
  - room-card rules: first entry, ticked room, cards off, cards back on;
  - line of sight through a wall versus through a doorway.
- **e2e:** `apps/web/e2e/simulator.e2e.ts` gains a test that the title menu shows and that Free Mode hides it and shows the controls bar. The existing QA tests click `#releaseClinical` directly (`long-tail.e2e.ts`), so they need no change.
- **Checks:** the NPC check, scene check, visibility check (entering through Free Mode), smoke, `pnpm check` and prettier.
- **Pictures:** before/after shots in the browser for the owner: the first screen, walking outside, near Maya, a room card, and Settings.

---

## PR 2: Simulator merge and gantry archive

### What exists

- The Simulator page (`apps/web/src/routes/(app)/simulator/+page.svelte` and `+page.server.ts`) shows three cards: the center (`sim-hub-qa`), the LINAC/CT console (`sim-linac-fraction`) and the gantry game (`gantry-game`).
- In the hub, E on the LINAC Control Area, CT Control Room and CT Simulator Room doors navigates the top window to the LINAC/CT player (`interact.ts` `ROOM_APP_DOORS`, `S.ROOM_APP_URL`).
- The LINAC/CT app has a "Back to the Center" button (`linac-ct/index.html` `#rtappsBackBtn`, `linac-ct/src/main.ts` ~448) that navigates to `S.HUB_URL`.

### Changes

- **Simulator page:** only the center's card.
  - Its copy says the LINAC and CT simulators are inside the center: "walk to LINAC Control or CT Simulation and press E at the door".
  - The `linacConsole` and `gantry` lookups and cards go.
  - `data-testid="simulator-entry"` stays.
- **Back to the door you left from:**
  - **Leaving:** before the hub navigates to the LINAC/CT app, it writes `sessionStorage` `simhub.returnDoor` = the room id. The arcade pages share the app's origin and tab, so the value survives the navigation.
  - **Coming back:** on boot the hub reads and clears it. If set, the hub skips the title menu and starts free mode just outside that room's door (`doorPoint(room)`), facing the hallway.
  - **Without it:** normal boot.
  - **Order:** this part needs PR 1's boot and title menu, so it lands after PR 1.
- **Gantry game archived:**
  - The seed sets the "Gantry Position Guessing Game" activity to unpublished, updating an existing row the way `seed.py` already updates the MU calculator's status.
  - `apps/web/arcade/gantry-game/` stays in the repo.
  - Past attempts stay.
  - It disappears from the Simulator page and from activity lists for students.
- **Unchanged:**
  - The LINAC/CT activities ("Treatment delivery" `sim-linac-fraction` and "CT simulation" `sim-ct-scan`) stay published and keep recording their own completion, because the center's doors resolve their player URLs.
  - The Learning Commons door to the treatment console (`sim-console`).
- **Docs:** update `docs/03-architecture.md`'s simulator section.

### Verification

- **API:** the seed test (`apps/api/tests/test_seed.py`) covers the archived status (`uv run pytest`).
- **e2e:** the simulator page shows one card, and the round trip lands outside the door. Either cover the round trip in `long-tail.e2e.ts` next to the console-door round trip, or check the `sessionStorage` handoff in a hub test hook.
- **Hub checks:** as PR 1.

### Later: one 3D world (not in this work)

The owner's long-term goal is to rebuild the LINAC and CT simulator rooms inside the center's own world, so there is no page change at the doors. The LINAC/CT app is about 35,000 lines with its own rooms, controls and scoring, so this is a project of weeks. It needs its own design.

---

## PR 3: Tutorial, Chapter 1 (Jordan's treatment day)

### Screen

- **Tracker card** at the top-left:
  - the role avatar, "Your role" and "{role} · {name}";
  - "Objective" and the objective text;
  - a progress bar;
  - "Step n of 11" and the walking distance to the objective.
- **Hints:** when a hint is active, one hint line under the objective.
- **Marker:** an orange diamond with "{place} · {distance}", leading door by door.
  - It sits on the next door or corner of the walking route to the objective, built with `shortestCorridorRouteFromPosition` and `doorPoint`/`insidePoint` in `walk.ts`.
  - It moves to the next one when the player comes within 1.5 m.
  - It never shows through a wall.
  - When the next stop is off-screen, an arrow at the screen edge points the way to turn.
  - The distance in the card and on the marker is the walking distance along the route, not the straight line.
- **Role change:** a fade to black, then a 2.5 s card "You are now {name} · {role}".
- **End card:** "Chapter 1 complete" with Main menu and Keep exploring. Keep exploring switches to free mode where the player stands.
- **The free mode pieces** (controls bar, E prompt, room cards, Esc settings) all work in the tutorial.

### Steps

**As the patient, Jordan Ellis.** The Jordan NPC (`JOURNEY.patient`) is hidden.

1. **Go inside and check in at reception.** Done with E on Maya Brooks, which opens a short check-in exchange.
2. **Take a seat in the waiting area.**
   - The marker picks a free waiting chair (`seatNear`/`seatFree`), and E on it sits the player down: the eye height drops to seated and movement is locked.
   - The intercom line to Treatment Control plays (`journeyIntercom`).
   - After about 6 s, the role changes.

**As the radiation therapist, Morgan Reed** (the LINAC Control therapist, `PRIMARY_NPCS.linaccontrol`). That NPC is hidden. Jordan's NPC appears seated in the chair the player used. The player appears at the LINAC Control console.

3. **Check today's schedule.**
   - E at the console. A decision: pick Jordan's record from three similar ones (same last name, one different date of birth, one booked on Vault 2).
4. **Go to reception and call Jordan.**
   - E on Jordan. A decision: which two things confirm Jordan's identity (full name and date of birth, out of four options). Jordan stands.
5. **Walk Jordan to Vault 1.**
   - Jordan walks the route to Vault 1 (the journey's escort route builders).
   - Jordan waits at each door or corner until the player is within 5 m.
   - If the player gets more than 12 m ahead, the hint line says "Wait for Jordan".
   - Done when Jordan reaches the couch side.
6. **Set Jordan up on the treatment couch.**
   - E at the couch. A decision: choose the setup items from Jordan's simulation record.
   - Then Jordan lies down (the journey's vault setup pose) and the room lasers come on. The vault partner, Jamie Williams, stands at the other side of the couch.
7. **Leave the vault before treatment.** Done when the player is in LINAC Control. The vault door then closes (`setDoorTarget`).
8. **Take the check images.**
   - E at the console. A decision: today's images show a small shift; treat as is, or apply the shift first? The answer is to apply the shift.
9. **Deliver today's treatment.** E at the console. The beam-on state shows on the room's status and a 10 s countdown runs.
10. **Go back in and help Jordan off the couch.** E on Jordan. The vault door opens when the player walks up to it.
11. **Walk Jordan back to reception.** Same escort rules as step 5. Done when Jordan reaches the lobby desk.

The decision wording and the "why" lines come from the existing staff and journey text (`STAFF_GUIDES`, `JOURNEY_META`). The plan lists the exact text for the owner to read before it is built.

### Hints and answer reveal

- **Decisions:**
  - First miss: a hint.
  - Second miss: a stronger hint.
  - Third miss: the answer is shown with a one-line reason, and the step completes.
  - This is the CT simulator's pattern (`validateTechnique`: "Not yet. Recheck …", with the target shown from the third attempt).
- **Walking steps:** a step counts as "no progress" when the walking distance to the objective has not dropped by 1 m.
  - After 60 s of no progress, hint 1 appears in the tracker, for example "The waiting chairs are to the left of the front desk".
  - After 120 s, hint 2 appears, which is more specific.
- **E steps:** when the player is within 6 m of the target but has not pressed E for 20 s, the hint reads "Walk up to {target} and press E when the prompt appears".

### NPCs and the old journeys

- **Shared actors:** the tutorial uses the same actors as the treatment journey: `JOURNEY.patient`, `JOURNEY.vaultTherapist`, `PRIMARY_NPCS.linaccontrol` and the vault 1 couch patient. It also uses their movement builders (`moveJourneyActor`, `movementPathFor`) and seat helpers.
- **Starting and leaving:** on start and on exit it calls `resetTreatmentJourney(true)`, so it leaves the world exactly as the NPC check expects.
- **Hidden actors:** an actor the player is "being" is hidden (`visible = false`), and is skipped by the E prompt and by the movers' blocker list.
- **The vault 1 couch patient** (`lyingPatient('vault1', …)` in `npc.ts`) is hidden while Jordan is in the vault, as the treatment journey does.
- **Renaming:** the vault 1 therapist is renamed from "Morgan Reed, RTT" to **Jamie Williams, RTT** (`STAFF_GUIDES.vault1` in `interact.ts`), because the LINAC Control therapist is also Morgan Reed.

### New files

- **`tutorial.ts`:** step machine, tracker, marker, role change, end card.
- **`tutorial-steps.ts`:** Chapter 1's steps, decisions and hints as data.
- **`tutorial-math.ts`:** pure helpers for:
  - the route distance;
  - the next marker stop;
  - the hint timers;
  - the decision miss counter.

### Verification

- **vitest:**
  - `tutorial-math.spec.ts`: the route distance, the next stop as the player advances, hint timing, and decision misses up to the reveal.
  - `tutorial-steps.spec.ts`: every step has an objective, a target and hints, and every decision has exactly one correct answer and three feedback lines.
- **Tutorial run-through check:** a new `apps/web/scripts/sim-hub-tutorial-check.mjs` in the NPC check's style (node, stubbed DOM, the `?npccheck` hook).
  - It plays Chapter 1 by moving the player to each target and pressing E, answering each decision wrong three times on one run and right on another.
  - It asserts that every step completes and that Jordan's escort routes never cross a wall collider.
  - It is added to CI next to the NPC check. This adds a check and weakens none.
- **e2e:** Tutorial from the title menu shows the tracker with step 1.
- **Pictures:** before/after shots in the browser:
  - the tracker outside;
  - the marker at the consult room door;
  - a decision with a hint;
  - the role-change card;
  - the end card.

---

## Later, not in this work

- **Chapter 2:** Mia, from consult to first treatment. It uses the same tutorial engine, with roles patient, CT therapist, dosimetrist, physicist and treatment therapist.
- **One 3D world** for the LINAC/CT simulator (see PR 2).
- **The floor path** (dropped in favour of the marker).

## Worktrees

The owner wants this done as fast as possible, so each PR is split into tasks that run in parallel, each in its own worktree. The controller merges finished tasks into the PR's branch one at a time, rerunning the checks after each, and reviews each task. Each part is still one PR.

**Step 0 (controller, before any dispatch):** a shared foundation commit on `feat/sim-hub-menu`, so the parallel tasks don't collide:

- `pause.ts`: `setPaused(reason, on)`, `isPaused()`, `onPauseChange(cb)`; the main loop skips `updateWalk` and `stepSimulation` while paused.
- `prefs.ts`: the storage keys and try/catch read and write helpers.
- `play-mode.ts`: the play mode (`'title' | 'free' | 'tutorial'`) with `getPlayMode()`, `enterMode(m)` and `onPlayModeChange(cb)`.
- `dialogs.ts`: a registry of open-able dialogs (`registerDialog(name, isOpen, close)`, `openDialogName()`), with today's dialogs registered. Esc uses it.
- Marked slots in `index.html` (markup and CSS) where each task adds its own block.

| Task | Worktree          | What                                                                                                   | Starts after              |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1a   | `menu-title`      | Title menu, Esc settings, Help, Free Mode start, the boot change                                       | step 0                    |
| 1b   | `menu-prompt`     | E prompt (beside the head, fade and grow, line of sight) and the controls bar                          | step 0                    |
| 1c   | `menu-roomcard`   | Room pop-up, `onRoomEnter`, "Don't show this again"                                                    | step 0                    |
| 1d   | `menu-cleanup`    | Remove the old panels, CT QA menu on E, kiosk buttons, no camera flights, null-safe journey HUD writes | step 0                    |
| 2a   | `merge-page`      | Simulator page with one card, gantry game archived, docs                                               | nothing                   |
| 2b   | `merge-return`    | Back to the door you left from                                                                         | 1a in `feat/sim-hub-menu` |
| 3a   | `tutorial-core`   | `tutorial-steps.ts`, `tutorial-math.ts`, decisions, hints, their tests, the run-through check          | nothing                   |
| 3b   | `tutorial-wiring` | Tracker, marker, role change, end card, NPC choreography in the game                                   | PR 1 merged               |

PR 1's hooks that later tasks use:

- `enterMode('free' | 'tutorial', opts?)` (`play-mode.ts`);
- `setPaused(reason, on)` (`pause.ts`);
- `registerInteractable(..., { enabled?: () => boolean })`, so tutorial-only targets prompt only in the tutorial (1b);
- `onRoomEnter(cb)` (1c).

Each worktree runs its own `pnpm install` and its own checks. The heavy browser checks (NPC, visibility) are staggered so the machine doesn't stall. CI runs e2e once per PR.

## Owner answers to the open items (2026-11-11)

1. **Decision moments in Chapter 1** (steps 3, 4, 6 and 8): kept.
2. **Vault 1 therapist's new name:** Jamie Williams, RTT.
3. **The LINAC/CT activities stay listed on their subject's page** for now.
4. **The Tutorial entry shows "Coming soon"** between PR 1 and PR 3.
