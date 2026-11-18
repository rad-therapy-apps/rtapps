# LINAC and CT consoles inside the center

Status: approved by the owner on 2026-11-18 (Option 2, look mockups, Tutorial storyboard). The two
open storyboard questions were settled with the proposals while the owner was away: the real
Patient Setup at the couch (step 6), and the Tutorial's hints on top of the console's interlocks.

## Goal

The therapist's real work is running the machines. Today the center (sim-hub) sends the player out
to a separate LINAC/CT app for that, and the Tutorial stands in for the console with pop-up
questions. After this change:

- Walking to the LINAC Control or CT Control console desk and pressing E opens the real console in
  a panel over the center. The center keeps running behind it.
- The console drives the center's own machine: the Vault 1 gantry, collimator and couch follow the
  LINAC console, and the CT table and scanner follow the CT console.
- Vault 1 and the CT room take the LINAC and CT apps' machine models and finishes, as in the
  approved mockups. The CT room is dark, like the CT app. The rest of the center keeps its look.
- The Tutorial's console steps use the real console.
- The 'Treatment delivery' (sim-linac-fraction) and 'CT simulation' (sim-ct-scan) activities open
  the center at LINAC Control and CT Control.

## Architecture

Each console stays its own page and runs in an iframe inside a center panel, in a new console mode
(`?view=console`). The LINAC app is welded to its page (about 600 global element ids, about 1,480
page-global CSS rules, its own three.js copy and animation loops), so the iframe keeps its CSS, ids
and three.js apart from the center's. The two halves talk only through postMessage, with the types
in `apps/web/arcade-src/shared/console-protocol.ts`:

- console → center: `ready`, a machine pose stream (`rtapps-linac-state`, `rtapps-ct-state`, on
  change, at most 30 a second), and events (`rtapps-linac-event`, `rtapps-ct-complete`).
- center → console: which workspace to show (`rtapps-linac-open`) and the vault door state
  (`rtapps-linac-room`).
- Both sides accept a message only from the expected window (`source`) and from their own origin.

Inside the center, `console-panel.ts` checks each message and emits it on `console-bus.ts`
channels (`linacPose`, `linacEvents`, `ctPose`, `ctComplete`, `panelOpen`). Vault 1, the CT room
and the Tutorial each listen to the channels they need and never import one another.

URLs (same origin, nested inside the hub's own iframe):

- LINAC: `/arcade/linac-ct/index.html?view=console&side=linac[&scenario=tutorial]`
- CT: `/arcade/linac-ct/ct-suite.html?view=console[&scenario=tutorial]`

Results record by slug through `window.RTApps.recordResult`, which works from any frame. The LINAC
console records 'sim-linac-fraction' as it does today. The center records 'sim-ct-scan' on
`rtapps-ct-complete`. Neither records in the tutorial scenario.

## The parts

### 1. Vault 1 look and drivable machine (sim-hub)

- A repo script, `apps/web/scripts/export-linac-model.mjs`, opens the built LINAC app in headless
  Chromium and exports its machine, couch, floor pads, in-room monitor and radiation sign as one
  GLB. Each part the center drives is a named node: gantry, collimator, couch vertical/lateral/
  longitudinal and rotation, kV arms, EPID arm, beam. It also exports the floor, wall and ceiling
  textures. Outputs are committed under `apps/web/arcade-src/sim-hub/public/models/` (served at
  `/arcade/sim-hub/models/`). The LINAC app gets a small hook (`?export-parts`) that names the
  parts for the script; the app's own patient is left out.
- `vault-linac.ts` loads the model after the center starts and swaps it in for Vault 1's machine
  and couch. Vault 2 and 3 keep theirs. Colliders, seats, stand points and the couch top height a
  lying patient rests on stay as they are; the new couch is fitted so its top sits at today's
  height. If the model cannot load (the Node checks have no fetch), the old machine stays, and the
  center works the same.
- Vault 1 and its maze take the LINAC finish: tiled floor, cream wall panels with the blue stripe,
  ceiling tiles and the app's ceiling light panels. The in-room treatment monitors and the
  radiation sign go up. The monitors show the patient on the couch: Jordan Ellis in the Tutorial.
- `vault-linac.ts` follows `linacPose`: gantry, collimator, couch angle and translations, jaws,
  kV/EPID arms, beam and lasers. A lying patient moves with the couch top. The pose resets when the
  treatment journey resets. The LINAC Control desk monitors (equipment.ts CCTV) show the new
  vault without changes.

### 2. CT room look and drivable scanner (sim-hub)

- `apps/web/scripts/export-ct-model.mjs` exports the CT suite's gantry, overhead bar, table and
  lasers (named nodes, without the suite's translucent patient) to the same models folder. The CT
  suite gets the same `?export-parts` hook.
- `ct-room-look.ts` swaps the model in for the CT scanner and table, scaled so the ring keeps
  today's 2.835 m. The table top height and travel range stay as today's (`CT_COUCH`), so the
  journey's couch moves and the NPC check are unchanged. Model load failure leaves the old scanner.
- The room is dark: grid floor, dark walls and ceiling, the teal light panel and green lasers.
- It follows `ctPose`: table travel and height map onto `CT_COUCH`'s range; scanning spins the ring
  and lights the bore; x-ray on lights the warning light. When no console is open, the journey's
  own couch moves drive the table as today.

### 3. LINAC console mode (linac-ct)

- `?view=console` boots the app for the panel: no orbit vault view and no CCTV rendering (the
  center shows its own camera feeds), the workflow screens laid out to fill the panel, and no
  Back to the Center button. The app's own machine logic keeps running so poses and interlocks
  behave as today.
- It posts `rtapps-linac-ready`, then `rtapps-linac-state` whenever the pose, workspace or open
  chart changes, and `rtapps-linac-event` for each event in the protocol. Every refused action
  (interlock, wrong pick, step out of order) also posts a `mistake`.
- It obeys `rtapps-linac-open` and reads `rtapps-linac-room`: the vault door interlock follows
  `doorClosed`.
- `?scenario=tutorial` replaces the queue with the three Tutorial entries in
  `TUTORIAL_PATIENTS`. Jordan's case copies the first treatment case (3D-CRT prostate AP/PA, 6 MV,
  Vac-Lok and knee support) with Jordan's identity, and today's check images show the
  `TUTORIAL_SHIFT_MM` (4 mm) correction. Every screen shows Jordan, with no demo names left over.
  Opening a look-alike's chart is refused with a `mistake`.

### 4. CT console mode (ct-suite)

- `?view=console` skips the suite's 3D room (`initThree`) and lays the console out for the panel.
- It posts `rtapps-ct-state` from the console's own table, scan and x-ray state, plus the existing
  `rtapps-ct-ready` and `rtapps-ct-complete`.
- Its existing bridge listener gains the `source` and origin checks.

### 5. The console panel (sim-hub)

- `console-panel.ts`: E at the `linac_console` desk opens the LINAC console ("Open the treatment
  console"); E at `ct_console` opens the CT console ("Open the CT console"). The panel is a large
  overlay with a title bar and a close button; Esc closes it too.
- The iframe loads on first open and stays alive while the player is in the center, so closing and
  reopening keeps the console where it was.
- The game is not paused: the clinic keeps moving, and the vault camera feeds stay live. While the
  panel is open, WASD, E and mouse look are off, and the pointer lock is released (the panel
  registers as a dialog, as other pop-ups do).
- The LINAC panel has a strip of Vault 1's three live camera feeds, rendered by the center into the
  panel's camera slots straight from its own cameras, no pixel copies. The CT panel has one feed of
  the CT room.
- It sends `rtapps-linac-room` on open and whenever the vault door or the people inside change.
- The LINAC Control and CT doors no longer leave the hub; they open like other doors, and the
  `room-app-url.ts` door code goes. The Learning Commons door keeps its console emulator.
- API for the Tutorial: `openConsole(kind, { workspace?, scenario? })`, `closeConsole()`,
  `isConsoleOpen()`.

### 6. Tutorial (sim-hub), after 1, 3 and 5

- Step 3: E at the console opens the LINAC console in the tutorial scenario at the queue. The step
  completes on `chart-opened` for Jordan's MRN.
- Step 6: E at the couch opens the console at Patient Setup. The step completes on
  `setup-complete`; Jordan is placed on the couch then, as today.
- Step 8: E at the console opens it at image guidance. The step completes on
  `alignment-verified` after `shift-applied`.
- Step 9: E at the console opens it at delivery. The step completes on `treatment-complete`; the
  vault door stays closed until then (`vaultHeld` agrees with the console's door interlock).
- Each `mistake` during a console step counts as a miss for the step's hint track: hint 1, hint 2,
  then the reveal, shown in the Tutorial's own card on top of the panel. The pop-up decisions for
  steps 3, 6 and 8 go; step 4's identity question stays.
- Fix: at steps 8 and 9 Jamie Williams no longer stands on the console stand point.
- `sim-hub-tutorial-check.mjs` (Node, no iframe) drives the console steps by emitting the
  console events on `console-bus.ts` through the `__TUTORIAL` hook. A new browser check,
  `scripts/sim-hub-console-check.mjs`, opens the built center in headless Chromium, opens the real
  LINAC console from the desk and plays the tutorial scenario through, asserting the events and the
  Vault 1 pose; it runs in CI after the Tutorial check.

### 7. Activities

- The 'Treatment delivery' and 'CT simulation' seed rows change to `arcade_slug: 'sim-hub'` with
  `start_room: 'linaccontrol'` / `'ctcontrol'`. The API exposes `start_room` in the external
  snapshot; the player adds `?start=<room>` to the iframe URL; the center reads it and enters Free
  Mode at that room's door, skipping the title menu.
- `e2e/simulator.e2e.ts`, `apps/api/tests/test_seed.py` and the ExternalPlayer spec are updated to
  the new rows, not weakened.

## Rules that stay

- The NPC check floors never change, and the check is never loosened: REST_FLOOR 40,
  HANDOFF_ROUTES 21, JOURNEY_ROUTES treatment 11 / newpatient 27, TOGETHER_ROUTES 15.
- three.js stays at 0.160.0 for the center; the LINAC app keeps 'three-linac', the CT suite
  'three-ct'. No new dependencies.

## Testing

- Unit specs for every pure mapping: pose → model transforms, the console's message parsing and
  checks, the start-room hint, the Tutorial's console-step hint counting.
- The arcade smoke, NPC, Tutorial and new console checks pass on the built arcade.
- Before/after pictures of Vault 1, the CT room and each console screen in the center, for the
  owner's review before merge.
