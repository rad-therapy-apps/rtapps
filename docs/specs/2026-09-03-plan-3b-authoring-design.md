# Plan 3b design — Authoring UI, media, calc framework (M4 / v0.4.0)

<!--
What this file does: the approved design for plan 3b — the in-app authoring UI (edit-existing
first), converter improvements that shrink the needs-review list, media upload, the calculator
framework with the MU calculator, and the carried hardening issues #35 #36 #37.
Used here and why: brainstormed and approved 2026-09-03; the writing-plans skill turns this
into docs/plans/<date>-plan-3b-authoring.md, executed subagent-driven on branch feat/authoring.
How it fits the project: milestone M4 (tag v0.4.0) — the "mentor edits and publishes a lesson
unaided" exit criterion from the phase-3 roadmap. Plan 3c takes the remaining calculators.
Works with: docs/specs/2026-09-01-plan-3a-content-types-design.md (per-type tables, publish,
snapshots), docs/legacy-migration-report.md (the needs-review fix-list this plan attacks),
docs/adr/0003 (content in DB, working copy + published snapshots), docs/adr/0006 (access gate).
-->

## Decisions log (owner, 2026-09-03)

| Question | Decision |
|---|---|
| 3b scope | Authoring + calculator framework with ONE calculator (MU); remaining calculators → plan 3c |
| First authoring cut | Edit-existing first: open a migrated lesson, fix text + answers, republish — before create-new |
| Converter time | Yes — targeted converter fixes + re-scan to shrink the 73-doc needs-review list before Kevin's hand pass |
| Media upload | In 3b (MinIO/S3 presigned; `media_asset` table; image insert in the editor) |
| Versioning UX | Edit → preview → publish; read-only version list; NO rollback/diff UI |
| Author access | Educators + admins (`require_author` dependency on existing roles; no new role, no migration) |
| First calculator | MU calculator (PDD/TMR lookup via the data_table editor + linear interpolation) |
| Editor architecture | **Approach A — block-structured editor**: one small TipTap instance per `rich_text` block (closed schema), plain forms for the other block types; no custom ProseMirror node views, no doc↔blocks converter |

## Goals

1. Kevin (educator) can open any migrated lesson, fix its text and
   knowledge-check answers in a rich-text editor, preview it exactly as students see it, and
   publish — unaided. This is the milestone exit criterion.
2. The needs-review backlog (73 docs today) shrinks twice: first by machine (converter fixes +
   re-scan), then by hand (Kevin working a visible review queue in the UI).
3. Authors can create new lessons, quizzes, flashcard decks, matching and sequencing
   activities from scratch, with images.
4. The calculator framework exists end-to-end, proven by the MU calculator with
   author-editable PDD/TMR tables.
5. Issues #35 #36 #37 closed.

## 1. Converter improvement pass (first, before any UI work)

Targeted fixes in `tools/migrate-legacy` for the recurring flag causes in
`docs/legacy-migration-report.md`:

- **Inline-element mapping:** unwrap `span` (keep text + translatable marks), convert inline
  `ul`/`ol`/`li` into real list nodes, map `h4` → `heading`, unwrap stray inline
  `div`/`p`/`label` instead of flagging them.
- **Button-based answer extraction:** the "no correct answer for q_pageN_M_ans" family — legacy
  pages mark the correct choice via answer-check buttons/inline JS variants the extractor
  doesn't read yet; extend extraction so those knowledge checks import with answers.
- **Images:** `img` without a resolvable asset becomes a `media` block with a
  placeholder marker (`media_asset_id: null`, original `src` + `alt` preserved in the block
  body) so the editor can later attach a real uploaded asset instead of the image being
  dropped.

Then: re-run `scan` over the legacy tree, regenerate `apps/api/seed/content/**` and
`docs/legacy-migration-report.md` (generated artefacts — never hand-edited). Each converter
fix is pinned by golden/unit tests as in plan 3a.

**Import notes → review queue:** the importer stores each document's converter notes on
`activity.config["import_notes"]` (list of strings; JSONB, no migration). Re-import clears or
replaces them; publishing from the authoring UI clears them (the human pass supersedes the
machine flags). This list powers the needs-review queue in §3.

Re-import identity stays slug-based (existing behavior); question-UUID churn on quiz reimport
remains a dev-seed-only cosmetic issue (real deployments import once, then edit via the UI).

## 2. Authoring API (`/api/v1/authoring/*`)

Authorization: new dependency `require_author` = role in {educator, admin}; every route uses
it. Students get 403 (authoring routes are not secret; no 404 masking needed). Publish and
media-confirm actions write `audit_log` rows; plain working-copy edits are not audited.

**Lessons (working copy):**
- `GET /authoring/subjects` — subjects with activity counts including drafts.
- `GET /authoring/subjects/{slug}/activities` — all kinds, all statuses, with
  `import_notes` presence flag for the review queue.
- `POST /authoring/lessons` — create draft (subject, title, slug).
- `GET /authoring/lessons/{id}` — full working copy: meta + pages + blocks (unstripped).
- `PUT /authoring/lessons/{id}` — meta (title, slug, subject, status draft/published).
- `PUT /authoring/lessons/{id}/pages` — full replace of the page/block tree in one
  transaction; every `rich_text`/stem body validated by the existing closed-schema prose
  validator (`app/content/prose.py`); unknown nodes → 422 with the offending path.

**Question bank:** `GET /authoring/questions?subject=&q=` (list/search),
`POST /authoring/questions`, `PUT /authoring/questions/{id}`. Editing a question edits the
working copy only — published snapshots and attempts stay pinned (existing versioning).

**Per-type builders** (write to the existing per-type tables):
- `POST/GET/PUT /authoring/quizzes/{id}` — question selection/order from the bank,
  pass_percent, shuffle, present_n, `access` (practice|assessment).
- `POST/GET/PUT /authoring/flashcard-decks/{id}` — cards list.
- `POST/GET/PUT /authoring/matching/{id}` — pairs list (duplicate term/definition rejected,
  as the importer already does).
- `POST/GET/PUT /authoring/sequencing/{id}` — ordered items.

**Publish / preview / versions:**
- `POST /authoring/activities/{id}/publish` — delegates to the existing `publish_activity`;
  clears `import_notes`; audited.
- `GET /authoring/activities/{id}/preview` — builds the working-copy snapshot via the
  existing `build_activity_snapshot` + `strip_activity_answers`; the author previews exactly
  the student payload (answers are visible in the editor forms, not the preview).
- `GET /authoring/activities/{id}/versions` — read-only version list (version, author,
  published_at, change_note).

**Media:** new `media_asset` table (migration 0007): id, storage_key, mime, bytes, sha256,
alt, uploaded_by, created_at, confirmed flag.
- `POST /authoring/media/presign` — {filename, mime, bytes} → presigned PUT URL + asset id
  (pending row). Allow-listed mimes (images only in 3b: png/jpeg/gif/webp; svg
  excluded as an XSS vector), size cap (10 MB).
- `POST /authoring/media/{id}/confirm` — HEAD the object, record real bytes/sha, mark
  confirmed; audited.
- `GET /media/{id}` (any authenticated user) — 302 redirect to a short-lived presigned GET;
  used by ProseNode/media blocks to render images. Unconfirmed assets 404.

The storage client (bucket ops + presign) is one small injected module
(`app/media/storage.py`); API tests inject a fake, e2e uses the real MinIO already in
`infra/compose.yaml`. Prod stays S3-compatible (env-configured endpoint/credentials in
`infra/prod.env.example` + compose forwarding).

Regenerate `packages/api-client` (`make client`) after every route change, as always.

## 3. Authoring web UI (`(app)/author/` route group)

Route guard: educator or admin (same pattern as the educator group). Pages:

- **Dashboard** (`/author`) — subjects with draft/published counts and a **needs-review
  queue**: every activity with non-empty `import_notes`, one click to its editor, notes shown
  beside the content they flag.
- **Lesson editor** (`/author/lessons/[id]`) — approach A:
  - Page list (add/reorder/delete pages; titles).
  - Per page, a vertical block list: add/reorder/delete blocks by type.
  - `rich_text` block = one TipTap instance whose extension list is generated from the closed
    schema (doc, paragraph, heading 2–4, lists, blockquote, table, callout, math source,
    hardBreak; marks bold/italic/underline/link-https/code/sub/sup). TipTap emits ProseMirror
    JSON — the same shape the API validates and ProseNode renders. No custom node views.
  - `knowledge_check` block = form: stem (TipTap), options list, correct answer radio,
    explanation (TipTap); backed by a bank question (create-inline or pick existing).
  - `media` block = image picker: upload (presign → PUT → confirm) or choose an existing
    asset; alt text required. Placeholder blocks from migration show the original src/alt and
    a prompt to attach a real asset.
  - `callout` block = kind dropdown + TipTap body.
  - Save = one `PUT .../pages`; unsaved-changes indicator; 422 validation errors surfaced
    inline at the offending block.
- **Builders** (`/author/quizzes/[id]`, `/author/decks/[id]`, `/author/matching/[id]`,
  `/author/sequencing/[id]`) — plain forms per §2, with the quiz builder embedding
  question-bank search/create.
- **Preview** — a tab on every editor rendering the student players/renderer from the
  preview snapshot (same components students use).
- **Publish** — button + confirmation; read-only version list below; optional change note.

## 4. Calculator framework + MU calculator

- **`data_table` table** (migration 0007): key (unique, e.g. `pdd_6mv`), title, `grid`
  JSONB (column headers + row-keyed numeric grid), updated_by/updated_at. Authoring UI:
  `/author/data-tables` — grid editor with paste-from-spreadsheet (TSV) support, since the
  source data lives in spreadsheets/legacy JS arrays.
- **Calculator activity:** existing `activity` kind `calculator`;
  `config = {calc_type: "mu", data_tables: ["pdd_6mv", ...]}`. At publish, the snapshot
  **embeds** the referenced tables (version-pinned like all content); students never fetch
  tables live.
- **Web:** a calculator component registry (`lib/calc/registry.ts`) keyed by `calc_type`,
  with one entry in 3b: the MU calculator — inputs (dose, field size, depth, SSD/SAD mode),
  PDD/TMR lookup with linear interpolation between grid points, computed MU shown with the
  intermediate values (it is a teaching tool). Out-of-range inputs show a clear "outside
  table range" error rather than extrapolating.
- Calculators record **no attempts** in 3b. Remaining calculators (wedge/tray factors, decay,
  inverse square, …) are plan 3c against this framework.

## 5. Hardening (carried issues)

- **#35** — rate-limit/test style cleanups from the 3a T11 review (header phrasing, `global`
  statements, return-type idiom, public test helper).
- **#36** — 404-no-audit tests for unpublished-but-existing activities on both the
  activity-stats JSON and CSV routes.
- **#37** — partial unique index `attempt(user_id, activity_id) WHERE status='in_progress'`
  (in migration 0007) + the start-attempt race handled (IntegrityError → return the existing
  in_progress attempt).

## Testing

- **API:** authz matrix on every authoring route (anon 401, student 403, educator/admin 200);
  prose-validator rejection paths (unknown node → 422 with path); full edit→publish→read
  round-trip: student GET shows the new snapshot, an attempt started before republish stays
  pinned to its old content_version; media presign/confirm flow against the fake storage
  client (mime allow-list, size cap, unconfirmed 404); data_table embed at publish;
  #36/#37 cases.
- **Converters:** golden/unit tests per fix (inline elements, button answers, image
  placeholders); regenerated report committed.
- **Web:** vitest for the block-list editor state (add/reorder/delete, dirty tracking,
  422 surfacing), TipTap closed-schema round-trip (JSON in = JSON out), MU interpolation
  unit tests (exact grid point, midpoint, out-of-range).
- **E2E (Playwright):** the milestone flow — educator opens a needs-review lesson from the
  queue, fixes a missing answer + edits text + uploads an image, previews, publishes; student
  then sees the updated lesson and the image renders.

## Out of scope (3b)

Remaining calculators (3c) · rollback/diff UI · the 88 unsupported legacy pages (phase-4
games/sims/EMR or manual recreation later) · assignments · a dedicated author role · video or
non-image media · attempt recording for calculators.
