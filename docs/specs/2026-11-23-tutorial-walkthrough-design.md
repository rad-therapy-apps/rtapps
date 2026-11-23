# Tutorial walkthrough: spotlight guidance and step cards

Status: design approved by the owner on 2026-11-22/23 (guidance style, step card, the parts that get
a walkthrough, skipping, and the mockups on the brainstorm companion,
`.superpowers/brainstorm/29979-1795408741/content/coach-mockups.html`). The wording below is the
owner's to review for clinical accuracy.

## Goal

Today the sim-hub Tutorial (Chapter 1, 11 steps) gives an objective, a marker, hints after a delay
or a miss, and the real LINAC console at steps 3, 6, 8 and 9. It never shows the player where to
click, never explains what a screen is for, and marks a finished step with one "Correct." line.
After this change the Tutorial teaches:

- **Spotlight walkthroughs** at the start (getting started) and at the four console steps (3
  schedule, 6 couch setup, 8 check images, 9 treatment). The screen dims, a cut-out shows the one
  thing to do next, and a bubble says what to do and how it works. Only that thing can be used
  until it is done.
- **A step card** after every step: what you did, why it matters in a real clinic, what's next,
  and Continue.
- **A ring on the floor** under the person or thing the player needs next, beside today's marker.
- **Skip walkthrough** in every bubble, for players who have done the Tutorial before.

Free Mode and the graded activities don't change.

## Owner decisions (2026-11-22/23)

| Question                           | Decision                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| How hands-on?                      | Spotlight, one thing at a time: everything else dimmed and locked                                |
| Step-complete pop-up               | A card with Continue after every step, replacing the "Correct." line                             |
| Which parts get a walkthrough      | Getting started, step 3, step 6, steps 8 and 9                                                   |
| Replays                            | A Skip walkthrough button in each bubble; skips that part only; nothing remembered between plays |
| Walking steps (2, 4, 5, 7, 10, 11) | No spotlight: the floor ring, the marker and the step card                                       |

## What the player sees

### The spotlight

- A dim layer covers the page except for one or two cut-outs (rounded, 4 px larger than the
  target), each outlined in teal and pulsing (steady with `prefers-reduced-motion`).
- For a drag, the item and the place it goes are both cut out, with a dashed arrow between them.
- A bubble sits beside the cut-out with a pointer toward it. It holds:
  - a header: the part's name and one dot per sub-step, done ones filled and the current one
    amber;
  - the instruction, in bold;
  - one or two lines on how it works;
  - a footer: **Skip walkthrough** on the left, and on the right either **Next** (a sub-step that
    only explains) or a short "waiting" cue (a sub-step the player does).
- Clicks, drags and keys outside the cut-outs do nothing. The center's panel Close and Esc still
  work. Closing the console mid-walkthrough keeps the place: reopening resumes at the first
  sub-step not done.
- A sub-step the player does moves on by itself when the console's (or the center's) state shows it
  done. A sub-step already done when it comes up (Motion Enable already armed) is passed over.
- Getting started's movement sub-steps dim lightly (34%), so the player can see where to walk. Every
  other sub-step dims at 66%.
- Everything fits with nothing scrolling and nothing cut off at the website's sizes (992×624 to
  1104×936 for the center; the console frame is 823×512 at the smallest), so the bubble is at most
  360 px wide, uses no text smaller than 12 px, and never covers its own cut-outs.

### Skip walkthrough

- It ends the spotlight for that part only. The player finishes the part with today's hints (hint
  1, hint 2, the reveal), and the step card still appears.
- Skipping is remembered for the rest of the play (the console page reloads fresh for each Tutorial
  play), so a new play is guided again.

### The floor ring

- A flat teal ring on the floor at the current target: the stand point of a pressE target (Maya
  Brooks, the waiting-area chair, the console desk, the couch side, Jordan), the door of an
  enterRoom target, and the destination door of an escort.
- It pulses (steady with reduced motion), shows only while the step is active, and hides in the
  dialog, console, card and fade phases.

### The step card

- It appears after every step completes and waits for Continue (a button; Enter and Space work).
- Its parts: "✓ Step n of 11 complete", a title, then three rows: **You did**, **Why**, **Next**.
- It replaces the "Correct. <reason>" line. The reason moves into the card's Why:
  - a decision (step 4) keeps its option marking, hints and reveal, but its feedback no longer
    shows the reason line; its Continue leads to the card;
  - a console step's reason goes to its card.
- After step 2 the card comes before the role-change card; after step 11 it comes before the end
  card. Escort steps show it on arrival, after the fade.
- It fits with nothing scrolling at 992×624.

## Architecture

The approach is that each page runs its own walkthroughs on one shared spotlight module. The
console is the only page that can tell when the player has dragged the mask, pressed Vert + or
reached the field, so it runs steps 3, 6, 8 and 9 itself. The center runs getting started, the
floor ring and the step cards.

### Shared: the spotlight (`apps/web/arcade-src/shared/coach.ts`, `coach-geometry.ts`)

- `coach-geometry.ts` holds the pure parts, unit tested in Node:
  - the dim layer's evenodd clip path with holes;
  - the bubble's placement (below, above, right, then left of the target; kept inside the page;
    never over a hole);
  - the pointer position.
- `coach.ts` is DOM only, with no three.js:
  - `showCoach(view)` / `hideCoach()`, where `view` is the cut-out elements, an optional drag
    pair, the dim level, the bubble's text, dots, footer kind, and `onNext` / `onSkip`;
  - it re-measures its targets every animation frame while shown, so layout changes and resizes
    follow;
  - the dim layer has `pointer-events` on and is clipped with the holes, so a click lands only in
    a hole;
  - a capture-phase key filter lets through only keys aimed at a focused target, plus Esc;
  - the bubble is an `aria-live="polite"` region, and Next takes focus on explain sub-steps.
- Its styles are injected under one root class with an explicit reset. The LINAC page has
  page-global rules, such as every `button` being full-width and green, that must not reach the
  bubble.

### Console: the four walkthroughs (`apps/web/arcade-src/linac-ct/src/`)

- `tutorial-walkthrough.ts` holds the data and rules, and is unit tested:
  - one walkthrough per Tutorial workspace (queue → step 3, setup → step 6, igrt → step 8,
    delivery → step 9);
  - each is a list of sub-steps, each with an `id`, a `kind` (`explain` or `do`), its `targets`,
    an optional `drag` pair, a `dim` level and its `text` (`do` and `why`); a `do` sub-step names
    the console state that marks it done;
  - the current sub-step is the first one not done (an explain is done once Next is pressed, which
    is remembered for the page's life);
  - text can carry `{tokens}` filled from the console's state, such as the geometry hold's field
    and angle (delivery-guide.ts) or the residual's key and size.
- `walkthrough-mode.ts` is the runner, started by console-mode.ts only in the tutorial scenario:
  - it watches the console's state on the console's existing tick, so no extra loop;
  - it calls `showCoach`;
  - if a target is hidden by the narrow layout's tabs, it first spotlights the tab that shows it.

### Contract (additive)

- `LinacStateMsg` gets an optional `walkthrough?: { part: 'queue' | 'setup' | 'igrt' | 'delivery';
index: number; of: number } | null`. A message without it is still valid. The center checks its
  shape like the other fields (console-panel-messages.ts) and emits it on a new console-bus channel,
  `linacWalkthrough`.
- The center's Tutorial uses it to hold back the console step's hold hint (#215) and miss hints
  while a walkthrough runs. The docked strip then shows the objective only.
- The browser checks read it too.

### Center (`apps/web/arcade-src/sim-hub/src/`)

- `tutorial-steps.ts`:
  - each step gets `card: { title, did, why, next }`;
  - a new `GETTING_STARTED` list holds the six sub-steps;
  - the console steps' and decision's `reason` fields are dropped, because the card's `why` carries
    them.
- `tutorial-machine.ts` gets a new phase, `card`, between a step's completion and the next step's
  start (or the role change, or the end). A `cardContinue` event leaves it. It is unit tested.
- `tutorial-guide.ts` (new) runs getting started on `coach.ts`, at the start of step 1:
  - its `do` sub-steps are checked from the player each frame: distance walked, yaw turned,
    distance to Maya's stand point, and step 1's E trigger;
  - its explain sub-steps hold the movement keys and release the pointer lock, as a dialog does;
  - its `do` sub-steps leave them free.
- `tutorial-ring.ts` (new) is the floor ring: one ring mesh moved to the current anchor
  (tutorial.ts already computes the anchors), with an opacity pulse.
- `tutorial-hud.ts` gets the step card, using the center's no-scroll card styles.

### Hooks for the checks

- `window.__TUTORIAL` (with `?npccheck`) gets `cardContinue()`, `coachNext()`, `coachSkip()` and
  `coach()`, the last returning the current sub-step's id, index and kind.
- The console page exposes the same coach calls on its window for the console check.

## The wording

Each row is one bubble: the instruction, then the how-it-works line. A ↻ marks a sub-step the player
does; the rest only explain, with Next.

### Getting started (center, 6)

| #   | Spotlight               | Instruction                                   | How it works                                                                                                                                                                                        | Done when                   |
| --- | ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Objective tracker       | This is your objective.                       | It always says what to do next. The bar fills as you finish steps, and the number on the right is how far away your next stop is. Right now you are Jordan Ellis, a patient arriving for treatment. | Next                        |
| 2   | The marker              | The diamond marks where you're going.         | Its label gives the place and the distance. When it's off screen, an arrow at the edge of the screen points the way.                                                                                | Next                        |
| 3 ↻ | Controls bar, light dim | Press W to walk toward the ring at the doors. | A and D step sideways and S steps back. Hold Shift to run.                                                                                                                                          | walked 3 m                  |
| 4 ↻ | none, light dim         | Move the mouse to look around.                | If the view doesn't turn, click the game once so it can use your mouse. Press Esc to get the mouse back.                                                                                            | turned 60°                  |
| 5 ↻ | none, no dim            | Follow the marker inside to reception.        | Reception is just inside the glass doors, on the left.                                                                                                                                              | within reach of Maya Brooks |
| 6 ↻ | The E prompt            | Press E to check in with Maya Brooks.         | A prompt like this appears whenever there's something you can do. Press E while it shows.                                                                                                           | step 1's E                  |

### Step 3, today's schedule (console queue, 4)

| #   | Spotlight            | Instruction                                  | How it works                                                                                           | Done when         |
| --- | -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | The queue            | This is today's treatment queue for LINAC 1. | Every patient booked on this machine today, in order.                                                  | Next              |
| 2   | Rows #01 and #02     | Two patients are called Jordan Ellis.        | Jordan told reception they were born March 14, 1968, and is booked in Vault 1 at 9:00. That's row #02. | Next              |
| 3 ↻ | Row #02's Check In   | Press Check In on Jordan's row.              | It tells the team Jordan is here and ready to be called.                                               | Jordan checked in |
| 4 ↻ | Row #02's Open Chart | Press Open Chart.                            | The chart holds Jordan's plan, setup instructions and treatment record.                                | chart opened      |

### Step 6, the couch setup (console setup, 7)

| #   | Spotlight                         | Instruction                                                                        | How it works                                                                                                               | Done when             |
| --- | --------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | In-room setup order               | This is Jordan's setup order.                                                      | It was written at CT simulation, when the plan was made. Today's setup has to match it.                                    | Next                  |
| 2   | Immobilization key and Position   | Jordan needs a short head mask and a headrest, lying head first and on their back. | Head first and on the back is called head-first supine (HFS).                                                              | Next                  |
| 3 ↻ | Headrest → treatment table        | Drag the Headrest onto the treatment table.                                        | The headrest goes on first. It holds Jordan's head at the same angle as at CT simulation, and the mask clips down over it. | headrest on the table |
| 4 ↻ | Short Head Mask → treatment table | Drag the Short Head Mask onto the treatment table.                                 | The mask was moulded to Jordan's face at CT simulation. It keeps the head still to within a few millimetres.               | mask on the table     |
| 5 ↻ | Position check                    | Tick Position.                                                                     | Jordan lies as the setup record says: head first, on the back, head straight and centred.                                  | Position ticked       |
| 6 ↻ | Indexing check                    | Tick Indexing.                                                                     | The headrest and mask lock into numbered positions on the couch, so they sit in the same place every day.                  | Indexing ticked       |
| 7 ↻ | Verify Setup Equipment            | Press Verify Setup Equipment.                                                      | The console checks your setup against Jordan's order.                                                                      | setup complete        |

### Step 8, the check images (console igrt, 9)

| #   | Spotlight                       | Instruction                                                    | How it works                                                                                                                               | Done when          |
| --- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 1   | Registration & Couch Correction | Before any beam, you image Jordan to check the position.       | This is image-guided radiation therapy (IGRT). The images are compared with the plan, and any difference is corrected by moving the couch. | Next               |
| 2 ↻ | New Daily Setup                 | Press New Daily Setup.                                         | It starts today's imaging session for Jordan.                                                                                              | session started    |
| 3 ↻ | MV / EPID                       | Press MV / EPID to extend the imaging panel.                   | The panel sits opposite the treatment head and makes images with the treatment beam itself.                                                | panel extended     |
| 4 ↻ | Acquire Images                  | Press Acquire Images.                                          | The console takes a pair of images and lines them up with the plan's reference images.                                                     | images acquired    |
| 5   | The correction table            | The images show Jordan {shift} mm off in the {axis} direction. | Recommended is the shift the images call for, Applied is how far you've moved, and Residual is what's left. Residual must reach 0.         | Next               |
| 6 ↻ | Motion Enable                   | Press Motion Enable.                                           | The couch and gantry move only while motion is enabled, so nothing moves by accident.                                                      | motion enabled     |
| 7 ↻ | {key} (Vert + for Jordan)       | Press {key} until the {axis} residual reads 0 mm.              | Each press moves the couch 1 mm.                                                                                                           | shift applied      |
| 8 ↻ | MV / EPID                       | Press MV / EPID again to fold the panel away.                  | The beam stays locked while imaging hardware is out.                                                                                       | panel retracted    |
| 9 ↻ | Verify Alignment                | Press Verify Alignment.                                        | It records that Jordan's position was checked and corrected before treatment.                                                              | alignment verified |

### Step 9, the treatment (console delivery, 10)

| #   | Spotlight                 | Instruction                                                          | How it works                                                                                                               | Done when                                  |
| --- | ------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | The delivery screen       | This is the delivery screen.                                         | The fields to deliver are on the left. The interlock checklist on the right must be all green before the beam can come on. | Next                                       |
| 2   | The field list            | Jordan's plan has two fields, 152 MU each.                           | Right Lateral treats from gantry 270°, Left Lateral from 90°. Right Lateral is selected first.                             | Next                                       |
| 3   | The interlocks            | One interlock is holding: the treatment geometry.                    | The gantry is at {now} and {field} needs {planned}. Move to field turns it there.                                          | Next                                       |
| 4 ↻ | Motion Enable             | Press Motion Enable.                                                 | The machine moves only while motion is enabled.                                                                            | motion enabled (passed over if already on) |
| 5 ↻ | Move to field             | Press and hold Move to field until it says At field.                 | The machine moves only while you hold the key, like the hold-to-run switch on a real console. Letting go stops it at once. | at field                                   |
| 6 ↻ | Enable Beam               | Press Enable Beam.                                                   | Every interlock is green, so the beam can be armed for this field.                                                         | beam enabled                               |
| 7 ↻ | Beam On                   | Press Beam On.                                                       | Watch the MU count climb to 152. The beam stops by itself when the field is done.                                          | first field delivered                      |
| 8 ↻ | Move to field             | Left Lateral is selected. Hold Move to field until it says At field. | The gantry turns from 270° to 90° for the second field.                                                                    | at field                                   |
| 9 ↻ | Enable Beam, then Beam On | Press Enable Beam, then Beam On.                                     | The second field delivers its 152 MU.                                                                                      | treatment complete                         |
| 10  | The field list            | Treatment delivered.                                                 | Both fields are done: 304 MU in all, today's fraction 4 of 10. The console records it in Jordan's chart.                   | Next                                       |

Sub-step 9's cut-out moves from Enable Beam to Beam On once the beam is enabled.

### The step cards (11)

| Step | Title                                   | You did                                                                                                   | Why                                                                                                                                                          | Next                                                            |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1    | You're checked in                       | Gave Maya Brooks your full name and date of birth.                                                        | Reception confirms who you are and marks you arrived, so the treatment team knows you're here.                                                               | Take a seat in the waiting area.                                |
| 2    | Reception has told the team you're here | Waited while reception called Treatment Control.                                                          | Treatment runs to a schedule. The therapists call each patient when the machine and the plan are ready.                                                      | You now play Morgan Reed, a radiation therapist.                |
| 3    | Jordan is checked in on the console     | Found Jordan on today's queue by name and date of birth, checked Jordan in and opened the chart.          | Two patients can share a name. A full name and date of birth together identify the patient, and the booking must be on the machine where the plan is loaded. | Go to reception and call Jordan.                                |
| 4    | You have the right patient              | Asked Jordan for their full name and date of birth and matched them to the schedule.                      | Two identifiers the patient states, matched to the record, confirm the right patient. A seat, a time or a yes to a leading question can be wrong.            | Walk Jordan to Vault 1.                                         |
| 5    | Jordan is in Vault 1                    | Walked Jordan through the maze into the vault.                                                            | The maze's turns keep scattered radiation from reaching the door.                                                                                            | Set Jordan up on the treatment couch.                           |
| 6    | Jordan is set up for treatment          | Matched the headrest, the short head mask, the position and the indexing to Jordan's setup order.         | The same setup every day puts Jordan's head exactly where the plan expects, so the beams hit the target and spare the rest.                                  | Leave the vault. Nobody stays in the room while the beam is on. |
| 7    | The vault is clear                      | Left the vault with Jamie Williams, and the door closed behind you.                                       | Only the patient stays in the room during treatment. The door interlock stops the beam if the door opens.                                                    | Take the check images at the treatment console.                 |
| 8    | Jordan's position is verified           | Took MV images, found Jordan 4 mm off the plan, moved the couch to correct it and verified the alignment. | Image guidance checks that Jordan is in the planned position before any radiation. A measured shift is corrected, then verified.                             | Deliver today's treatment.                                      |
| 9    | Today's treatment is delivered          | Delivered the right lateral field, then the left lateral field, 152 MU each.                              | The beam came on only once the room, the setup and the images were verified and every interlock was green.                                                   | Go back in and help Jordan off the couch.                       |
| 10   | Jordan is off the couch                 | Went back in and helped Jordan off the couch.                                                             | The couch comes down and the mask comes off before Jordan sits up, so Jordan can get off safely.                                                             | Walk Jordan back to reception.                                  |
| 11   | Jordan is back at reception             | Walked Jordan back to the front desk.                                                                     | Jordan comes back for each treatment: today was fraction 4 of 10.                                                                                            | Chapter 1 complete.                                             |

## Testing

- Unit (Node, vitest):
  - coach-geometry: the hole paths, the bubble placement at 823×512 and 1280×800, and that the
    bubble never covers a hole;
  - tutorial-walkthrough: each part's current sub-step from console state, passing over a done
    sub-step, explains remembered, the tokens filled;
  - tutorial-machine: the card phase after each step, its order with the role change and the end,
    and that a decision's Continue leads to the card;
  - console-panel-messages: the `walkthrough` field accepted, rejected when malformed, and missing.
- `sim-hub-tutorial-check.mjs`:
  - run 1 skips getting started; run 2 plays it by its predicates;
  - both runs continue every card and assert 11 cards, each once.
- `sim-hub-console-check.mjs`:
  - step 3 skips the walkthrough and keeps today's look-alike mistake path (hint 1);
  - steps 6, 8 and 9 follow the walkthroughs sub-step by sub-step, asserting each spotlight's
    target;
  - one click on a dimmed control is asserted to do nothing;
  - the second play's step 3 follows the walkthrough;
  - the no-scroll and cut-off guard scans every bubble and card at 1280×800 and 992×624 (CI runs
    both).
- `sim-hub-free-console-check.mjs`: unchanged, and must show no bubble.
- The NPC check stays as it is (the ring is a Tutorial-only mesh, parked outside the Tutorial).

## Build plan

Two PRs, built in parallel worktrees once the shared module is in.

1. **Shared spotlight** (`coach.ts`, `coach-geometry.ts`, with specs). It is small, and goes first
   on the integration branch.
2. In parallel, after 1:
   - **Center:** the card phase and cards, getting started, the floor ring, the hooks and the
     tutorial-check changes;
   - **Console:** the four walkthroughs, the runner, the contract field, and the console-check
     changes.
3. **PR A** is 1 plus the center work. **PR B** is the console work. PR B can merge after PR A, or
   together with it if both are ready.

Before/after pictures of each walkthrough and card at 1280×800 and 992×624 go to the owner for each
PR.
