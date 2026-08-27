# ADR-0003: Curriculum content in Postgres as ProseMirror JSON with working copies and published snapshots

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Chris Guzman (lead developer); mentor consulted on the authoring workflow
- **Related:** ADR-0001 (Postgres/JSONB), ADR-0004 (attempts pin `content_version_id`)

## Context

The legacy workbook is ~95 paged lessons, ~15 quizzes, flashcard decks, matching, sequencing and ~10 calculators, all as hand-edited HTML with inline JavaScript (155 of 161 pages carry bespoke scripts), no metadata, no shared question bank, answer keys shipped to the browser. The mentor — the content author — is non-technical and must be able to edit and publish a lesson unaided (Phase 3 exit criterion). Students must never receive answer keys. Educator analytics need a stable reference to *what the student saw* even after the author edits it. Rich text must include headings, lists, tables, images from object storage, callouts and KaTeX math; nothing else.

Forces: authoring UI is the schedule sink (identified risk); XSS from author content must be impossible by construction, not by sanitisation; content must be migrated from legacy HTML by a script with a per-page report; the whole system runs on one VM at zero cost.

## Decision

1. **Content lives in Postgres.** Normalized working-copy tables — `subject`, `lesson`, `lesson_page`, `content_block`, `question`, `quiz`/`quiz_question`, `flashcard_deck`, `matching_activity`, `sequencing_activity`, `data_table`, `activity`, `outcome`, `media_asset` — are what authors edit through the in-app UI (TipTap editor, form-based builders).
2. **Publish = snapshot.** `publish` on a lesson or activity writes one immutable `content_version` row (`snapshot` JSONB: the full resolved tree, `version`, `author_id`, `published_at`, `change_note`) and sets `current_version_id`. Students read snapshots only, with answer keys stripped at the API. Working copies can change freely afterwards.
3. **Rich text = ProseMirror JSON** (TipTap on the client) stored in JSONB and validated against a **closed JSON Schema** in `packages/schemas/prose-doc.schema.json`. Nodes: `doc, paragraph, heading(level 2–4), bulletList, orderedList, listItem, blockquote, table/tableRow/tableCell, image(mediaAssetId, alt), callout(kind), math(katex), hardBreak`. Marks: `bold, italic, underline, link(href https-only), code, sub, sup`. Unknown node or mark → API rejects with 422.
4. **One schema, four consumers.** The same JSON Schema drives the TipTap extension list (editor cannot produce anything else), the Pydantic validator, `tools/migrate-legacy`'s mapper, and `ProseNode.svelte`.
5. **Rendering** is a recursive Svelte component that emits real elements per node type and **never uses `{@html}`**. Text is text; `link` hrefs are checked against the schema pattern again at render time; `image` resolves `mediaAssetId` to a presigned URL server-side.

## Why attempts pin `content_version_id`

An `attempt` (ADR-0004) records `content_version_id`, not `activity_id` alone. Grading reads the answer key from that snapshot, so an author fixing a wrong key or rewording a distractor after students have answered neither silently changes historical scores nor breaks re-grading. Educator analytics can group by version to see whether an edit improved outcomes. Without the pin, the alternative is either freezing content once any attempt exists (unacceptable for the mentor) or accepting that history is rewritten.

## Options considered

### A. Postgres: normalized working copy + immutable JSONB snapshots, ProseMirror JSON with closed schema — chosen

- **Pros:** the mentor edits in the app with a WYSIWYG editor and clicks Publish; versions and re-grading are exact; the closed schema makes XSS structurally impossible (no HTML anywhere in the pipeline); one backup covers content and results; question bank and outcome tagging are ordinary foreign keys; the migration tool has one target format.
- **Cons:** the authoring UI must be built — editor, question builders, media upload, publish/versions — before the mentor can work; snapshots duplicate data (a 95-lesson curriculum with monthly republishes is still well under 100 MB, so acceptable); a schema extension (new node type) touches four places; content history is not diffable in a PR.

### B. Markdown/MDX in git (mdsvex)

- **Pros:** zero authoring UI to build; content is diffable, reviewable in PRs, versioned by git for free; renders at build time, no database round-trip; familiar to developers.
- **Cons:** the mentor does not use git, Markdown, or a code editor, and teaching that is not a learning objective of this project; MDX allows arbitrary components (and therefore script), so the safety story becomes review discipline; interactive content (quizzes, matching, calculators with `data_table` grids) does not fit Markdown and would drift into front-matter YAML or JSON side-files; every publish is a deploy; results cannot pin a version unless the build stamps a content hash into the client. Rejected primarily on the authoring requirement.

### C. Headless CMS (Directus, Payload, Wagtail)

- **Pros:** authoring UI, media library, roles, drafts and versions out of the box; Directus and Payload have rich-text editors; Wagtail is Python/Django with StreamField.
- **Cons:** a second service with its own database schema, auth and upgrade cycle on a one-VM zero-budget deployment; the rich-text output is HTML (Directus/Wagtail) or the CMS's own block format (Payload Lexical), so the closed-schema/renderer guarantee is lost or has to be rebuilt as a mapping; question/quiz/matching structures still need custom collections, which is most of the builder work anyway; Wagtail would pull Django in beside FastAPI (ADR-0001). The owner explicitly decided "no headless CMS" after weighing this: the CMS saves the editor chrome but not the domain-specific builders, and costs a service.

### D. Store sanitized HTML

- **Pros:** trivial migration (legacy pages are already HTML); any editor works; rendering is `{@html}`.
- **Cons:** sanitiser allow-lists are a permanent security liability (bleach is deprecated; `nh3` is good but every new tag/attribute is a review); the renderer cannot enforce structure (a heading level, an image that must reference a `media_asset`); no reliable way to extract text for search or to re-theme; migration would preserve the legacy inconsistencies instead of normalising them. Rejected.

### Comparison

| Criterion | A. DB + PM JSON snapshots | B. Markdown/MDX in git | C. Headless CMS | D. Sanitized HTML |
|---|---|---|---|---|
| Non-technical author can edit and publish alone | Yes, after the authoring UI exists | No | Yes | Depends on editor |
| XSS impossible by construction | Yes (no HTML in pipeline) | No (MDX executes) | No (HTML output) | No (allow-list) |
| Exact version pinning for attempts | Yes (`content_version_id`) | Only via build hash | Partial (CMS revisions, not per-activity) | Must be added |
| Interactive content (quiz, matching, `data_table`) | Native tables | Side-files | Custom collections | Not representable |
| Extra services on the VM | 0 | 0 | 1 (+ its DB) | 0 |
| Build effort before mentor can author | High (editor + builders) | None | Medium (builders still custom) | Low |
| Legacy migration target | One validated schema | Markdown + JSON | CMS API | Copy-through (keeps inconsistencies) |

### Snapshot shape (abridged)

```json
{ "activity": {"id": "…", "kind": "lesson", "config": {"pass_percent": 80}},
  "lesson": {"slug": "rbe-and-oer", "title": "RBE and OER", "pages": [
    {"order": 1, "blocks": [
      {"type": "rich_text", "body": {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Relative biological effectiveness"}]}]}},
      {"type": "knowledge_check", "question_id": "…", "stem": {"type": "doc", "content": []}, "body": {"type": "single_choice", "options": ["…"], "answer": 2}}
    ]}]}}
```

The API serves this with `answer`/`explanation` fields removed; grading (ADR-0004) reads the unstripped row.

## Consequences

### Positive

- Author content cannot execute; the renderer has no HTML injection point at all.
- Publish/rollback is a pointer change; a version can be inspected as one JSON document.
- Students only ever receive snapshots with keys removed; the working copy is never exposed.
- Migration tooling has a single, validated target; unsupported legacy constructs are reported instead of leaking through.

### Negative

- The authoring UI is on the critical path for Phase 3 and is the largest single feature. The closed schema and form-based builders (not free-form) are the scope control.
- Adding a node type is a coordinated change: JSON Schema → TipTap extension → Pydantic → `ProseNode` → migration mapper, plus a fixture in the shared valid/invalid suite. Deliberate friction.
- No PR-based content review; instead `content_version.change_note` and an authoring audit trail. Acceptable for one author.
- `content_version.snapshot` is denormalised; a bug in the snapshot builder produces wrong published content even though working-copy rows are correct. Mitigated by a round-trip test (`build_snapshot(working_copy)` vs. golden files for three migrated lessons).

### Neutral

- JSONB GIN index on `snapshot` is not needed initially; full-text search, if added, indexes an extracted `plain_text` column at publish time.
- Media binaries never enter the database; `media_asset` holds `storage_key, mime, bytes, sha256, alt` and the API presigns S3 URLs (MinIO locally).

## Follow-ups / what would make us revisit

- Phase 3 exit: mentor edits and publishes a lesson unaided; if this fails on the editor rather than the builders, evaluate replacing TipTap's chrome with a simpler block editor while keeping the schema.
- If a second author or student-facing review workflow appears, add draft comments and a two-step approve/publish; the snapshot model already supports it.
- Revisit option C if the program needs multi-site content sharing or a non-technical admin for media at scale; revisit option B if the curriculum becomes developer-maintained.
- Revisit the closed node list when a lesson genuinely needs a construct it lacks (e.g. `video`, `figure` with caption, `tabs`); each addition is an amendment to this ADR.
