# Plan 4a design — Arcade spine + pilot game (M6 / v0.6.0)

<!--
What this file does: the approved design for plan 4a — the phase-4 spine: auth-gated
hosting for legacy browser games, the postMessage result bridge, the subject-page
Games/Simulator shelf, and one pilot game (Cell Defender) wired end-to-end into the
attempt spine.
Used here and why: brainstormed and approved 2026-09-04; the writing-plans skill turns
this into docs/plans/<date>-plan-4a-arcade-spine.md, executed subagent-driven on branch
feat/arcade.
How it fits the project: first sub-plan of phase 4 (SDK + games + simulator world +
remaining legacy experiences), decomposed 4a spine/pilot → 4b games at scale → 4c
simulator world → 4d long tail (EMR/DICOM, MU electron mode, 3c-deferred pages,
issues #47-#50). Milestone M6 (tag v0.6.0).
Works with: docs/specs/2026-09-03-plan-3b-authoring-design.md (activity/publish
framework), the attempt spine (ADR-0004), the legacy RT-Games checkout (read-only
source of game files).
-->

## Decisions log (owner, 2026-09-04)

| Question | Decision |
|---|---|
| Phase-4 decomposition | 4a spine+pilot → 4b games at scale → 4c simulator world → 4d long tail; 4a first |
| Game code home | Copied into the rtapps monorepo; RT-Games becomes a frozen read-only reference like rtt_e_workbook |
| Shelf placement | Subject page: lessons/activities first, then a Games section, then a Simulator section |
| Pilot game | Cell Defender, seeded published under Radiation Biology (the fully-seeded demo subject) |
| Game grading | Score + max recorded as a practice attempt (percent computed as usual); NO pass mark in 4a — a per-game threshold can land later via activity config |
| Integration pattern | Iframe player + postMessage shim ("C") for games; the direct-API SDK surface ("A") is the planned 4c shape for the simulator, not a rejected idea — real applications become API clients, embedded single-file games stay dumb performers |
| Offline queue | Deliberately deferred to the 4c direct-API surface; a failed submit in 4a uses the player page's existing retry UI |

## Phase-4 vision (context, may evolve)

One website, one continuous flow: a student reads workbook content, scrolls to the
games inline beneath it, and below that a Simulator section with an entry button.
Pressing it navigates into the simulator — technically a separate application. The
simulator itself is ONE walkable hub world (the legacy "Radiation Oncology Center
Master") whose rooms (e.g. Linac room → LINAC simulator) are separate programs joined
by seamless handoffs. Everything reports back through the shared attempt spine, so the
educator view keeps working with zero new analytics code.

## Goals

1. A legacy browser game runs on the platform behind auth, launched from its subject's
   page, and its score lands in the attempt spine — visible in the educator's activity
   stats, mastery, and CSV with no analytics changes.
2. The integration recipe (copy file → include shim → one `reportResult` call → seed
   activity) is documented and cheap enough to repeat ~30 times in plan 4b.
3. The subject page carries the phase-4 shelf: Games section live, Simulator section
   present with a disabled "coming soon" entry button (placement lands now, destination
   arrives in 4c).

## 1. Arcade hosting

Integrated game files live in the monorepo under `apps/web/arcade/<slug>/` (source
directory, NOT `static/` — files under `static/` are public and these must not be
reachable logged-out). A SvelteKit server route `GET /arcade/[slug]/[...file]` streams
files from that directory after the standard session check (`locals.user` present,
any role): path-traversal-safe resolution (resolved path must stay inside the slug
directory), correct Content-Type by extension from a fixed allow-map (html, js, css,
png, jpg, gif, webp, svg, mp3, wav, json, woff2), 404 for unknown slug/file, no
directory listings. Same origin as the app — the session cookie just works; no new
container, no CORS.

The pilot copies `RT-Games/cell_defender_game_v2_index.html` (plus any assets it
references) to `apps/web/arcade/cell-defender/index.html` and edits it ONLY to
(a) include the shim script and (b) call `RTApps.reportResult(score, max)` in its
existing game-over path. The legacy checkout remains read-only; the copy in rtapps is
the maintained version from then on.

## 2. The shim (`/arcade/rtapps-shim.js`)

One small static script every integrated game includes:

- Exposes `window.RTApps.reportResult(score, max)` → `window.parent.postMessage(
  {type: "rtapps:result", score, max}, window.location.origin)`.
- Sends at most once per page load (subsequent calls ignored) and no-ops harmlessly
  when the game runs outside an iframe (`parent === window`), so a game file still
  works opened directly during development.
- No auth, no API calls, no queue — the game stays a dumb performer; the platform
  page is its manager.

## 3. Player route (external-kind activities)

A game is an `activity` with the existing `kind="external"` and
`config = {"arcade_slug": "<slug>", "max_score": <int>}` — no schema migration;
draft/publish/versions/authoring work as-is. The student activity route renders
external-kind snapshots as a full-viewport iframe page with a slim header (activity
title + back link):

- On mount: create the attempt via the existing attempt client (practice gate,
  resume/`uq_attempt_one_in_progress`, content_version pinning all unchanged).
- Listens for `message` events: accepts only same-origin events shaped
  `{type: "rtapps:result", score, max}`, only once, only while an attempt is in
  progress. Submits via the existing Idempotency-Key flow, then shows the same result
  panel the other players use (score/percent; no pass badge — practice semantics,
  score + max recorded, `passed` null).
- A submit failure surfaces the player page's existing retry UI. Unknown-slug or
  unpublished activities 404 exactly like other kinds.
- Origin/shape/state checks make stray or malicious messages (other tabs, devtools,
  a compromised game file) unable to submit more than one result per attempt or forge
  events cross-origin.

## 4. Subject-page shelf

The subject page (existing activity listing) gains two sections below the current
content list:

- **Games** — cards for the subject's published external-kind activities (title +
  play link to the player route). Empty state: section hidden.
- **Simulator** — a section with one disabled entry button labeled "coming soon"
  (copy final at implementation). It renders on every subject page; 4c replaces the
  disabled state with the real entry. No configurability — one static section.

## 5. Seed

Cell Defender seeded as a published external activity under Radiation Biology
(get-or-create by title, like the calculators), `config` per §3 with its real
`max_score` read from the game's scoring logic during implementation. Seed stays
idempotent.

## 6. Educator side

Nothing new. External attempts flow into `attempt`/`activity_result` and appear in the
existing activity stats, outcome mastery, and CSV. The e2e proves it end to end.

## Testing

- Web unit: shim (message shape, once-only, outside-iframe no-op); bridge (origin
  check, wrong-shape ignored, double-message submits once, submit-failure → retry UI
  state).
- API: external-kind activity publish/snapshot/attempt lifecycle test (create,
  submit score+max, percent computed, `passed` null); serve-route tests (auth
  required, traversal rejected, correct Content-Type, 404s).
- Seed test: the Cell Defender activity exists published with arcade config; counts
  updated in the idempotency test.
- E2E (the phase exit criterion, automated): student opens Cell Defender from the
  Radiation Biology subject page, the game iframe loads, a scripted
  `RTApps.reportResult` fires, the result panel shows, and the educator sees the
  attempt in the activity stats.

## Out of scope (later sub-plans)

Direct-API SDK + offline queue (4c surface) · the other ~29 games (4b) · simulator
hub/rooms and the real Simulator entry (4c) · EMR/DICOM, MU electron mode,
3c-deferred calc pages, issues #47-#50 (4d) · pass thresholds for games · any
authoring UI for arcade config (seed/API only in 4a).
