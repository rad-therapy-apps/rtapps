# Plan 4c design — The simulator world (M8 / v0.8.0)

<!--
What this file does: the approved design for plan 4c — the walkable simulator hub, the
combined LINAC+CT room app, the minimal same-origin SDK, and the live Simulator entry
replacing 4a's placeholder button.
Used here and why: brainstormed and approved 2026-09-10 against the simulator audit
(.superpowers/sdd/4c-simulator-audit.md — the per-app source of truth for structure,
size anatomy, door points, and result events); the writing-plans skill turns this into
docs/plans/<date>-plan-4c-simulator.md, executed subagent-driven on branch feat/simulator.
How it fits the project: third phase-4 sub-plan (4a spine ✓ → 4b games ✓ → 4c simulator
→ 4d long tail). Milestone M8 (tag v0.8.0).
Works with: docs/specs/2026-09-04-plan-4a-arcade-spine-design.md (arcade serving, the
external activity kind, the player), docs/specs/2026-09-08-plan-4b-games-design.md
(completion-only contract, terminal-event reporting), the audit above.
-->

## Decisions log (owner, 2026-09-10)

| Question | Decision |
|---|---|
| Room roster | Hub + the ONE combined LINAC+CT app (the audit proved the two big files are revisions of the same artifact); RT-Games' linac_emulator / 3_point_setup / 3D_LINAC sets defer to 4d |
| Door contract | Full-page navigation: hub door → room app's player URL; injected return-to-hub affordance in the room app |
| SDK shape | Minimal same-origin SDK: cookie-authenticated fetch to /api/v1, one attempt started+submitted per completed event, multiple per session; NO offline queue, no external packaging (4d/backlog) |
| Revision choice (design call) | Only ONE revision of the combined app ships; the plan pins which by dating the two files' internals (function-count and content deltas suggest "CT Scanner Emulator.html" is newer — verify, don't assume). Shipping one also removes the identical-localStorage-keys collision |
| Result mapping (design call) | Three seeded external activities: Center QA walkthrough (scored, max 4), Treatment delivery (completion-only), CT simulation (completion-only) |
| Slug addressing (design call) | External activities gain config `sdk_slug`; a resolver endpoint maps slug → activity id so apps never embed UUIDs |

## Audit ground truths this design stands on

- Center Master (391 KB) is a real walkable 3D building (pointer-lock movement, built
  rooms and doors) with ZERO navigation code — doors→apps is a new, thin layer.
- The 8.7 MB and 27 MB files are two revisions of one artifact: a LINAC console shell
  that Blob-loads an embedded CT suite into an iframe over an internal
  `rtapps-ct-*` postMessage protocol. 85–95% of their bytes are embedded base64 PNGs.
- Result events exist natively: the hub's 4-check QA sequence (RELEASE/HOLD verdict),
  the LINAC side's per-patient fraction completion (`postChargeAndCompleteFraction`),
  the CT side's 5-step scan workflow (`rtapps-ct-complete`).
- No `fetch`/XHR exists anywhere in the audited apps — the SDK integration starts clean.

## Goals

1. A student walks the simulator: subject page → Simulator button → the hub; the Linac/
   CT doors hand off to the room app and back.
2. Simulator work lands in the attempt spine: QA runs scored, treatment fractions and
   CT scans recorded as completions — visible in the educator's per-attempt rows (#53)
   with zero analytics changes.
3. The 27 MB serving problem is gone: embedded images become cacheable static files;
   the hot HTML payload drops ~15×.
4. The 4a "coming soon" button is replaced everywhere by the real entry.

## 1. Serving prep — asset extraction

The chosen revision of the combined app is copied to `apps/web/arcade/linac-ct/` with
its six giant base64 PNGs extracted to real files (`assets/<name>.png`) in the same
directory, referenced relatively (the 4b trailing-path model already makes relative
refs resolve; png is in the arcade route's allow-map). The extraction is mechanical and
verified byte-for-byte: decoded output must equal the embedded payload, and the diff
audit lists exactly the substitutions. The hub is copied unmodified-except-wiring to
`apps/web/arcade/sim-hub/`. The legacy trees stay READ-ONLY.

Serving stays on the auth-gated arcade route (containment, allow-map, 404 semantics all
inherited). The route gains `Cache-Control: private, max-age=3600` for non-HTML files
only (images/audio/fonts — HTML stays uncached so app updates land immediately);
this is 4c's one serving-route change.

## 2. The SDK (`apps/web/static/arcade/rtapps-sdk.js`)

A small browser script for apps that are real API clients — the "A pattern" deferred
from 4a, deliberately minimal:

- `RTApps.recordResult(activitySlug, opts?)` → resolves the slug
  (`GET /api/v1/activities/by-sdk-slug/{slug}`, result cached per page load), starts or
  resumes an attempt (`POST /activities/{id}/attempts`), and immediately submits —
  with `{score: opts.score}` when the activity is scored, empty-body when it is
  completion-only (the SDK reads which from the resolver response). Returns a promise
  resolving `{percent | null}`; rejections surface to the caller and are also
  retried once internally on network failure (one retry, no queue).
- Multiple calls per page session are the intended shape (a queue app completes many
  fractions/scans); each call is one attempt. The one-in-progress DB constraint is
  satisfied because attempts are open only transiently inside one call, and
  `POST /activities/{id}/attempts` resumes any stray in-progress attempt first.
- Same-origin cookie auth only; no tokens, no configuration, no external consumers.
  Public file like the shim (no secrets). The games' shim (`rtapps-shim.js`) is
  untouched — two integration tiers now exist by design: shim for embedded toys,
  SDK for applications.

### API additions

- `sdk_slug` joins the external activity config convention (`{arcade_slug, sdk_slug,
  max_score | completion_only}`); the snapshot pins it like its siblings.
- `GET /api/v1/activities/by-sdk-slug/{slug}` (session-authed, student-accessible):
  resolves a PUBLISHED external activity by its pinned `sdk_slug`, returning
  `{activity_id, completion_only, max_score}` — 404 for unknown/unpublished/
  non-external. Schema change → client regen. Uniqueness of sdk_slug across published
  external activities is asserted by a seed test (not a DB constraint — config is
  seed/admin-controlled).

## 3. Door wiring

- **Hub → rooms:** in the `sim-hub` copy, the Linac-room and CT-suite door interactions
  (the audit maps the door/`canMove` code) navigate the top window to the room
  activity's player URL (`/subjects/<slug>/activities/<id>` is NOT embeddable —
  navigation targets `window.top.location` from inside the iframe, which is same-origin
  and allowed). The player URL is discovered via the SDK resolver (activity id from
  sdk_slug), keeping no UUIDs in the app. Doors other than these two keep their
  existing in-file behavior.
- **Room → hub:** the `linac-ct` copy gains a small fixed "Back to the center"
  control that navigates the same way to the hub activity's player.
- Both are sanctioned edits with per-file diff audits (the 4b discipline). The room
  app's internal `rtapps-ct-*` postMessages never reach the platform bridge falsely:
  they lack `type: "rtapps:result"` and are ignored by shape (asserted in a player
  spec case).

## 4. Result wiring

| Activity (seeded, external) | sdk_slug | Subject | Semantics | Fired at (audit evidence) |
|---|---|---|---|---|
| Center QA walkthrough | `sim-hub-qa` | quality-management-and-safety | scored, max_score 4 (one point per QA check passed, reported at the RELEASE/HOLD verdict) | the hub's QA sequence verdict |
| Treatment delivery | `sim-linac-fraction` | treatment-delivery-procedures | completion-only, one attempt per completed fraction | `postChargeAndCompleteFraction` (LINAC side) |
| CT simulation | `sim-ct-scan` | treatment-delivery-procedures | completion-only, one attempt per completed scan workflow | the shell's handler for `rtapps-ct-complete` |

The hub activity itself is the QA activity (walking without finishing QA records
nothing). All three published, practice access, seeded get-or-create like the games.

## 5. Platform entry

The subject page's Simulator section drops the disabled button for a real link to the
hub activity's player (the hub activity id fetched the same way the Games section's
links are built — one implementation detail the plan pins; the section still renders on
every subject page). The player renders sim apps exactly like games (full-viewport
iframe); no player changes expected beyond none-at-all — the SDK talks to the API
directly, not through the bridge.

## 6. Explicitly out of scope (4d or backlog)

RT-Games' linac_emulator / 3_point_setup / 3D_LINAC sets (broken assets, content
overlap) · splitting the CT suite out of the LINAC shell · offline queue / packaged
@rtapps/sdk for external consumers · EMR/DICOM · electron MU · any hub content beyond
the two wired doors · fixing legacy in-app bugs beyond the sanctioned wiring edits.

## Testing

- SDK unit tests (fake fetch): resolve→start→submit chains for scored and
  completion-only; per-page-load resolver cache; the single network retry; error
  surfacing.
- API: resolver endpoint tests (published external hit; unknown/draft/non-external
  404s); config/snapshot pinning of sdk_slug; client regen.
- Seed: three activities with exact configs; sdk_slug uniqueness; asset files exist
  where the extracted refs point; idempotency.
- Asset extraction: a script-verified byte-equality check recorded in the task report
  (decoded base64 == written file), plus the diff audit.
- Player spec: `rtapps-ct-*`-shaped messages are ignored by the bridge.
- E2E (exit criterion): subject page → Simulator link → hub loads; drive
  `RTApps.recordResult('sim-hub-qa', {score: 3})` inside the frame → educator sees
  75% in the per-attempt rows; door navigation asserted by URL change to the room
  activity's player; a `sim-ct-scan` completion recorded and visible as "Completed".

## Success criterion

A student enters the simulator from a subject page, walks to a room, completes work in
a technically separate application, and the educator sees every result — the phase-4
vision's core loop, closed.
