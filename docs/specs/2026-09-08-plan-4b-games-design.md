# Plan 4b design — Games at scale (M7 / v0.7.0)

<!--
What this file does: the approved design for plan 4b — integrating the RT-Games library
onto the plan-4a arcade spine at scale (22 games), completion-only attempt support, and
follow-up issues #52-#56.
Used here and why: brainstormed and approved 2026-09-08 against the games audit
(.superpowers/sdd/4b-games-audit.md — the per-title source of truth for score mechanics,
assets, and subjects); the writing-plans skill turns this into
docs/plans/<date>-plan-4b-games.md, executed subagent-driven on branch feat/games.
How it fits the project: second sub-plan of phase 4 (4a spine ✓ → 4b games → 4c simulator
world → 4d long tail). Milestone M7 (tag v0.7.0).
Works with: docs/specs/2026-09-04-plan-4a-arcade-spine-design.md (the recipe this scales:
copy → shim → reportResult → seed), the audit above, issues #52 #53 #54 #55 #56.
-->

## Decisions log (owner, 2026-09-08)

| Question | Decision |
|---|---|
| Scope | Trivial + relative-asset games (~22) with #52 as pre-flight; presenter tools, scoring redesigns (Millionaire, Jeopardy), and multi-variant curation deferred with reasons |
| Unscored playable games | Completion-only support: config flag + scoreless submit (flashcards-style null score fields) + `RTApps.reportCompletion()` |
| Follow-ups in scope | ALL of #52 #53 #56 #54 #55 |
| Task structure (design call) | Batched by likeness: ~5 games per batch task, per-game evidence table verified game-by-game against the audit in review (the 3a migration pattern) — not per-game tasks, not injection tooling |
| UNO variants (design call) | Three genuinely-different UNO implementations exist; ONE ships (OncoLife UNO: The Clinical Shift — most distinctive, patient-care); `Uno.html` and `uno_rt_challenge` deferred to content-owner curation |
| LINAC Console Emulator (design call) | Deferred to 4c despite being technically integrable — it IS a simulator (the audit flags the overlap), and its audio assets are already broken in the checkout |

## Goals

1. Every audited TRIVIAL and in-scope RELATIVE-ASSETS game runs on the platform behind
   auth, seeded published under its subject, reporting a score (or completion) into the
   attempt spine.
2. The educator stats page shows per-attempt percent/score for external activities (#53).
3. Issues #52, #54, #55, #56 closed.
4. Everything NOT shipped is recorded here with its reason — nothing silently dropped.

## 1. Pre-flight (#52 + copy conventions)

- The arcade route preserves the trailing slash (`trailingSlash = 'always'` or the
  route-level equivalent — the plan pins the working SvelteKit mechanism), so games with
  relative `script.js`/`style.css` refs resolve them against their own directory. The 4a
  e2e still passes (absolute-pathed games are unaffected).
- Copy conventions (each deviation documented per game in the batch's evidence table;
  the diff-vs-legacy proof from 4a becomes "diff shows only sanctioned edits"):
  extensionless entry files renamed to `index.html` (vital-signs-challenge); dead
  links/assets stripped (ct-borders' `../index.html` back-link, uno-variant placeholder
  images if hit); NO content or gameplay edits.

## 2. Completion-only support (API + shim + player)

- Activity config gains `"completion_only": true` (external kind only, alongside
  `arcade_slug`; `max_score` omitted for such games).
- `POST /attempts/{id}/submit` for a completion-only external activity accepts an EMPTY
  body and records a flashcards-style completion: `score`/`max_score`/`percent`/`passed`
  all null. A score body on a completion-only activity → 422; a missing body on a
  scored external activity → 422 (unchanged). No client regen expected (the body was
  already optional in 4a) — if the schema shape does change, the plan says so explicitly.
- Shim: `RTApps.reportCompletion()` posts `{type: "rtapps:result", completion: true}`
  (same once-latch and origin rules). `reportResult(score, max?)` unchanged.
- Bridge/player: a completion message on a completion-only activity submits empty and
  renders "Completed" (no percent); score messages on completion-only activities (and
  vice versa) are ignored by the same shape checks.

## 3. The game roster (22)

Authoritative per-game detail (score variable, max evidence, assets, subject) lives in
`.superpowers/sdd/4b-games-audit.md`; the plan copies each batch's table from it.

**Batch 1 — clean fixed maxes (6, TRIVIAL):** Anatomy Atlas Adventure (500), Dose Calc
Dash (400), Adaptive Consultation Assessment (score.user/score.max — wire
`reportResult(score.user, score.max)`), Adaptive Ethical Decision-Making Simulator
(same shape), Legal Eagle Lineup (confirm case count × 100), Vital Signs Challenge
(rename to index.html; confirm round count).

**Batch 2 — max needs confirmation (5, TRIVIAL):** Care Commander, Error Reporter,
QA Crusader, Safety Supervisor, Procedure Pursuit. The implementer derives each max from
the game's own arrays (levels × awards; time-bonus games get best-case formula) and
records the derivation in the evidence table; where genuinely unbounded, the
estimate-and-cap convention (Cell Defender precedent — server clamps, percent ≤ 100).

**Batch 3 — heuristic/odd wiring (5, TRIVIAL):** Anatomy Angler (unbounded — heuristic
cap), Side Effect Sorcerer (unbounded — heuristic cap), Gantry Position Guessing Game,
LINAC Component Identification (`correctCount`), SSD Practice (`nCorrect`/total — wire
`reportResult(nCorrect, total)`).

**Batch 4 — relative assets (4, after §1):** CT Simulation Border Challenge (MAX_CORRECT
10; strip the `../` back-link), Dosimetry Vocabulary Game (confirm max; note the
`style.css.css` filename oddity — keep as-is, it's referenced correctly), Rad Units
Challenge (multi-mode `quiz.html` set — one activity entry at `index.html`; its broken
`menu.html` back-link fixed to `index.html` during copy), Sectional Anatomy Quiz (same
menu+quiz shape).

**Batch 5 — completion-only (2, after §2):** Beam Sculptor (binary Plan
Approved/Rejected → completion), OncoLife UNO: The Clinical Shift.

Subject slugs per the audit's mapping, verified against the seed's real subjects at
implementation (unknown slug = hard error, the seed's existing idiom). Where the audit
marked a subject ⚠️-ambiguous, the plan fixes one and notes it for content-owner review.

## 4. Educator per-attempt display (#53)

The educator activity-stats page, for external-kind activities, lists attempts with the
actual score and percent (or "Completed" for completion-only) instead of only the
distribution buckets. Read path only; the audited-read pattern unchanged. The 4a e2e's
floor assertion upgrades to an exact-percent assertion.

## 5. Guards and cleanup (#56, #54, #55)

- **#56**: a CI-run check (script or test, runs in an existing job) asserting the
  security-header blocks of `infra/Caddyfile` and `infra/Caddyfile.prod` are identical —
  the exact divergence 4a's final review caught can't recur silently.
- **#54**: test-coverage batch — max_score<=0 → 422 test; negative-score schema test;
  seed-idempotency count bracketing; ExternalPlayer test-fake `expect()` hygiene;
  e2e `waitForFunction(window.RTApps)` before frame.evaluate.
- **#55**: docs/comment drift batch — activity_snapshots docstring kind list; arcade
  module "Depends on" headers; Dockerfile `files` comment.

## 6. Deferred / skipped (recorded, not lost)

- **Scoring-redesign games**: Millionaire Challenge (prize ladder + third-party audio
  domain risk), Jeopardy Review v2 (presenter board), Healthcare Roles Speech Quiz (Web
  Speech API reliability).
- **Presenter/classroom tools**: RTApps DISC Presentation.
- **UNO variants**: `Uno.html`, `uno_rt_challenge` (one UNO ships; content owner picks
  survivors later).
- **Exploration tools**: Advanced Three.js Microscope (no score, no completion moment),
  OncoLife BitLife Sim.
- **4c/4d overlaps**: linac_emulator, 3_point_setup, 3D_LINAC beginner/intermediate,
  emr_arcade, contouring_activity, console_index.
- **Reference charts** (10 Google-Sheets exports): superseded by 3c's seeded data tables.
- **Duplicates/stale**: both root Cell Defender copies, root + v2 hub index pages,
  sdoh.html, algebra-refresher (no score, prerequisite-math content, no matching subject),
  orphaned mp3s/logo.

## Testing

- Pre-flight: 4a e2e still green after the trailingSlash change; one relative-asset game
  proven loading its own script/style in the new e2e case or a route test.
- Completion-only: API tests (empty-body submit → null fields; score-on-completion-only
  422; missing-body-on-scored 422 unchanged); player spec cases (completion message →
  "Completed", ignored on scored activities); one e2e case (a completion-only game
  records and the educator sees it).
- Per batch: seed tests assert every game's activity exists published with its exact
  config; the batch reviewer verifies each game's wiring + max derivation against the
  audit (per-game evidence table).
- #53: educator page spec asserting per-attempt score/percent/Completed rendering; the
  upgraded e2e assertion.
- #56: the check itself runs in CI; a deliberate local divergence fails it.

## Out of scope

Everything in §6 · authoring UI for external activities · per-game pass thresholds ·
game content/gameplay edits beyond the copy conventions · the simulator world (4c).
