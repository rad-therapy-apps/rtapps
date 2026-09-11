# Plan 4d design — the phase-4 long tail (v0.9.0 = M9)

| | |
|---|---|
| Status | Approved by owner (design conversation, 2026-09-11) |
| Author | Chris Guzman (with Claude) |
| Date | 2026-09-11 |
| Related | `2026-09-10-plan-4c-simulator-design.md`, `.superpowers/sdd/4b-games-audit.md`, issues #59 #62 #72 #73 |

## 1. Goal and scope

Close out phase 4's content backlog and the live site's most pressing gap. Four
work streams:

1. The three unshipped LINAC **alignment sets** ship as Games-shelf arcade
   entries (4b pipeline).
2. The **LINAC console emulator** ships as a second simulator-hub door
   (4c pipeline).
3. The leftover **quality items**: #59 (Safety Supervisor ceiling; Gantry
   already fixed in `bb13695`), #72 (SDK spec gap), #73 (verdict-button latch).
4. **Password management** (#62): signed-in change-password plus admin-issued
   temporary-password reset. No email anywhere.

**Out of scope, deliberately:** the EMR (`emr_arcade` and the 38-patient record
set — its own future plan), #58 score-ceiling UX and #60 per-mode completion
(design-heavy, deferred), full email-based password reset (needs an email
provider we do not have), and the #61 CI diet (tracked separately; the
self-hosted runner landed 2026-09-11 outside this plan).

Owner decisions locked during brainstorming (do not re-ask):

| Decision | Choice |
|---|---|
| Alignment sets integration | Games shelf via the 4b shim, completion-only |
| Console emulator integration | Simulator-hub door via the 4c SDK pattern |
| #62 shape | Change-password + admin temp-password reset; no email infra |
| Safety Supervisor (#59 item 2) | Publish `max_score` at the practical (~1700) ceiling, not the unreachable ~1900; game code untouched |
| Dead `style.css.css` (#59 item 3) | Leave as-is (copy fidelity); note and close |

## 2. The alignment sets → Games shelf

Apps (legacy `RT-Games/`, READ-ONLY — copy only):

| Legacy dir | What it is | Proposed slug |
|---|---|---|
| `3_point_setup/` | Free-form 3D three-point setup sandbox: drive the couch to align patient tattoos to the room-laser isocenter | `three-point-setup` |
| `3D_LINAC_beginner_activities/` | Guided beginner track in the same 3D room: Anatomy Scavenger Hunt, Machine Coordinates, Basic Patient Alignment | `linac-training-beginner` |
| `3D_LINAC_intermediate_activities/` | Harder track: adds Couch Position Matching and Gantry & Collimator Setup | `linac-training-intermediate` |

Pipeline is exactly 4b's, with the 4b bar: an **audit task first** producing
per-app terminal-event analyses with real code anchors, then per-app copy to
`apps/web/arcade/<slug>/` + two-line shim include + ONE `RTApps.reportCompletion`
call at the app's true end state, then seeding as published completion-only
practice activities under `treatment-delivery-procedures`.

Completion anchors (audit confirms or corrects, with anchors recorded):

- Guided tracks: the completion handler of the FINAL activity in the track —
  not per-activity (per-activity completion is #60's deferred design).
- Sandbox (`3_point_setup`): first successful alignment (the app's own success
  feedback moment). If the audit finds no discrete success state, the audit
  proposes the least-invasive observable anchor rather than inventing scoring.

Repeat-fire and reset semantics get the 4b treatment: the once-per-load latch
audit per app before the wiring commit.

## 3. The console emulator → hub door

`RT-Games/linac_emulator/` (index.html + script.js + style.css; a three-monitor
LINAC treatment-console emulator: MLC visualizer and presets, gantry/couch
parameters, interlocks, Beam On sequence).

- Copy to `apps/web/arcade/linac-console/` (three files). The two `<audio>`
  refs point to a `sounds/` directory that has never existed in the checkout —
  strip the tags in-copy (sanctioned edit, recorded in the audit).
- Hub surgery follows 4c's proven door pattern exactly: prefetch the room URL
  at startup into a `CONSOLE_APP_URL` variable (`.catch(()=>{})`), gate the
  door branch synchronously on it, fall through to the legacy in-file behavior
  when null. The audit picks the sanctioned room from the hub's existing rooms
  list (audit file: rooms at lines 421–441) — expected: the control-room
  adjacent to the linac vault, exact `dr.room.name` recorded as an anchor.
- SDK wiring inside the console app: `RTApps.recordResult('sim-console')` at
  the console's true terminal event — expected: completion of a full Beam On
  delivery sequence; the audit confirms the exact handler. Back-link to the hub
  mirrors the 4c room app's `HUB_URL` prefetch pattern.
- Seed: "Treatment console" — subject `treatment-delivery-procedures`,
  `arcade_slug` `linac-console`, `sdk_slug` `sim-console`, completion-only,
  published. The seed's sdk_slug-uniqueness test must keep passing.

## 4. Quality items

- **#59** — item 1 (Gantry crash) already fixed on main (`bb13695`). Item 2
  (Safety Supervisor): two Level-4 `isFatal` hazards make the theoretical
  ~1900 unreachable in practice; republish the activity's `max_score` at the
  practical ceiling (audit task derives the exact reachable maximum by the 4b
  derivation method — the ~1700 figure is the final review's estimate, not the
  spec's number). Game code untouched. Item 3: dead `style.css.css` stays
  (fidelity). Close #59 with a comment mapping each item.
- **#73** — hub QA verdict buttons: disable both RELEASE and HOLD when either
  is clicked; re-enable wherever the legacy code resets the QA scenario. A
  small sanctioned hub edit with the anchors recorded (the QA handlers are the
  audited `releaseClinical`/`holdClinical` pair).
- **#72** — add the missing SDK spec case: submit fails, retry also fails →
  `recordResult` rejects and `attemptCalls` stays 1 (no re-entry into the
  resolve/start chain). Pure vitest addition to the existing SDK spec.

## 5. Password management (#62)

API (`apps/api/app/auth/`):

- `POST /api/v1/auth/change-password` — authed. Body
  `{current_password, new_password}`. Verifies the current password (argon2),
  applies the same new-password validation as registration, re-hashes, and
  revokes every OTHER session of the user (current session stays). 403 on a
  wrong current password (no lockout counter in this plan). Google-only
  accounts (no password hash) get a 409 with a problem-json explaining there
  is no password to change.
- `POST /api/v1/admin/users/{id}/reset-password` — admin-only. Generates a
  random temporary password (server-side, returned ONCE in the response, never
  stored in plaintext, never logged), sets it as the user's hash, sets a new
  `user.must_change_password` boolean (migration), revokes ALL the user's
  sessions, and writes an `audit_log` row. Deactivated users: 409.
- Login flow honors the flag: a user with `must_change_password = true`
  authenticates normally but every API call other than auth/session endpoints
  and `change-password` is refused (403 problem-json) until the password is
  changed; `change-password` clears the flag. `GET /auth/me` exposes the flag
  so the web layer can route.

Web (`apps/web`):

- Change-password form on the signed-in account surface (wherever the current
  account/profile affordance lives; if none exists, a minimal
  `/account/password` page linked from the existing nav).
- The `must_change_password` flag (from `/auth/me`, already resolved in
  `hooks.server.ts`) redirects any signed-in navigation to the change form
  until cleared.
- Admin users page: a "Reset password" action per user showing the temporary
  password exactly once with a copy affordance and a "they must change it at
  next sign-in" note.

## 6. Testing

- Legacy copies: per-file diff audits with real anchors (the 4b/4c bar);
  byte-identical except sanctioned edits.
- API: tests for both endpoints — wrong current password, Google-only 409,
  other-sessions revoked / current kept, temp password single-use flow, flag
  gates non-auth endpoints, flag cleared on change, audit row written,
  admin-only enforcement, deactivated 409.
- Web: SDK spec addition (#72); component-level coverage only where an
  existing spec file naturally extends.
- e2e additions to `simulator.e2e.ts` / a new spec as fits: one alignment-set
  completion reaching the educator view; the console door round-trip
  (hub → console → completion recorded → back-link); a password change
  round-trip (change → old session-other revoked → re-login with new).
- Full gates per the standing rules; CI runs on the self-hosted runner.

## 7. Versioning and finish

Version 0.9.0 = milestone M9. The standard finishing pipeline: branch
`feat/long-tail` → 10-ish tasks with per-task review → final whole-branch
review → PR → CI → squash-merge → tag `v0.9.0` → close #59 #62 #72 #73 →
re-run the VM seed (the deploy does not seed) so the new activities appear on
test.rttlearn.com.
