# Phase 1c — Lessons and Knowledge Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in student opens a published, paged lesson migrated from the legacy workbook, answers its knowledge checks, and finishes with a score that is stored as an `attempt` — with the ProseMirror content pipeline, grading, seed data, generated API client, Playwright e2e and the legacy migration tool in place. Milestone **M1**, tag `v0.1.0`.

**Architecture:** Content is ProseMirror JSON validated against one closed JSON Schema (`packages/schemas`, ADR-0003). Working-copy tables (`subject`, `lesson`, `lesson_page`, `content_block`, `question`, `activity`) are filled by an importer (fed by `tools/migrate-legacy` output and the seed); `publish` freezes a `content_version` snapshot that students read with answer keys stripped. Answers are graded server-side by pure functions in `app/grading/` and recorded as `attempt` / `attempt_item` (ADR-0004) pinned to the snapshot; `submit` is idempotent. The web app renders snapshots with a recursive `ProseNode.svelte` (no `{@html}`) and calls the API from the browser through the generated `@rtapps/api-client`.

**Tech Stack:** FastAPI · SQLAlchemy 2 async (JSONB) · Alembic · `jsonschema` · `hypothesis` · `pytest-cov` · BeautifulSoup (migration) · SvelteKit / Svelte 5 · `openapi-typescript` + `openapi-fetch` · `ajv` · vitest (browser project for components) · Playwright.

## Global Constraints

- Repo `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtapps`, branch `feat/lessons` from `main` (≥ `v0.0.2`); PR at the end; CI (`pr.yml`) must be green. Python via `uv run …` inside `apps/api` (and inside `tools/migrate-legacy`); JS via `pnpm`. Conventional Commits; commit after every task.
- API base path `/api/v1`; every new route requires a signed-in user (`require_user`); errors are RFC 9457 `problem+json`; non-GET requests carry `Origin` (already enforced).
- **Prose schema** = `packages/schemas/prose-doc.schema.json` (JSON Schema draft 2020-12, closed: `additionalProperties: false` everywhere). Nodes: `doc, paragraph, heading(level 2–4), bulletList, orderedList, listItem, blockquote, table, tableRow, tableCell(attrs.header?), image(attrs.mediaAssetId, alt), callout(attrs.kind ∈ key-principle|clinical-note|warning), math(attrs.src), hardBreak, text`. Marks: `bold, italic, underline, code, subscript, superscript, link(attrs.href matching ^https://)`. Unknown node/mark → API 422, renderer throws.
- **Question types in 1c:** `single_choice` only (`body = {"options": [str, …≥2], "answer": int}`; response = `{"choice": int}`). Other types are Phase 3.
- **Snapshot shape** (ADR-0003): `{"activity": {"id", "kind": "lesson", "title", "config": {"pass_percent": 80}}, "lesson": {"id", "slug", "title", "subject": {"slug", "title"}, "pages": [{"order", "title", "blocks": [{"type": "rich_text", "body": doc} | {"type": "knowledge_check", "key", "question_id", "stem": doc, "body": {"type": "single_choice", "options", "answer"}, "explanation": doc|null}]}]}}`. The API serves it with `answer` and `explanation` removed from every `knowledge_check`; **the string `"answer"` must never appear in a student-facing response** (tested).
- `content_version` is keyed by `activity_id` (+ `version` starting at 1, unique together). `lesson.current_version_id` and `activity.current_version_id` both point at it. (`docs/03-architecture.md` §6.2 is updated in Task 12.)
- Attempts: `POST /activities/{id}/attempts` pins `activity.current_version_id`; items are graded on write; `POST /attempts/{id}/submit` requires header `Idempotency-Key` (400 if missing); same key → same 200 body; different key on a submitted attempt → 409. `passed = percent >= config.pass_percent` (default **80**). `max_score` = number of knowledge checks in the snapshot; unanswered checks score 0.
- Coverage gate: `pytest --cov=app/grading --cov=app/auth --cov-fail-under=70` in CI (conventions §4).
- Seed accounts (dev/test only; `app.seed` refuses when `env == "prod"`): `admin@rtapps.local` (admin), `educator@rtapps.local` (educator), `student@rtapps.local` (student), all with password `rtapps-dev-password`.
- Legacy repos are read-only; `tools/migrate-legacy` reads them by path and its tests use copies of two legacy pages checked into the tool's fixtures.
- Test database on `TEST_DATABASE_URL` (CI 5433; developer machine 5434).

---

## File structure

| Path | Responsibility |
|---|---|
| `packages/schemas/package.json`, `prose-doc.schema.json`, `fixtures/prose-doc.json` | The closed ProseMirror schema and shared valid/invalid fixtures (`@rtapps/schemas`) |
| `apps/api/app/content/prose.py` | `validate_prose(doc)` using `jsonschema` (raises `ProseValidationError`) |
| `apps/api/app/content/models.py` | `Subject`, `Lesson`, `LessonPage`, `ContentBlock`, `Question`, `Activity`, `ContentVersion` |
| `apps/api/alembic/versions/0003_content.py` | those tables |
| `apps/api/app/content/snapshot.py` | `build_snapshot(db, lesson)`, `strip_answers(snapshot)`, `knowledge_checks(snapshot)` |
| `apps/api/app/content/service.py` | `publish_lesson(db, lesson, author)` |
| `apps/api/app/content/importer.py` | Pydantic import models + `import_lesson(db, doc)` + `python -m app.content.importer FILE…` |
| `apps/api/app/content/router.py` | `GET /subjects`, `GET /subjects/{slug}`, `GET /lessons/{slug}` (published, stripped) |
| `apps/api/app/grading/__init__.py`, `single_choice.py` | `GradeResult`, `grade_single_choice(body, response)` |
| `apps/api/app/attempts/models.py`, `alembic/versions/0004_attempts.py` | `Attempt`, `AttemptItem` |
| `apps/api/app/attempts/router.py`, `schemas.py` | start / item / submit / `GET /me/results` |
| `apps/api/app/seed.py`, `apps/api/seed/lessons/*.json` | dev/test seed users + the two migrated lessons |
| `apps/api/app/openapi_export.py` | `python -m app.openapi_export` → `openapi.json` on stdout |
| `tools/migrate-legacy/` | uv project `migrate-legacy`: paged-lesson HTML → lesson-import JSON + report; golden tests |
| `packages/api-client/` | `@rtapps/api-client`: checked-in `openapi.json`, generated `src/schema.d.ts`, `createApi()` |
| `apps/web/src/lib/prose/` | `types.ts`, `ProseDoc.svelte`, `ProseNode.svelte`, `ProseInline.svelte` + browser tests |
| `apps/web/src/lib/lesson/` | `LessonPager.svelte`, `KnowledgeCheck.svelte`, `api.ts` (browser client) |
| `apps/web/src/routes/(app)/subjects/…`, `(app)/lessons/[slug]/…`, `(app)/home/+page.server.ts` | subject list, lesson list, lesson player, results |
| `apps/web/e2e/lesson.e2e.ts`, `apps/web/playwright.config.ts` | register → lesson → answer → score → results |
| `.github/workflows/pr.yml` | + `contract` and `e2e` jobs; coverage gate in `api` |
| `Makefile` | `seed`, `client`, `e2e` targets made real |

Task order: 1 schema → 2 content models → 3 snapshot/publish/importer → 4 content read API → 5 grading + attempts → 6 migrate-legacy → 7 seed + coverage → 8 api-client + contract job (+ #13) → 9 ProseNode → 10 lesson pages → 11 e2e + CI → 12 docs/PR/merge.

---

### Task 1: `@rtapps/schemas` — closed ProseMirror schema, shared fixtures, Python validator

**Files:**
- Create: `packages/schemas/package.json`, `packages/schemas/prose-doc.schema.json`, `packages/schemas/fixtures/prose-doc.json`, `packages/schemas/README.md`
- Create: `apps/api/app/content/__init__.py`, `apps/api/app/content/prose.py`, `apps/api/tests/test_prose_schema.py`
- Modify: `apps/api/pyproject.toml` (add `jsonschema>=4.23` to `dependencies`), `pnpm-workspace.yaml` (already includes `packages/*`)

**Interfaces:**
- Produces: `validate_prose(doc: object) -> None` raising `ProseValidationError(message)`; `PROSE_SCHEMA: dict`; the fixture file shape `{"valid": {name: doc}, "invalid": {name: doc}}` consumed by Task 9's TS test.

- [ ] **Step 1: The schema**

`packages/schemas/prose-doc.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rtapps.dev/schemas/prose-doc.schema.json",
  "title": "RTApps prose document (closed ProseMirror subset)",
  "$ref": "#/$defs/doc",
  "$defs": {
    "doc": {
      "type": "object", "additionalProperties": false,
      "required": ["type", "content"],
      "properties": {
        "type": { "const": "doc" },
        "content": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/block" } }
      }
    },
    "block": {
      "oneOf": [
        { "$ref": "#/$defs/paragraph" }, { "$ref": "#/$defs/heading" },
        { "$ref": "#/$defs/bulletList" }, { "$ref": "#/$defs/orderedList" },
        { "$ref": "#/$defs/blockquote" }, { "$ref": "#/$defs/table" },
        { "$ref": "#/$defs/image" }, { "$ref": "#/$defs/callout" }
      ]
    },
    "inline": {
      "oneOf": [ { "$ref": "#/$defs/text" }, { "$ref": "#/$defs/hardBreak" }, { "$ref": "#/$defs/math" } ]
    },
    "inlineContent": { "type": "array", "items": { "$ref": "#/$defs/inline" } },
    "blockContent": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/block" } },
    "text": {
      "type": "object", "additionalProperties": false, "required": ["type", "text"],
      "properties": {
        "type": { "const": "text" },
        "text": { "type": "string", "minLength": 1 },
        "marks": { "type": "array", "items": { "$ref": "#/$defs/mark" } }
      }
    },
    "mark": {
      "oneOf": [
        { "type": "object", "additionalProperties": false, "required": ["type"],
          "properties": { "type": { "enum": ["bold", "italic", "underline", "code", "subscript", "superscript"] } } },
        { "type": "object", "additionalProperties": false, "required": ["type", "attrs"],
          "properties": {
            "type": { "const": "link" },
            "attrs": { "type": "object", "additionalProperties": false, "required": ["href"],
              "properties": { "href": { "type": "string", "pattern": "^https://" } } }
          } }
      ]
    },
    "hardBreak": { "type": "object", "additionalProperties": false, "required": ["type"], "properties": { "type": { "const": "hardBreak" } } },
    "math": {
      "type": "object", "additionalProperties": false, "required": ["type", "attrs"],
      "properties": { "type": { "const": "math" },
        "attrs": { "type": "object", "additionalProperties": false, "required": ["src"], "properties": { "src": { "type": "string", "minLength": 1 } } } }
    },
    "paragraph": {
      "type": "object", "additionalProperties": false, "required": ["type"],
      "properties": { "type": { "const": "paragraph" }, "content": { "$ref": "#/$defs/inlineContent" } }
    },
    "heading": {
      "type": "object", "additionalProperties": false, "required": ["type", "attrs", "content"],
      "properties": { "type": { "const": "heading" },
        "attrs": { "type": "object", "additionalProperties": false, "required": ["level"], "properties": { "level": { "type": "integer", "minimum": 2, "maximum": 4 } } },
        "content": { "$ref": "#/$defs/inlineContent" } }
    },
    "listItem": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "listItem" }, "content": { "$ref": "#/$defs/blockContent" } }
    },
    "bulletList": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "bulletList" }, "content": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/listItem" } } }
    },
    "orderedList": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "orderedList" }, "content": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/listItem" } } }
    },
    "blockquote": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "blockquote" }, "content": { "$ref": "#/$defs/blockContent" } }
    },
    "tableCell": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "tableCell" },
        "attrs": { "type": "object", "additionalProperties": false, "properties": { "header": { "type": "boolean" } } },
        "content": { "$ref": "#/$defs/blockContent" } }
    },
    "tableRow": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "tableRow" }, "content": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/tableCell" } } }
    },
    "table": {
      "type": "object", "additionalProperties": false, "required": ["type", "content"],
      "properties": { "type": { "const": "table" }, "content": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/tableRow" } } }
    },
    "image": {
      "type": "object", "additionalProperties": false, "required": ["type", "attrs"],
      "properties": { "type": { "const": "image" },
        "attrs": { "type": "object", "additionalProperties": false, "required": ["mediaAssetId", "alt"],
          "properties": { "mediaAssetId": { "type": "string", "format": "uuid" }, "alt": { "type": "string" } } } }
    },
    "callout": {
      "type": "object", "additionalProperties": false, "required": ["type", "attrs", "content"],
      "properties": { "type": { "const": "callout" },
        "attrs": { "type": "object", "additionalProperties": false, "required": ["kind"], "properties": { "kind": { "enum": ["key-principle", "clinical-note", "warning"] } } },
        "content": { "$ref": "#/$defs/blockContent" } }
    }
  }
}
```

- [ ] **Step 2: Fixtures** — `packages/schemas/fixtures/prose-doc.json`. Every node and mark type appears at least once in `valid`; every `invalid` case violates exactly one rule (named by its key):

```json
{
  "valid": {
    "paragraph_with_marks": {"type": "doc", "content": [{"type": "paragraph", "content": [
      {"type": "text", "text": "RBE "}, {"type": "text", "text": "rises", "marks": [{"type": "bold"}]},
      {"type": "text", "text": " with LET", "marks": [{"type": "italic"}, {"type": "underline"}]},
      {"type": "text", "text": " D", "marks": [{"type": "code"}]},
      {"type": "text", "text": "0", "marks": [{"type": "subscript"}]},
      {"type": "text", "text": "8", "marks": [{"type": "superscript"}]},
      {"type": "hardBreak"},
      {"type": "text", "text": "source", "marks": [{"type": "link", "attrs": {"href": "https://example.org/rbe"}}]}
    ]}]},
    "heading_levels": {"type": "doc", "content": [
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "H2"}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "H3"}]},
      {"type": "heading", "attrs": {"level": 4}, "content": [{"type": "text", "text": "H4"}]}
    ]},
    "lists_and_quote": {"type": "doc", "content": [
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "one"}]}]}]},
      {"type": "orderedList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "first"}]}]}]},
      {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "quoted"}]}]}
    ]},
    "table": {"type": "doc", "content": [{"type": "table", "content": [
      {"type": "tableRow", "content": [{"type": "tableCell", "attrs": {"header": true}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Part"}]}]}]},
      {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Cathode"}]}]}]}
    ]}]},
    "callout_image_math": {"type": "doc", "content": [
      {"type": "callout", "attrs": {"kind": "key-principle"}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "OER = 3.0"}]}]},
      {"type": "image", "attrs": {"mediaAssetId": "0190f4a6-1c2b-7d3e-8f4a-5b6c7d8e9f01", "alt": "Survival curve"}},
      {"type": "paragraph", "content": [{"type": "math", "attrs": {"src": "c = \\nu \\lambda"}}]}
    ]},
    "empty_paragraph": {"type": "doc", "content": [{"type": "paragraph"}]}
  },
  "invalid": {
    "unknown_node": {"type": "doc", "content": [{"type": "iframe", "attrs": {"src": "https://x"}}]},
    "unknown_mark": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "style"}]}]}]},
    "http_link": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "http://insecure"}}]}]}]},
    "javascript_link": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "javascript:alert(1)"}}]}]}]},
    "heading_level_1": {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "x"}]}]},
    "extra_property": {"type": "doc", "content": [{"type": "paragraph", "onclick": "x()", "content": [{"type": "text", "text": "x"}]}]},
    "image_url_instead_of_asset": {"type": "doc", "content": [{"type": "image", "attrs": {"src": "https://x/y.png", "alt": ""}}]},
    "empty_doc": {"type": "doc", "content": []},
    "text_at_block_level": {"type": "doc", "content": [{"type": "text", "text": "loose"}]},
    "callout_bad_kind": {"type": "doc", "content": [{"type": "callout", "attrs": {"kind": "danger"}, "content": [{"type": "paragraph"}]}]},
    "not_a_doc": {"type": "paragraph", "content": [{"type": "text", "text": "x"}]}
  }
}
```

`packages/schemas/package.json`:
```json
{
  "name": "@rtapps/schemas",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./prose-doc.schema.json": "./prose-doc.schema.json",
    "./fixtures/prose-doc.json": "./fixtures/prose-doc.json"
  }
}
```
`README.md`: three lines — what the schema is, the four consumers (editor, API validator, migration mapper, renderer), and "add a node = amend ADR-0003 + a fixture here".

- [ ] **Step 3: Failing Python test** — `apps/api/tests/test_prose_schema.py`:
```python
import json
from pathlib import Path

import pytest

from app.content.prose import ProseValidationError, validate_prose

FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/schemas/fixtures/prose-doc.json").read_text()
)


@pytest.mark.parametrize("name", sorted(FIXTURES["valid"]))
def test_valid_documents_pass(name: str) -> None:
    validate_prose(FIXTURES["valid"][name])


@pytest.mark.parametrize("name", sorted(FIXTURES["invalid"]))
def test_invalid_documents_fail(name: str) -> None:
    with pytest.raises(ProseValidationError):
        validate_prose(FIXTURES["invalid"][name])


def test_error_message_names_the_path() -> None:
    with pytest.raises(ProseValidationError, match="content"):
        validate_prose({"type": "doc", "content": [{"type": "iframe"}]})
```
Run: `cd apps/api && uv add "jsonschema>=4.23" && uv run pytest tests/test_prose_schema.py -q` → FAIL (`ModuleNotFoundError: app.content`).

- [ ] **Step 4: Implement** `apps/api/app/content/prose.py`:
```python
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

SCHEMA_PATH = Path(__file__).resolve().parents[4] / "packages/schemas/prose-doc.schema.json"  # repo root


class ProseValidationError(ValueError):
    pass


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text())
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate_prose(doc: Any) -> None:
    """Raise ProseValidationError unless `doc` is a document of the closed prose schema."""
    error = next(iter(_validator().iter_errors(doc)), None)
    if error is not None:
        path = "/".join(str(p) for p in error.absolute_path) or "<root>"
        raise ProseValidationError(f"{path}: {error.message}")
```
Note for the Docker image: `apps/api/Dockerfile` copies only `apps/api` — add `COPY packages/schemas/prose-doc.schema.json /packages/schemas/prose-doc.schema.json`? No: the build context is `apps/api`. Instead resolve the path with a fallback: after `SCHEMA_PATH`, add `if not SCHEMA_PATH.exists(): SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas/prose-doc.schema.json"` and make the Dockerfile copy the schema into `app/schemas/` (`apps/api/Dockerfile`: `COPY --from=schemas …` is not possible with context `apps/api`; so change `pr.yml`/compose build context for the api image to the repo root with `file: apps/api/Dockerfile` and `COPY packages/schemas/prose-doc.schema.json app/schemas/`). **Do this:** context → repo root in `infra/compose.yaml` (`build: {context: .., dockerfile: apps/api/Dockerfile}`), `.github/workflows/pr.yml` images job (`context: .`, `file: apps/api/Dockerfile`), and in the Dockerfile prefix every `COPY` source with `apps/api/` and add `COPY packages/schemas/prose-doc.schema.json /app/app/schemas/prose-doc.schema.json`. Verify with `docker build -f apps/api/Dockerfile -t rtapps-api:ci . && docker run --rm rtapps-api:ci python -c "from app.content.prose import validate_prose; validate_prose({'type':'doc','content':[{'type':'paragraph'}]}); print('ok')"`.

- [ ] **Step 5: Run, lint, commit** — `uv run pytest tests/test_prose_schema.py -q` → 18 passed; `uv run ruff check . && uv run ruff format --check . && uv run mypy app` clean (add `jsonschema` stubs if mypy complains: `uv add --group dev types-jsonschema`). Commit: `feat(schemas): closed ProseMirror document schema with shared fixtures and Python validator`.

---

### Task 2: Content models and migration 0003

**Files:**
- Create: `apps/api/app/content/models.py`, `apps/api/alembic/versions/0003_content.py`, `apps/api/tests/test_content_models.py`
- Modify: `apps/api/alembic/env.py` (import `app.content.models`), `apps/api/tests/test_migrations.py` (head is now `0003`)

**Interfaces:**
- Produces ORM classes below; string-typed status/kind columns with CHECK constraints (no new Postgres enums).

- [ ] **Step 1: Failing test** — `tests/test_content_models.py`:
```python
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject


async def test_lesson_tree_round_trip(db: AsyncSession) -> None:
    subject = Subject(slug="radiation-biology", title="Radiation Biology", order=1)
    lesson = Lesson(subject=subject, slug="rbe-and-oer", title="RBE and OER", order=1)
    page = LessonPage(lesson=lesson, order=1, title="Page 1")
    q = Question(
        type="single_choice",
        stem={"type": "doc", "content": [{"type": "paragraph"}]},
        body={"options": ["A", "B"], "answer": 1},
        explanation=None,
    )
    ContentBlock(page=page, order=1, type="rich_text", body={"type": "doc", "content": [{"type": "paragraph"}]})
    ContentBlock(page=page, order=2, type="knowledge_check", body={"key": "lq_page1_1"}, question=q)
    db.add_all([subject, lesson])
    await db.flush()  # ids are assigned at flush time
    activity = Activity(kind="lesson", ref_id=lesson.id, title=lesson.title, subject=subject, lesson=lesson)
    db.add(activity)
    await db.flush()

    loaded = await db.get(Lesson, lesson.id)
    assert loaded is not None and isinstance(loaded.id, uuid.UUID)
    assert [p.title for p in loaded.pages] == ["Page 1"]
    assert [b.type for b in loaded.pages[0].blocks] == ["rich_text", "knowledge_check"]
    assert loaded.pages[0].blocks[1].question is q
    assert loaded.status == "draft" and loaded.current_version_id is None
    assert activity.config == {} and activity.status == "draft"
```
Run: `uv run pytest tests/test_content_models.py -q` → FAIL (import).

- [ ] **Step 2: Models** — `apps/api/app/content/models.py`:
```python
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import TimestampMixin
from app.db import Base
from app.ids import new_id

LESSON_STATUSES = ("draft", "published", "archived")
BLOCK_TYPES = ("rich_text", "knowledge_check")
QUESTION_TYPES = ("single_choice",)
ACTIVITY_KINDS = ("lesson",)


def _in(column: str, values: tuple[str, ...], name: str) -> CheckConstraint:
    quoted = ", ".join(f"'{v}'" for v in values)
    return CheckConstraint(f"{column} IN ({quoted})", name=name)


class Subject(TimestampMixin, Base):
    __tablename__ = "subject"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="subject", order_by="Lesson.order")


class Lesson(TimestampMixin, Base):
    __tablename__ = "lesson"
    __table_args__ = (_in("status", LESSON_STATUSES, "ck_lesson_status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id", ondelete="CASCADE"), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_version.id", ondelete="SET NULL", use_alter=True, name="fk_lesson_current_version"),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship(back_populates="lessons")
    pages: Mapped[list["LessonPage"]] = relationship(
        back_populates="lesson", order_by="LessonPage.order", cascade="all, delete-orphan", lazy="selectin"
    )


class LessonPage(TimestampMixin, Base):
    __tablename__ = "lesson_page"
    __table_args__ = (UniqueConstraint("lesson_id", "order", name="uq_lesson_page_order"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lesson.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson: Mapped[Lesson] = relationship(back_populates="pages")
    blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="page", order_by="ContentBlock.order", cascade="all, delete-orphan", lazy="selectin"
    )


class Question(TimestampMixin, Base):
    __tablename__ = "question"
    __table_args__ = (_in("type", QUESTION_TYPES, "ck_question_type"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    stem: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    explanation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class ContentBlock(TimestampMixin, Base):
    __tablename__ = "content_block"
    __table_args__ = (
        UniqueConstraint("page_id", "order", name="uq_content_block_order"),
        _in("type", BLOCK_TYPES, "ck_content_block_type"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lesson_page.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    body: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    question_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("question.id", ondelete="RESTRICT"), nullable=True
    )
    page: Mapped[LessonPage] = relationship(back_populates="blocks")
    question: Mapped[Question | None] = relationship(lazy="selectin")


class Activity(TimestampMixin, Base):
    __tablename__ = "activity"
    __table_args__ = (
        _in("kind", ACTIVITY_KINDS, "ck_activity_kind"),
        _in("status", LESSON_STATUSES, "ck_activity_status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    ref_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lesson.id", ondelete="CASCADE"), nullable=True, unique=True
    )
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_version.id", ondelete="SET NULL", use_alter=True, name="fk_activity_current_version"),
        nullable=True,
    )
    subject: Mapped[Subject] = relationship()
    lesson: Mapped[Lesson | None] = relationship()


class ContentVersion(Base):
    __tablename__ = "content_version"
    __table_args__ = (UniqueConstraint("activity_id", "version", name="uq_content_version_activity_version"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    activity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("activity.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    change_note: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 3: Migration** — `uv run alembic revision --autogenerate -m "content"` (with `TEST_DATABASE_URL` exported as `DATABASE_URL` against the throwaway DB, or write by hand), rename the file to `0003_content.py`, set `revision = "0003"`, `down_revision = "0002"`. Hand-review: tables in dependency order `subject, lesson, lesson_page, question, content_block, activity, content_version`, then the two `use_alter` FKs created with `op.create_foreign_key` after `content_version`; `downgrade` drops the two FKs first, then tables in reverse. Add index `ix_content_version_activity_id`. Update `tests/test_migrations.py` to assert head `"0003"`; add `import app.content.models  # noqa: F401` to `alembic/env.py`.

- [ ] **Step 4: Run, lint, commit** — `uv run pytest -q` (all green incl. migration test), ruff/mypy clean. Commit: `feat(api): content working-copy models and migration 0003`.

---

### Task 3: Snapshot, publish, importer

**Files:**
- Create: `apps/api/app/content/snapshot.py`, `apps/api/app/content/service.py`, `apps/api/app/content/importer.py` (with an `if __name__ == "__main__": main()` guard so `python -m app.content.importer` works), `apps/api/tests/test_content_publish.py`, `apps/api/tests/test_importer.py`, `apps/api/tests/fixtures/lesson_min.json`

**Interfaces:**
- Produces: `build_snapshot(db, lesson) -> dict`, `strip_answers(snapshot) -> dict` (pure, deep-copied), `knowledge_checks(snapshot) -> dict[str, dict]` (key → unstripped block), `publish_lesson(db, lesson, author: User | None, change_note: str | None = None) -> ContentVersion`, `import_lesson(db, doc: LessonImport, *, publish: bool = True, author: User | None = None) -> Lesson`, Pydantic `LessonImport`.
- Import document (`LessonImport`): `{"subject": {"slug", "title", "order"?}, "lesson": {"slug", "title", "order"?, "pages": [{"title", "blocks": [{"type": "rich_text", "body": doc} | {"type": "knowledge_check", "key", "stem": doc, "options": [str≥2], "answer": int, "explanation": doc|null}]}]}}`.

- [ ] **Step 1: Fixture + failing tests**

`tests/fixtures/lesson_min.json`:
```json
{
  "subject": {"slug": "radiation-biology", "title": "Radiation Biology", "order": 1},
  "lesson": {"slug": "rbe-and-oer", "title": "RBE and OER", "order": 1, "pages": [
    {"title": "Not All Radiation Damages Equally", "blocks": [
      {"type": "rich_text", "body": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "LET matters."}]}]}}
    ]},
    {"title": "RBE", "blocks": [
      {"type": "rich_text", "body": {"type": "doc", "content": [{"type": "callout", "attrs": {"kind": "key-principle"}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "RBE rises with LET."}]}]}]}},
      {"type": "knowledge_check", "key": "lq_page2_1",
       "stem": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Beyond the optimal LET, RBE…"}]}]},
       "options": ["keeps increasing", "decreases"], "answer": 1,
       "explanation": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Overkill."}]}]}}
    ]}
  ]}
}
```

`tests/test_content_publish.py`:
```python
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.content.importer import LessonImport, import_lesson
from app.content.service import publish_lesson
from app.content.snapshot import build_snapshot, knowledge_checks, strip_answers

FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())


async def test_snapshot_shape_and_strip(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE), publish=False)
    snap = await build_snapshot(db, lesson)
    assert snap["activity"]["kind"] == "lesson" and snap["activity"]["config"] == {"pass_percent": 80}
    assert snap["lesson"]["slug"] == "rbe-and-oer" and snap["lesson"]["subject"]["slug"] == "radiation-biology"
    assert [p["title"] for p in snap["lesson"]["pages"]] == ["Not All Radiation Damages Equally", "RBE"]
    kc = snap["lesson"]["pages"][1]["blocks"][1]
    assert kc["type"] == "knowledge_check" and kc["key"] == "lq_page2_1" and kc["body"]["answer"] == 1
    assert knowledge_checks(snap) == {"lq_page2_1": kc}

    stripped = strip_answers(snap)
    assert "answer" not in json.dumps(stripped)
    assert "explanation" not in json.dumps(stripped)
    assert stripped["lesson"]["pages"][1]["blocks"][1]["body"]["options"] == ["keeps increasing", "decreases"]
    assert snap["lesson"]["pages"][1]["blocks"][1]["body"]["answer"] == 1  # original untouched


async def test_publish_creates_versions_and_pins_pointers(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE), publish=False)
    v1 = await publish_lesson(db, lesson, author=None, change_note="first")
    assert v1.version == 1 and lesson.current_version_id == v1.id and lesson.status == "published"
    lesson.title = "RBE and OER (edited)"
    v2 = await publish_lesson(db, lesson, author=None)
    assert v2.version == 2 and lesson.current_version_id == v2.id
    assert v1.snapshot["lesson"]["title"] == "RBE and OER"  # immutable
    assert v2.snapshot["lesson"]["title"] == "RBE and OER (edited)"
```

`tests/test_importer.py`:
```python
import json
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.importer import LessonImport, import_lesson
from app.content.models import Activity, Lesson, Question

FIXTURE = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())


async def test_import_creates_tree_activity_and_publishes(db: AsyncSession) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(FIXTURE))
    assert lesson.status == "published" and lesson.current_version_id is not None
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None and activity.current_version_id == lesson.current_version_id
    assert activity.title == "RBE and OER" and activity.ref_id == lesson.id


async def test_reimport_replaces_pages_keeps_ids_and_bumps_version(db: AsyncSession) -> None:
    first = await import_lesson(db, LessonImport.model_validate(FIXTURE))
    doc = json.loads(json.dumps(FIXTURE))
    doc["lesson"]["pages"] = doc["lesson"]["pages"][:1]
    second = await import_lesson(db, LessonImport.model_validate(doc))
    assert second.id == first.id and len(second.pages) == 1
    assert (await db.scalar(select(func.count()).select_from(Question))) == 0
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == first.id))
    assert activity is not None
    versions = await db.scalar(select(func.count()).select_from(__import__("app.content.models", fromlist=["ContentVersion"]).ContentVersion))
    assert versions == 2


def test_import_rejects_invalid_prose_and_bad_answer() -> None:
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][0]["blocks"][0]["body"] = {"type": "doc", "content": [{"type": "script"}]}
    with pytest.raises(ValidationError, match="content"):
        LessonImport.model_validate(bad)
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][1]["blocks"][1]["answer"] = 5
    with pytest.raises(ValidationError, match="answer"):
        LessonImport.model_validate(bad)


def test_duplicate_keys_rejected() -> None:
    bad = json.loads(json.dumps(FIXTURE))
    bad["lesson"]["pages"][0]["blocks"].append(dict(bad["lesson"]["pages"][1]["blocks"][1]))
    with pytest.raises(ValidationError, match="lq_page2_1"):
        LessonImport.model_validate(bad)


async def test_lesson_count_after_import(db: AsyncSession) -> None:
    await import_lesson(db, LessonImport.model_validate(FIXTURE))
    assert (await db.scalar(select(func.count()).select_from(Lesson))) == 1
```
(Replace the `__import__` line with a normal `from app.content.models import ContentVersion` import at the top — it is written that way here only to keep the snippet short.) Run: `uv run pytest tests/test_content_publish.py tests/test_importer.py -q` → FAIL (imports).

- [ ] **Step 2: Implement**

`app/content/snapshot.py`:
```python
import copy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Activity, Lesson

DEFAULT_CONFIG: dict[str, Any] = {"pass_percent": 80}


async def build_snapshot(db: AsyncSession, lesson: Lesson) -> dict[str, Any]:
    """Resolve the working copy of `lesson` into one JSON document (unstripped)."""
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    subject = await db.get(lesson.__class__.subject.property.mapper.class_, lesson.subject_id)
    await db.refresh(lesson, ["pages"])
    pages = []
    for page in lesson.pages:
        blocks: list[dict[str, Any]] = []
        for block in page.blocks:
            if block.type == "rich_text":
                blocks.append({"type": "rich_text", "body": block.body})
            elif block.type == "knowledge_check":
                q = block.question
                if q is None:
                    raise ValueError(f"knowledge_check {block.body.get('key')} has no question")
                blocks.append(
                    {
                        "type": "knowledge_check",
                        "key": block.body["key"],
                        "question_id": str(q.id),
                        "stem": q.stem,
                        "body": {"type": q.type, **q.body},
                        "explanation": q.explanation,
                    }
                )
        pages.append({"order": page.order, "title": page.title, "blocks": blocks})
    return {
        "activity": {
            "id": str(activity.id),
            "kind": activity.kind,
            "title": activity.title,
            "config": {**DEFAULT_CONFIG, **activity.config},
        },
        "lesson": {
            "id": str(lesson.id),
            "slug": lesson.slug,
            "title": lesson.title,
            "subject": {"slug": subject.slug, "title": subject.title} if subject else None,
            "pages": pages,
        },
    }


def strip_answers(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Deep copy of `snapshot` with answer keys and explanations removed (student-facing)."""
    out = copy.deepcopy(snapshot)
    for page in out["lesson"]["pages"]:
        for block in page["blocks"]:
            if block["type"] == "knowledge_check":
                block["body"].pop("answer", None)
                block.pop("explanation", None)
    return out


def knowledge_checks(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        block["key"]: block
        for page in snapshot["lesson"]["pages"]
        for block in page["blocks"]
        if block["type"] == "knowledge_check"
    }
```
(Use `from app.content.models import Subject` and `await db.get(Subject, lesson.subject_id)` instead of the `lesson.__class__…` gymnastics.)

`app/content/service.py`:
```python
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import build_snapshot


async def publish_lesson(
    db: AsyncSession, lesson: Lesson, author: User | None, change_note: str | None = None
) -> ContentVersion:
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        raise ValueError(f"lesson {lesson.slug} has no activity")
    snapshot = await build_snapshot(db, lesson)
    last = await db.scalar(
        select(func.max(ContentVersion.version)).where(ContentVersion.activity_id == activity.id)
    )
    version = ContentVersion(
        activity_id=activity.id,
        version=(last or 0) + 1,
        snapshot=snapshot,
        author_id=author.id if author else None,
        published_at=datetime.now(UTC),
        change_note=change_note,
    )
    db.add(version)
    await db.flush()
    lesson.current_version_id = version.id
    lesson.status = "published"
    activity.current_version_id = version.id
    activity.status = "published"
    await db.flush()
    return version
```

`app/content/importer.py`:
```python
import asyncio
import json
import sys
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import load_settings
from app.content.models import Activity, ContentBlock, Lesson, LessonPage, Question, Subject
from app.content.prose import ProseValidationError, validate_prose
from app.content.service import publish_lesson
from app.db import get_engine, make_session_factory


def _prose(value: Any) -> Any:
    try:
        validate_prose(value)
    except ProseValidationError as exc:
        raise ValueError(str(exc)) from exc
    return value


Prose = Annotated[dict[str, Any], Field(json_schema_extra={"format": "prose-doc"})]


class SubjectImport(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=80)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0


class RichTextImport(BaseModel):
    type: Literal["rich_text"]
    body: Prose
    _v = field_validator("body")(_prose)


class KnowledgeCheckImport(BaseModel):
    type: Literal["knowledge_check"]
    key: str = Field(pattern=r"^[a-z0-9_]+$", max_length=60)
    stem: Prose
    options: list[str] = Field(min_length=2, max_length=10)
    answer: int
    explanation: Prose | None = None
    _v1 = field_validator("stem")(_prose)
    _v2 = field_validator("explanation")(lambda v: None if v is None else _prose(v))

    @model_validator(mode="after")
    def _answer_in_range(self) -> "KnowledgeCheckImport":
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer {self.answer} out of range for {len(self.options)} options")
        return self


BlockImport = Annotated[RichTextImport | KnowledgeCheckImport, Field(discriminator="type")]


class PageImport(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    blocks: list[BlockImport] = Field(min_length=1)


class LessonBody(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=200)
    order: int = 0
    pages: list[PageImport] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_keys(self) -> "LessonBody":
        seen: set[str] = set()
        for page in self.pages:
            for block in page.blocks:
                if isinstance(block, KnowledgeCheckImport):
                    if block.key in seen:
                        raise ValueError(f"duplicate knowledge_check key {block.key}")
                    seen.add(block.key)
        return self


class LessonImport(BaseModel):
    subject: SubjectImport
    lesson: LessonBody


async def import_lesson(
    db: AsyncSession, doc: LessonImport, *, publish: bool = True, author: User | None = None
) -> Lesson:
    """Create or replace the working copy of a lesson from an import document."""
    subject = await db.scalar(select(Subject).where(Subject.slug == doc.subject.slug))
    if subject is None:
        subject = Subject(slug=doc.subject.slug, title=doc.subject.title, order=doc.subject.order)
        db.add(subject)
        await db.flush()

    lesson = await db.scalar(select(Lesson).where(Lesson.slug == doc.lesson.slug))
    if lesson is None:
        lesson = Lesson(subject_id=subject.id, slug=doc.lesson.slug, title=doc.lesson.title, order=doc.lesson.order)
        db.add(lesson)
        await db.flush()
    else:
        lesson.subject_id, lesson.title, lesson.order = subject.id, doc.lesson.title, doc.lesson.order
        old_question_ids = [b.question_id for p in lesson.pages for b in p.blocks if b.question_id]
        lesson.pages.clear()
        await db.flush()
        for qid in old_question_ids:
            q = await db.get(Question, qid)
            if q is not None:
                await db.delete(q)
        await db.flush()

    for order, page in enumerate(doc.lesson.pages, start=1):
        lp = LessonPage(lesson_id=lesson.id, order=order, title=page.title)
        db.add(lp)
        await db.flush()
        for border, block in enumerate(page.blocks, start=1):
            if isinstance(block, RichTextImport):
                db.add(ContentBlock(page_id=lp.id, order=border, type="rich_text", body=block.body))
            else:
                q = Question(
                    type="single_choice",
                    stem=block.stem,
                    body={"options": block.options, "answer": block.answer},
                    explanation=block.explanation,
                )
                db.add(q)
                await db.flush()
                db.add(
                    ContentBlock(
                        page_id=lp.id, order=border, type="knowledge_check",
                        body={"key": block.key}, question_id=q.id,
                    )
                )
    await db.flush()

    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    if activity is None:
        activity = Activity(kind="lesson", ref_id=lesson.id, title=lesson.title, subject_id=subject.id, lesson_id=lesson.id)
        db.add(activity)
    else:
        activity.title, activity.subject_id = lesson.title, subject.id
    await db.flush()
    await db.refresh(lesson, ["pages"])

    if publish:
        await publish_lesson(db, lesson, author=author, change_note="import")
    return lesson


async def _run(paths: list[Path]) -> None:
    settings = load_settings()
    engine = get_engine(settings)
    factory = make_session_factory(engine)
    async with factory() as db:
        for path in paths:
            doc = LessonImport.model_validate(json.loads(path.read_text()))
            lesson = await import_lesson(db, doc)
            print(f"imported {lesson.slug} ({len(lesson.pages)} pages)")
        await db.commit()
    await engine.dispose()


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m app.content.importer FILE.json [FILE.json …]", file=sys.stderr)
        sys.exit(2)
    asyncio.run(_run([Path(p) for p in sys.argv[1:]]))
```
The `refresh(lesson, ["pages"])` after mutation is required because pages/blocks are `selectin`-loaded; if the reimport test fails on stale collections, `await db.refresh(lesson)` before `lesson.pages.clear()` as well.

- [ ] **Step 3: Run, lint, commit** — both new test files green; ruff/mypy clean (the `field_validator` lambdas may need small named functions for mypy — use them). Commit: `feat(api): lesson snapshots, publish, and JSON importer`.

> **Implementation note (as built):** `import_lesson` builds the tree through the relationships (`lesson.pages.append(lp)`, `lp.blocks.append(ContentBlock(..., question=q))`, one flush at the end; a new lesson is not flushed before its pages are appended) so the in-memory collections stay accurate and `build_snapshot` needs no `refresh` calls. Use decorated `@field_validator`/`@classmethod` methods rather than the lambda shorthand shown above.

---

### Task 4: Content read API (published, answers stripped)

**Files:**
- Create: `apps/api/app/content/router.py`, `apps/api/app/content/schemas.py`, `apps/api/tests/test_content_routes.py`
- Modify: `apps/api/app/main.py` (mount router), `apps/api/tests/conftest.py` (add `seed_lesson(db)` helper that imports `tests/fixtures/lesson_min.json` and returns the lesson)

**Interfaces:**
- `GET /subjects` → `[{slug, title, order, lesson_count}]` (subjects with ≥1 published lesson, ordered by `order`, `slug`).
- `GET /subjects/{slug}` → `{slug, title, summary, lessons: [{slug, title, order}]}` (published lessons only; 404 if subject missing or has none).
- `GET /lessons/{slug}` → `{activity_id, content_version_id, snapshot}` where `snapshot = strip_answers(current_version.snapshot)`; 404 if unpublished/missing.
- All three: `require_user`.

- [ ] **Step 1: Failing tests** — `tests/test_content_routes.py`:
```python
import json

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import register, seed_lesson


async def test_requires_login(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    assert (await client.get("/api/v1/subjects")).status_code == 401
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 401


async def test_subjects_and_lessons_listing(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    subjects = (await client.get("/api/v1/subjects")).json()
    assert subjects == [{"slug": "radiation-biology", "title": "Radiation Biology", "order": 1, "lesson_count": 1}]
    subject = (await client.get("/api/v1/subjects/radiation-biology")).json()
    assert subject["lessons"] == [{"slug": "rbe-and-oer", "title": "RBE and OER", "order": 1}]
    assert (await client.get("/api/v1/subjects/nope")).status_code == 404


async def test_lesson_snapshot_is_stripped(client: AsyncClient, db: AsyncSession) -> None:
    lesson = await seed_lesson(db)
    await register(client)
    r = await client.get("/api/v1/lessons/rbe-and-oer")
    assert r.status_code == 200
    body = r.json()
    assert body["content_version_id"] == str(lesson.current_version_id)
    text = json.dumps(body)
    assert '"answer"' not in text and '"explanation"' not in text
    kc = body["snapshot"]["lesson"]["pages"][1]["blocks"][1]
    assert kc["body"] == {"type": "single_choice", "options": ["keeps increasing", "decreases"]}


async def test_unpublished_lesson_is_404(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db, publish=False)
    await register(client)
    assert (await client.get("/api/v1/lessons/rbe-and-oer")).status_code == 404
    assert (await client.get("/api/v1/subjects")).json() == []
```
`conftest.py` addition:
```python
async def seed_lesson(db: AsyncSession, *, publish: bool = True) -> Lesson:
    doc = json.loads((Path(__file__).parent / "fixtures/lesson_min.json").read_text())
    return await import_lesson(db, LessonImport.model_validate(doc), publish=publish)
```

- [ ] **Step 2: Implement** `schemas.py` (`SubjectOut`, `SubjectDetailOut`, `LessonRefOut`, `LessonOut(activity_id: uuid.UUID, content_version_id: uuid.UUID, snapshot: dict[str, Any])`) and `router.py` (`APIRouter(tags=["content"])`, `dependencies=[Depends(require_user)]`): `/subjects` = `select(Subject, func.count(Lesson.id)).join(Lesson).where(Lesson.status == "published").group_by(Subject.id).order_by(Subject.order, Subject.slug)`; `/lessons/{slug}` loads `Lesson` + `ContentVersion` by `current_version_id` and its `Activity`, returns `strip_answers(version.snapshot)`. Mount in `main.py` under `/api/v1`.

- [ ] **Step 3: Run, lint, commit** — green; commit `feat(api): published subject and lesson read endpoints with answer keys stripped`.

---

### Task 5: Grading and attempts (models, migration 0004, routes, idempotent submit)

**Files:**
- Create: `apps/api/app/grading/__init__.py`, `apps/api/app/grading/single_choice.py`, `apps/api/tests/test_grading_single_choice.py`
- Create: `apps/api/app/attempts/__init__.py`, `apps/api/app/attempts/models.py`, `apps/api/alembic/versions/0004_attempts.py`, `apps/api/app/attempts/schemas.py`, `apps/api/app/attempts/router.py`, `apps/api/tests/test_attempts.py`
- Modify: `apps/api/pyproject.toml` (dev: `hypothesis>=6.100`), `alembic/env.py` (import), `tests/test_migrations.py` (head `0004`), `app/main.py` (mount)

**Interfaces:**
- `GradeResult(correct: bool, score: float, max_score: float)` (frozen dataclass); `grade_single_choice(body: dict, response: object) -> GradeResult` — never raises; `max_score` is always `1.0`.
- `Attempt`, `AttemptItem` ORM (columns per Global Constraints; `unique(attempt_id, item_key)`).
- Routes (all `require_user`): `POST /activities/{activity_id}/attempts` → 201 `AttemptOut`; `POST /attempts/{id}/items` body `{item_key, response}` → 200 `ItemGradeOut{item_key, correct, score, max_score, explanation}`; `POST /attempts/{id}/submit` (header `Idempotency-Key`) → 200 `AttemptOut`; `GET /me/results` → `[ResultOut{attempt_id, activity_id, activity_title, lesson_slug, percent, passed, score, max_score, submitted_at}]`.
- `AttemptOut{id, activity_id, content_version_id, status, started_at, submitted_at, score, max_score, percent, passed}`.
- Ownership: an attempt that exists but belongs to another user → **404** (do not reveal existence).

- [ ] **Step 1: Grading tests first** — `tests/test_grading_single_choice.py`:
```python
from hypothesis import given
from hypothesis import strategies as st

from app.grading.single_choice import GradeResult, grade_single_choice

options = st.lists(st.text(min_size=1, max_size=40), min_size=2, max_size=10)


@given(options)
def test_matching_choice_is_correct(opts: list[str]) -> None:
    for answer in range(len(opts)):
        r = grade_single_choice({"options": opts, "answer": answer}, {"choice": answer})
        assert r == GradeResult(correct=True, score=1.0, max_score=1.0)


@given(options, st.integers())
def test_non_matching_choice_is_incorrect(opts: list[str], choice: int) -> None:
    answer = 0
    r = grade_single_choice({"options": opts, "answer": answer}, {"choice": choice})
    assert r.correct is (choice == answer) and r.max_score == 1.0
    assert r.score == (1.0 if r.correct else 0.0)


@given(st.one_of(st.none(), st.text(), st.integers(), st.lists(st.integers()), st.dictionaries(st.text(), st.text())))
def test_malformed_response_never_raises(response: object) -> None:
    r = grade_single_choice({"options": ["a", "b"], "answer": 1}, response)
    assert r.correct is False and r.score == 0.0 and r.max_score == 1.0


def test_bool_is_not_an_int_choice() -> None:
    assert grade_single_choice({"options": ["a", "b"], "answer": 1}, {"choice": True}).correct is False
```
`app/grading/__init__.py`:
```python
from dataclasses import dataclass


@dataclass(frozen=True)
class GradeResult:
    correct: bool
    score: float
    max_score: float
```
`app/grading/single_choice.py`:
```python
from typing import Any

from app.grading import GradeResult

MAX_SCORE = 1.0


def grade_single_choice(body: dict[str, Any], response: object) -> GradeResult:
    """`body` = {"options": [...], "answer": int}; `response` = {"choice": int}. Pure; never raises."""
    answer = body.get("answer")
    choice = response.get("choice") if isinstance(response, dict) else None
    correct = (
        isinstance(choice, int)
        and not isinstance(choice, bool)
        and isinstance(answer, int)
        and choice == answer
    )
    return GradeResult(correct=correct, score=MAX_SCORE if correct else 0.0, max_score=MAX_SCORE)
```
`uv add --group dev "hypothesis>=6.100"`; run the file → green.

- [ ] **Step 2: Models + migration** — `app/attempts/models.py`:
```python
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.ids import new_id

ATTEMPT_STATUSES = ("in_progress", "submitted", "abandoned")
ATTEMPT_SOURCES = ("web", "sdk")


class Attempt(Base):
    __tablename__ = "attempt"
    __table_args__ = (
        CheckConstraint("status IN ('in_progress', 'submitted', 'abandoned')", name="ck_attempt_status"),
        CheckConstraint("source IN ('web', 'sdk')", name="ck_attempt_source"),
        Index("ix_attempt_user_activity", "user_id", "activity_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    activity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("activity.id", ondelete="CASCADE"), nullable=False)
    content_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content_version.id", ondelete="RESTRICT"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(10), nullable=False, default="web")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    client_meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    items: Mapped[list["AttemptItem"]] = relationship(back_populates="attempt", cascade="all, delete-orphan", lazy="selectin")


class AttemptItem(Base):
    __tablename__ = "attempt_item"
    __table_args__ = (UniqueConstraint("attempt_id", "item_key", name="uq_attempt_item_key"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attempt.id", ondelete="CASCADE"), nullable=False)
    item_key: Mapped[str] = mapped_column(String(60), nullable=False)
    response: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt: Mapped[Attempt] = relationship(back_populates="items")
```
Migration `0004_attempts.py` (`revision="0004"`, `down_revision="0003"`): both tables, the index, the unique constraint; downgrade drops in reverse. Update `test_migrations.py` head → `"0004"`.

- [ ] **Step 3: Failing route tests** — `tests/test_attempts.py`:
```python
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import register, seed_lesson


async def _start(client: AsyncClient) -> dict:
    lesson = (await client.get("/api/v1/lessons/rbe-and-oer")).json()
    r = await client.post(f"/api/v1/activities/{lesson['activity_id']}/attempts")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content_version_id"] == lesson["content_version_id"] and body["status"] == "in_progress"
    return body


async def test_start_grade_submit_flow(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)

    r = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1", "response": {"choice": 0}})
    assert r.status_code == 200 and r.json()["correct"] is False and r.json()["score"] == 0
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1", "response": {"choice": 1}})
    assert r.json()["correct"] is True and r.json()["explanation"]["type"] == "doc"  # last write wins, explanation returned after grading

    key = str(uuid.uuid4())
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "submitted" and body["score"] == 1 and body["max_score"] == 1
    assert body["percent"] == 100 and body["passed"] is True and body["submitted_at"]

    again = await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": key})
    assert again.status_code == 200 and again.json() == body
    other = await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": str(uuid.uuid4())})
    assert other.status_code == 409
    late = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1", "response": {"choice": 1}})
    assert late.status_code == 409

    results = (await client.get("/api/v1/me/results")).json()
    assert len(results) == 1 and results[0]["lesson_slug"] == "rbe-and-oer" and results[0]["percent"] == 100


async def test_unanswered_checks_count_as_zero(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "k1"})
    assert r.json()["score"] == 0 and r.json()["max_score"] == 1 and r.json()["percent"] == 0 and r.json()["passed"] is False


async def test_submit_requires_idempotency_key(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    assert (await client.post(f"/api/v1/attempts/{attempt['id']}/submit")).status_code == 400


async def test_unknown_item_key_is_404_and_bad_body_422(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client)
    attempt = await _start(client)
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "nope", "response": {"choice": 0}})
    assert r.status_code == 404
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1"})
    assert r.status_code == 422


async def test_other_users_attempt_is_404(client: AsyncClient, db: AsyncSession) -> None:
    await seed_lesson(db)
    await register(client, email="one@example.edu")
    attempt = await _start(client)
    client.cookies.clear()
    await register(client, email="two@example.edu")
    r = await client.post(f"/api/v1/attempts/{attempt['id']}/items", json={"item_key": "lq_page2_1", "response": {"choice": 1}})
    assert r.status_code == 404
    assert (await client.post(f"/api/v1/attempts/{attempt['id']}/submit", headers={"Idempotency-Key": "x"})).status_code == 404


async def test_unpublished_activity_cannot_start(client: AsyncClient, db: AsyncSession) -> None:
    lesson = await seed_lesson(db, publish=False)
    await register(client)
    from sqlalchemy import select
    from app.content.models import Activity
    activity = await db.scalar(select(Activity).where(Activity.lesson_id == lesson.id))
    assert activity is not None
    assert (await client.post(f"/api/v1/activities/{activity.id}/attempts")).status_code == 404
```
(Move the two inline imports to the top of the file.) Check that `register()` in `conftest.py` accepts `email=`; if not, add keyword parameters `email="a@example.edu"`, `password="password-123"`, `display_name="A"`.

- [ ] **Step 4: Implement** `app/attempts/schemas.py` (`ItemIn{item_key: str = Field(max_length=60), response: dict[str, Any]}`, `ItemGradeOut`, `AttemptOut`, `ResultOut` — all `from_attributes`/explicit) and `app/attempts/router.py`:
```python
from datetime import UTC, datetime
from typing import Any
import uuid

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attempts.models import Attempt, AttemptItem
from app.attempts.schemas import AttemptOut, ItemGradeOut, ItemIn, ResultOut
from app.auth.deps import require_user
from app.auth.models import User
from app.content.models import Activity, ContentVersion, Lesson
from app.content.snapshot import knowledge_checks
from app.db import get_session
from app.errors import Problem
from app.grading.single_choice import grade_single_choice

router = APIRouter(tags=["attempts"])


async def _owned_attempt(db: AsyncSession, attempt_id: uuid.UUID, user: User) -> Attempt:
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None or attempt.user_id != user.id:
        raise Problem(404, "Attempt not found")
    return attempt


@router.post("/activities/{activity_id}/attempts", status_code=status.HTTP_201_CREATED, response_model=AttemptOut)
async def start_attempt(activity_id: uuid.UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_session)) -> Attempt:
    activity = await db.get(Activity, activity_id)
    if activity is None or activity.current_version_id is None or activity.status != "published":
        raise Problem(404, "Activity not found")
    attempt = Attempt(user_id=user.id, activity_id=activity.id, content_version_id=activity.current_version_id)
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.post("/attempts/{attempt_id}/items", response_model=ItemGradeOut)
async def grade_item(attempt_id: uuid.UUID, body: ItemIn, user: User = Depends(require_user), db: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    attempt = await _owned_attempt(db, attempt_id, user)
    if attempt.status != "in_progress":
        raise Problem(409, "Attempt already submitted")
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    block = knowledge_checks(version.snapshot).get(body.item_key)
    if block is None:
        raise Problem(404, "Unknown item key")
    result = grade_single_choice(block["body"], body.response)
    item = next((i for i in attempt.items if i.item_key == body.item_key), None)
    if item is None:
        item = AttemptItem(attempt_id=attempt.id, item_key=body.item_key, response=body.response)
        db.add(item)
    item.response, item.correct, item.score, item.max_score = body.response, result.correct, result.score, result.max_score
    item.graded_at = datetime.now(UTC)
    await db.commit()
    return {"item_key": body.item_key, "correct": result.correct, "score": result.score, "max_score": result.max_score, "explanation": block.get("explanation")}


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptOut)
async def submit_attempt(attempt_id: uuid.UUID, idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"), user: User = Depends(require_user), db: AsyncSession = Depends(get_session)) -> Attempt:
    if not idempotency_key:
        raise Problem(400, "Idempotency-Key header is required")
    attempt = await _owned_attempt(db, attempt_id, user)
    if attempt.status == "submitted":
        if attempt.idempotency_key == idempotency_key:
            return attempt
        raise Problem(409, "Attempt already submitted")
    version = await db.get(ContentVersion, attempt.content_version_id)
    assert version is not None
    checks = knowledge_checks(version.snapshot)
    scored = {i.item_key: i.score or 0.0 for i in attempt.items}
    score = sum(scored.get(key, 0.0) for key in checks)
    max_score = float(len(checks))
    percent = round(100.0 * score / max_score, 2) if max_score else 100.0
    pass_percent = float(version.snapshot["activity"]["config"].get("pass_percent", 80))
    now = datetime.now(UTC)
    attempt.score, attempt.max_score, attempt.percent = score, max_score, percent
    attempt.passed = percent >= pass_percent
    attempt.status, attempt.submitted_at, attempt.idempotency_key = "submitted", now, idempotency_key
    attempt.duration_s = int((now - attempt.started_at).total_seconds())
    await db.commit()
    await db.refresh(attempt)
    return attempt


@router.get("/me/results", response_model=list[ResultOut])
async def my_results(user: User = Depends(require_user), db: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = await db.execute(
        select(Attempt, Activity.title, Lesson.slug)
        .join(Activity, Activity.id == Attempt.activity_id)
        .outerjoin(Lesson, Lesson.id == Activity.lesson_id)
        .where(Attempt.user_id == user.id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc())
        .limit(50)
    )
    return [
        {"attempt_id": a.id, "activity_id": a.activity_id, "activity_title": title, "lesson_slug": slug,
         "percent": a.percent, "passed": a.passed, "score": a.score, "max_score": a.max_score, "submitted_at": a.submitted_at}
        for a, title, slug in rows.all()
    ]
```
Mount in `main.py`. Note: the routes call `db.commit()` like the auth routes do; inside the test fixture this commits the savepoint only.

- [ ] **Step 5: Run everything, lint, commit** — `uv run pytest -q` all green; ruff/mypy clean. Commit: `feat(api): single-choice grading and attempt lifecycle with idempotent submit`.

---

### Task 6: `tools/migrate-legacy` — paged lessons from legacy HTML to import JSON

**Files:**
- Create: `tools/migrate-legacy/pyproject.toml` (uv project `migrate-legacy`, Python 3.12, deps `beautifulsoup4>=4.13`; dev `pytest>=9`, `jsonschema>=4.23`, `ruff`, `mypy`, `types-beautifulsoup4`), `src/migrate_legacy/__init__.py`, `html2prose.py`, `convert.py`, `cli.py`, `README.md`
- Create fixtures: copy `rtt_e_workbook/Radiation_Biology/RBE_and_OER/index.html` → `tests/fixtures/Radiation_Biology/RBE_and_OER/index.html` and `rtt_e_workbook/Radiation_Physics/em_spectrum/index.html` → `tests/fixtures/Radiation_Physics/em_spectrum/index.html`; expected outputs `tests/golden/rbe-and-oer.json`, `tests/golden/em-spectrum.json`; `tests/test_convert.py`, `tests/test_html2prose.py`
- Modify: root `Makefile` (`lint-tools`, `test-tools`, wired into `lint`/`test`), `.github/workflows/pr.yml` (`tools` job: `uv sync --locked`, ruff, mypy, pytest in `tools/migrate-legacy`)

**Interfaces:**
- `convert_lesson(index_html: Path, legacy_root: Path) -> tuple[dict, Report]` — returns the import document (exact `LessonImport` shape from Task 3) and `Report(page: str, status: Literal["converted","needs-review","unsupported"], notes: list[str])`.
- `html_to_prose(element) -> dict` (a `doc`) and `inline_nodes(element) -> list[dict]`.
- CLI: `migrate-legacy convert PATH [PATH…] --out DIR [--report FILE]` — `PATH` is a lesson directory containing `index.html`; writes `DIR/<lesson-slug>.json` per lesson and a JSON array report.

Mapping rules (the "paged lesson" pattern, ~95 legacy pages):
- Subject: parent directory name → title by replacing `_` with space (`Radiation_Biology` → "Radiation Biology"), slug = lower-kebab. Lesson: directory name → slug lower-kebab (`RBE_and_OER` → `rbe-and-oer`, `em_spectrum` → `em-spectrum`); title = text of the first `h1` inside `.container` (fallback: `<title>`).
- Pages: each `div.lesson-page` in document order; page title = its first `h3` text with a leading `Page N:` prefix removed (regex `^Page\s+\d+:\s*`).
- Blocks: walk the page's direct children after the `h3`, accumulating consecutive rich-text elements into **one** `rich_text` block until a `div.interactive-question-block` is met, which becomes a `knowledge_check` block (then a new rich-text accumulator starts). An `h4` whose text is `Quick Check!` (case-insensitive, trailing punctuation ignored) is dropped. `button.check-page-answers` is dropped.
- Rich text element → prose blocks: `p` → `paragraph`; `div.key-principle` → `callout(kind=key-principle)` containing its children mapped recursively (a `div.key-principle` with only text becomes one paragraph); `div.clinical-note` → `clinical-note`; `div.warning` → `warning`; `h2/h3/h4` (outside the page title) → `heading` level 2/3/4; `ul`/`ol` → lists with `li` → `listItem(paragraph(inline))`; `table` → `table` (`th` → `tableCell` with `attrs.header: true`); `blockquote` → `blockquote`; `img` → **unsupported** (note `img without media asset`, dropped); anything else → note `unsupported element <tag> on page N` and map its text as a paragraph.
- Inline: text nodes → `text` (collapse whitespace runs to one space, drop empty; HTML entities are decoded by BeautifulSoup); `strong`/`b` → `bold`; `em`/`i` → `italic`; `u` → `underline`; `code` → `code`; `sub` → `subscript`; `sup` → `superscript`; `span.highlight` → `bold` (note `highlight→bold`, status stays `converted`); `a[href]` with `https://` → `link`, otherwise plain text with note `dropped non-https link`; `br` → `hardBreak`; other inline tags → their children (note).
- Knowledge check: `key` = the radio `name`; options = label texts in order (with the `<input>` removed, whitespace collapsed); `answer` = index of the label whose `input[value]` equals `lessonCorrectAnswers[key]` parsed from the inline `<script>` via regex `const lessonCorrectAnswers = (\{.*?\});` + `json.loads`; if the key is missing from the map or the value matches no option → status `needs-review`, note `no correct answer for <key>`, and `answer` defaults to `0`; stem = `p.question-text` → one-paragraph doc; explanation = `div.explanation` text with a leading `^[A-Z]\.\s*` removed → one-paragraph doc (or `null` if absent).
- Status: `unsupported` if no `div.lesson-page` exists (not this pattern); `needs-review` if any note is prefixed `unsupported element` or `no correct answer`; otherwise `converted`.

- [ ] **Step 1: Unit tests for the inline/block mapper** — `tests/test_html2prose.py` (BeautifulSoup fragments → expected prose, including: paragraph with `strong`/`em`/`sub`/`sup`/`span.highlight`, `br` → hardBreak, whitespace collapsing, `key-principle` → callout, `ul` → bulletList, `table` with `th`, `a[href=http://]` dropped to text, unknown `<marquee>` noted). Then `tests/test_convert.py`:
```python
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from migrate_legacy.convert import convert_lesson

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures"
SCHEMA = json.loads((HERE.parents[2] / "packages/schemas/prose-doc.schema.json").read_text())
CASES = [("Radiation_Biology/RBE_and_OER", "rbe-and-oer"), ("Radiation_Physics/em_spectrum", "em-spectrum")]


@pytest.mark.parametrize(("rel", "slug"), CASES)
def test_golden(rel: str, slug: str) -> None:
    doc, report = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    expected = json.loads((HERE / "golden" / f"{slug}.json").read_text())
    assert doc == expected
    assert report.status == "converted", report.notes


@pytest.mark.parametrize(("rel", "slug"), CASES)
def test_every_prose_doc_validates(rel: str, slug: str) -> None:
    doc, _ = convert_lesson(FIXTURES / rel / "index.html", FIXTURES)
    v = Draft202012Validator(SCHEMA)
    for page in doc["lesson"]["pages"]:
        for block in page["blocks"]:
            for prose in ([block["body"]] if block["type"] == "rich_text" else [block["stem"], block["explanation"]]):
                if prose is not None:
                    v.validate(prose)


def test_rbe_specifics() -> None:
    doc, _ = convert_lesson(FIXTURES / "Radiation_Biology/RBE_and_OER/index.html", FIXTURES)
    assert doc["subject"] == {"slug": "radiation-biology", "title": "Radiation Biology", "order": 0}
    assert doc["lesson"]["slug"] == "rbe-and-oer" and doc["lesson"]["title"] == "RBE and OER"
    assert [p["title"] for p in doc["lesson"]["pages"]][:2] == ["Not All Radiation Damages Equally", "Relative Biologic Effectiveness (RBE)"]
    checks = [b for p in doc["lesson"]["pages"] for b in p["blocks"] if b["type"] == "knowledge_check"]
    assert [(c["key"], c["answer"]) for c in checks] == [("lq_page2_1", 1), ("lq_page5_1", 0)]
    assert checks[0]["options"] == ["RBE keeps increasing without limit", "RBE actually decreases past that point"]
    assert checks[0]["explanation"]["content"][0]["content"][0]["text"].startswith("Past the optimal LET")


def test_not_a_paged_lesson_is_unsupported(tmp_path: Path) -> None:
    (tmp_path / "X").mkdir()
    (tmp_path / "X/index.html").write_text("<html><body><h1>Quiz</h1></body></html>")
    doc, report = convert_lesson(tmp_path / "X/index.html", tmp_path)
    assert report.status == "unsupported" and doc == {}
```
Golden files are produced by the first correct run (`migrate-legacy convert … --out tests/golden`), then **hand-checked** against the HTML (page count 7 and 11, every paragraph present, both knowledge checks) before committing — a golden test is only as good as that check; record what was checked in the report file.

- [ ] **Step 2: Implement** `html2prose.py`, `convert.py`, `cli.py` (argparse; `[project.scripts] migrate-legacy = "migrate_legacy.cli:main"`). Keep functions pure (`convert_lesson` does the file I/O only at the top). `mypy --strict`.

- [ ] **Step 3: Generate the seed lessons** — from the repo root: `cd tools/migrate-legacy && uv run migrate-legacy convert ../../../rtt_e_workbook/Radiation_Biology/RBE_and_OER ../../../rtt_e_workbook/Radiation_Physics/em_spectrum --out ../../apps/api/seed/lessons --report /tmp/report.json` (adjust the relative path to the legacy checkout on this machine: `/Users/christopherguzman/Desktop/coding_projects/rt-app/rtt_e_workbook`). Both statuses must be `converted`. `git diff --no-index tests/golden apps/api/seed/lessons` must be empty (same converter, same input). Then round-trip through the API importer test: add to `apps/api/tests/test_importer.py`:
```python
@pytest.mark.parametrize("path", sorted((Path(__file__).parents[1] / "seed/lessons").glob("*.json")))
async def test_seed_lessons_import_and_publish(db: AsyncSession, path: Path) -> None:
    lesson = await import_lesson(db, LessonImport.model_validate(json.loads(path.read_text())))
    assert lesson.status == "published" and len(lesson.pages) >= 7
```

- [ ] **Step 4: Makefile + CI**, run `uv run pytest -q`, ruff, mypy in the tool; commit: `feat(tools): migrate-legacy converts paged workbook lessons to import JSON` (+ `chore(seed): RBE and OER, EM spectrum lessons from the legacy workbook` for the JSON if you prefer two commits).

---

### Task 7: Seed command, `make seed`, coverage gate

**Files:**
- Create: `apps/api/app/seed.py`, `apps/api/tests/test_seed.py`
- Modify: `Makefile` (`seed` target, add to `.PHONY`), `apps/api/pyproject.toml` (dev `pytest-cov>=6`; `[tool.pytest.ini_options] addopts = "--cov=app/grading --cov=app/auth --cov-report=term-missing --cov-fail-under=70"`), `.github/workflows/pr.yml` (nothing else needed — the addopts apply), `docs/05-setup.md` (seed accounts; done in Task 12 with the rest)

**Interfaces:**
- `async def seed(db: AsyncSession, settings: Settings) -> SeedSummary` (idempotent: get-or-create users by email, `import_lesson` for every `apps/api/seed/lessons/*.json`); `python -m app.seed` runs it with `load_settings()` and prints the summary; raises `RuntimeError("refusing to seed a prod environment")` when `settings.env == "prod"`.
- Accounts: exactly the three in Global Constraints; roles admin/educator/student; password `rtapps-dev-password` hashed with `hash_password`.

- [ ] **Step 1: Failing tests** — `tests/test_seed.py`:
```python
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import Settings
from app.content.models import Lesson
from app.seed import seed
from tests.conftest import TEST_DATABASE_URL


async def test_seed_is_idempotent(db: AsyncSession, settings: Settings) -> None:
    first = await seed(db, settings)
    second = await seed(db, settings)
    assert first.users_created == 3 and second.users_created == 0
    assert (await db.scalar(select(func.count()).select_from(User))) == 3
    lessons = (await db.scalars(select(Lesson))).all()
    assert {l.slug for l in lessons} == {"rbe-and-oer", "em-spectrum"} and all(l.status == "published" for l in lessons)


async def test_seed_users_can_log_in(client: AsyncClient, db: AsyncSession, settings: Settings) -> None:
    await seed(db, settings)
    r = await client.post("/api/v1/auth/login", json={"email": "educator@rtapps.local", "password": "rtapps-dev-password"})
    assert r.status_code == 200 and r.json()["role"] == "educator"


async def test_seed_refuses_prod(db: AsyncSession) -> None:
    prod = Settings(database_url=TEST_DATABASE_URL, env="prod", session_secret="x" * 40, public_origin="https://test")
    with pytest.raises(RuntimeError, match="prod"):
        await seed(db, prod)
```

- [ ] **Step 2: Implement** `app/seed.py` (`SeedSummary` dataclass with `users_created`, `lessons_imported`; `SEED_PASSWORD = "rtapps-dev-password"`; `SEED_USERS = [("admin@rtapps.local", "Admin", UserRole.admin), ("educator@rtapps.local", "Educator", UserRole.educator), ("student@rtapps.local", "Student", UserRole.student)]`; `LESSON_DIR = Path(__file__).resolve().parents[1] / "seed/lessons"`; `main()` mirrors the importer's `_run`). Makefile:
```make
seed:
	$(COMPOSE) exec api uv run python -m app.seed
```
Add `seed/` to the api Dockerfile `COPY` list (the prod image runs `alembic upgrade`, not seed, but the dev container bind-mounts the source anyway; keep the image copy so `docker run rtapps-api python -m app.seed` works in the e2e job).

- [ ] **Step 3: Coverage gate** — add `pytest-cov` + `addopts`; run `uv run pytest -q` → shows coverage ≥ 70 % for `app/grading` and `app/auth` (expect ~95 %). Commit: `feat(api): seed command with dev accounts and migrated lessons; coverage gate on grading and auth`.

---

### Task 8: `@rtapps/api-client`, contract CI job, remove scaffold examples (#10, #13)

**Files:**
- Create: `apps/api/app/openapi_export.py`, `packages/api-client/package.json`, `packages/api-client/openapi.json`, `packages/api-client/src/schema.d.ts` (generated), `packages/api-client/src/index.ts`, `packages/api-client/README.md`
- Modify: `Makefile` (`client` target), `.github/workflows/pr.yml` (`contract` job), `apps/web/package.json` (dependency `"@rtapps/api-client": "workspace:*"`, devDependency `"@rtapps/schemas": "workspace:*"`; remove the `client` script if present), `apps/web/src/lib/vitest-examples/` (delete all four files — the browser project stays for Task 9's component tests), `apps/web/vite.config.ts` (unchanged)

**Interfaces:**
- `python -m app.openapi_export` prints `create_app(Settings(env="test", database_url="postgresql+asyncpg://x:x@localhost/x")).openapi()` as JSON with sorted keys and a trailing newline — deterministic, no DB access.
- `createApi(fetchImpl?: typeof fetch)` → `openapi-fetch` client with `baseUrl: '/api/v1'`, `credentials: 'same-origin'`; `export type { paths, components } from './schema'`.

- [ ] **Step 1** `app/openapi_export.py`:
```python
import json
import sys

from app.config import Settings
from app.main import create_app


def main() -> None:
    settings = Settings(env="test", database_url="postgresql+asyncpg://x:x@localhost/x")
    json.dump(create_app(settings).openapi(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
```
`packages/api-client/package.json`:
```json
{
  "name": "@rtapps/api-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "generate": "openapi-typescript openapi.json -o src/schema.d.ts" },
  "dependencies": { "openapi-fetch": "^0.14.0" },
  "devDependencies": { "openapi-typescript": "^7.9.0", "typescript": "^6.0.3" }
}
```
`src/index.ts`:
```ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';

export type { components, paths } from './schema';

/** Browser-side client for the RTApps API on the current origin (session cookie is sent automatically). */
export function createApi(fetchImpl?: typeof fetch) {
	return createClient<paths>({ baseUrl: '/api/v1', credentials: 'same-origin', fetch: fetchImpl });
}
```
Makefile:
```make
client:
	cd apps/api && uv run python -m app.openapi_export > ../../packages/api-client/openapi.json
	pnpm --filter @rtapps/api-client generate
	pnpm --filter web exec prettier --write ../../packages/api-client/src/schema.d.ts
```
(Prettier formatting keeps the generated file stable under the repo's formatter; if `openapi-typescript` output is already stable, drop the prettier line.) Run `pnpm install` then `make client`; commit `openapi.json` + `schema.d.ts`.

- [ ] **Step 2: CI `contract` job** in `pr.yml`:
```yaml
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@v7
        with: { enable-cache: true }
      - uses: actions/setup-node@v7
        with: { node-version: 24 }
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: cd apps/api && uv sync --locked
      - run: make client
      - run: git diff --exit-code -- packages/api-client
```
Add a test `apps/api/tests/test_openapi_export.py` that runs `main()` with stdout captured and asserts the output parses and contains `"/api/v1/lessons/{slug}"`.

- [ ] **Step 3: #13** — `git rm -r apps/web/src/lib/vitest-examples`; `pnpm --filter web test` still runs both projects (the browser project now has zero tests until Task 9 — vitest exits 0 with `passWithNoTests`? It does not by default: add `"passWithNoTests": true` to the browser project config, or land Task 9's first component test in this task; **prefer** landing the smoke test `apps/web/src/lib/prose/ProseDoc.svelte.spec.ts` in Task 9 and merge this task's deletion with a one-line placeholder test only if CI fails).

- [ ] **Step 4:** `pnpm --filter web lint && check && test`; commit: `feat(client): generated @rtapps/api-client with contract check in CI; remove scaffold example tests`.

---

### Task 9: Web — `ProseNode` renderer (no `{@html}`) with schema-fixture tests

**Files:**
- Create: `apps/web/src/lib/prose/types.ts`, `ProseDoc.svelte`, `ProseNode.svelte`, `ProseInline.svelte`, `prose.css` (imported by `ProseDoc`), `ProseDoc.svelte.spec.ts` (browser project), `schema.test.ts` (server project; `ajv`)
- Modify: `apps/web/package.json` (devDependency `ajv ^8.17`; `ajv-formats ^3` for `format: uuid`)

**Interfaces:**
- `types.ts`: `ProseDoc`, `ProseBlock`, `ProseInline`, `ProseMark` TS unions mirroring the schema (hand-written; the ajv test guarantees the fixtures match the JSON Schema, the component test guarantees the renderer accepts the same fixtures).
- `<ProseDoc doc={doc} images={Record<string,string>} />` renders `<div class="prose">…</div>`; unknown node or mark type → `throw new Error(\`Unknown prose node: ${type}\`)`.
- Rendering table: paragraph→`<p>`, heading→`<h2|h3|h4>`, bulletList→`<ul>`, orderedList→`<ol>`, listItem→`<li>`, blockquote→`<blockquote>`, table→`<table><tbody>` rows/`<td>`/`<th>`, image→`<figure><img src={images[id] ?? ''} alt></figure>` (an image with no URL renders `<img alt>` with an empty `src` attribute omitted — use `{#if src}`), callout→`<aside class="callout callout-{kind}">`, math→`<code class="math">{src}</code>` (KaTeX rendering is Phase 3, documented in `README`/docs), hardBreak→`<br>`, text→text with marks nested: bold→`<strong>`, italic→`<em>`, underline→`<u>`, code→`<code>`, subscript→`<sub>`, superscript→`<sup>`, link→`<a href rel="noopener noreferrer" target="_blank">` **only if** `href` matches `^https://` (else render plain text).

- [ ] **Step 1: Failing tests**

`schema.test.ts` (server project):
```ts
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@rtapps/schemas/prose-doc.schema.json';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';

const ajv = new Ajv2020({ allErrors: false, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('prose-doc schema fixtures', () => {
	for (const [name, doc] of Object.entries(fixtures.valid)) {
		it(`valid: ${name}`, () => expect(validate(doc), JSON.stringify(validate.errors)).toBe(true));
	}
	for (const [name, doc] of Object.entries(fixtures.invalid)) {
		it(`invalid: ${name}`, () => expect(validate(doc)).toBe(false));
	}
});
```
`ProseDoc.svelte.spec.ts` (browser project):
```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';
import ProseDoc from './ProseDoc.svelte';
import type { ProseDoc as Doc } from './types';

describe('ProseDoc', () => {
	it('renders every valid fixture without throwing', () => {
		for (const doc of Object.values(fixtures.valid)) render(ProseDoc, { doc: doc as Doc });
	});

	it('renders marks as real elements and https links only', async () => {
		render(ProseDoc, { doc: fixtures.valid.paragraph_with_marks as Doc });
		await expect.element(page.getByText('rises')).toBeInTheDocument();
		const strong = page.getByText('rises');
		await expect.element(strong).toHaveProperty('tagName', 'STRONG');
		const link = page.getByRole('link', { name: 'source' });
		await expect.element(link).toHaveAttribute('href', 'https://example.org/rbe');
		await expect.element(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('renders callout, table header and heading levels', async () => {
		render(ProseDoc, { doc: fixtures.valid.callout_image_math as Doc });
		await expect.element(page.getByText('OER = 3.0')).toBeInTheDocument();
		render(ProseDoc, { doc: fixtures.valid.table as Doc });
		await expect.element(page.getByRole('columnheader', { name: 'Part' })).toBeInTheDocument();
		render(ProseDoc, { doc: fixtures.valid.heading_levels as Doc });
		await expect.element(page.getByRole('heading', { level: 4, name: 'H4' })).toBeInTheDocument();
	});

	it('throws on an unknown node type', () => {
		const bad = { type: 'doc', content: [{ type: 'iframe' }] } as unknown as Doc;
		expect(() => render(ProseDoc, { doc: bad })).toThrow(/Unknown prose node: iframe/);
	});

	it('never injects HTML from text', async () => {
		const doc: Doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] }] };
		render(ProseDoc, { doc });
		await expect.element(page.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
```
`pnpm --filter web test` → FAIL (missing modules). If `toHaveProperty('tagName', …)` is not supported by the browser matchers, replace with `expect((await strong.element()).tagName).toBe('STRONG')`.

- [ ] **Step 2: Implement** the three components. `ProseNode.svelte` (Svelte 5, runes) switches on `node.type` with `{#if}` chains and recurses via `<ProseNode>` (self-import) for block children and `<ProseInline>` for inline content; `ProseInline.svelte` renders a text node by peeling marks recursively: `{#if marks.length === 0}{text}{:else}` wrap the first mark's element around `<ProseInline text marks={marks.slice(1)} />`; the `default` branch of each switch throws. `prose.css`: readable measure (`max-width: 65ch`), callout kinds with a left border colour per kind, table borders, `code.math` monospace.

- [ ] **Step 3:** `pnpm --filter web test && lint && check` clean (ESLint's `svelte/no-at-html-tags` proves the invariant); commit: `feat(web): ProseNode renderer for the closed prose schema with fixture-driven tests`.

---

### Task 10: Web — subjects, lesson player, knowledge checks, results

**Files:**
- Create: `apps/web/src/lib/lesson/api.ts` (`export const api = createApi()` from `@rtapps/api-client`, browser-only module), `LessonPager.svelte`, `KnowledgeCheck.svelte`, `apps/web/src/routes/(app)/subjects/+page.server.ts`, `+page.svelte`, `(app)/subjects/[slug]/+page.server.ts`, `+page.svelte`, `(app)/lessons/[slug]/+page.server.ts`, `+page.svelte`, `(app)/home/+page.server.ts`
- Modify: `(app)/home/+page.svelte` (results table + "Browse subjects" link), `+layout.svelte` nav (add "Subjects" link when signed in)

**Interfaces:**
- `(app)/lessons/[slug]/+page.server.ts` `load`: `GET /lessons/{slug}` (404 → `error(404, 'Lesson not found')`), then `POST /activities/{activity_id}/attempts` via `apiFetch(event, …, {method: 'POST'})`; returns `{ lesson: LessonOut, attempt: AttemptOut }` typed from `components['schemas']`.
- `LessonPager` props `{ lesson, attempt }`: `$state` page index; renders the current page's blocks (`rich_text` → `<ProseDoc>`, `knowledge_check` → `<KnowledgeCheck block attemptId onGraded>`); Previous/Next buttons; "Page N of M"; on the last page a **Finish lesson** button that calls `api.POST('/attempts/{attempt_id}/submit', { params: { path: { attempt_id } }, headers: { 'Idempotency-Key': key } })` where `key` is `crypto.randomUUID()` created once per pager instance (`$state`) so a retry reuses it; then shows `Score: {score} / {max_score} ({percent}%) — Passed|Not passed` and a link to `/home`. Answered state per key kept in a `$state` map so navigating back keeps the shown result.
- `KnowledgeCheck` props `{ block, attemptId, onGraded(key, result) }`: radio group (`name=block.key`, `fieldset`/`legend` from the stem rendered with `<ProseDoc>`), **Check answer** button disabled until a choice is made; calls `api.POST('/attempts/{attempt_id}/items', { body: { item_key, response: { choice } } })`; shows "Correct" / "Not quite" with `aria-live="polite"` and the explanation via `<ProseDoc>` when present; after grading the radios stay enabled (re-answer allowed: last write wins) — the button label becomes "Check again". Network/API error → inline message from `problemMessage`-style handling (`error.title ?? 'Request failed'`).
- `/home` load: `GET /me/results` → table (lesson title, score, percent, passed, date). Empty state text: "No results yet — pick a subject to start."
- `/subjects` and `/subjects/[slug]`: plain lists of links.

- [ ] **Step 1: Unit tests (server project)** for a tiny pure helper you extract: `src/lib/lesson/score.ts` `formatScore({score, max_score, percent, passed}) → "1 / 2 (50%) — Not passed"` with 3 cases. Component tests (browser project) for `KnowledgeCheck.svelte`: render with a fake `api` injected via a prop `post = api.POST` default — assert the button is disabled until a radio is chosen, that choosing + clicking calls `post` with `{ item_key, response: { choice: 1 } }`, and that "Correct" and the explanation appear when the fake resolves `{ data: { correct: true, explanation: doc } }`.

- [ ] **Step 2: Implement** the routes and components (minimal in-component styles; labels and `aria-*` as in Task 8 of plan 1b). Typing: `import type { components } from '@rtapps/api-client'; type LessonOut = components['schemas']['LessonOut'];`.

- [ ] **Step 3: Manual verification via `make dev` + `make seed`** (record in the report): sign in as `student@rtapps.local` → Subjects shows "Radiation Biology" and "Radiation Physics" → RBE and OER → 7 pages → page 2 knowledge check: choose the second option → "Correct" + explanation → Finish on page 7 → "Score: 1 / 2 (50%) — Not passed" → Home lists the result. Reload the lesson: a new attempt starts (expected in 1c; resuming in-progress attempts is Phase 3).

- [ ] **Step 4:** `pnpm --filter web lint && check && test`; commit: `feat(web): subject and lesson pages with graded knowledge checks and results`.

---

### Task 11: Playwright e2e against the compose stack + CI `e2e` job (#11)

**Files:**
- Modify: `apps/web/playwright.config.ts`, `apps/web/package.json` (`"e2e": "playwright test"`), `.github/workflows/pr.yml` (`e2e` job), `infra/compose.yaml` (add a `healthcheck` to `web`: `curl -fsS http://localhost:5173/health` with `start_period: 120s`, `interval: 10s`, `retries: 30`; image `node:24-bookworm-slim` has `curl`? if not use `wget -qO- …` or `node -e "fetch('http://localhost:5173/health').then(r=>process.exit(r.ok?0:1))"`)
- Create: `apps/web/e2e/lesson.e2e.ts`

**Interfaces:**
- `playwright.config.ts`: `testDir: 'e2e'`, `testMatch: '**/*.e2e.ts'`, `use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080', trace: 'retain-on-failure' }`, no `webServer`, `reporter: [['list'], ['html', { open: 'never' }]]`.
- The flow (one test, ~40 lines): register a unique email (`e2e-${Date.now()}@example.edu`, password `password-1234`, display name "E2E Student") → expect `/home` → click "Subjects" → "Radiation Biology" → "RBE and OER" → click Next until the "Quick Check" radios are visible (page 2) → choose "RBE actually decreases past that point" → "Check answer" → expect text "Correct" → Next ×5 → "Finish lesson" → expect "Score: 1 / 2" → go to `/home` → expect a row containing "RBE and OER" and "50%".

- [ ] **Step 1:** Write the test and config; run locally: `make dev` (background) → `make seed` → `pnpm --filter web exec playwright install chromium` (once) → `pnpm --filter web e2e` → green. `make down`.

- [ ] **Step 2: CI job**:
```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24 }
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web exec playwright install --with-deps chromium
      - run: cp infra/.env.example .env
      - run: docker compose -f infra/compose.yaml --env-file .env up -d --build --wait --wait-timeout 600
      - run: docker compose -f infra/compose.yaml --env-file .env exec -T api uv run python -m app.seed
      - run: pnpm --filter web e2e
      - if: failure()
        run: docker compose -f infra/compose.yaml --env-file .env logs --no-color | tail -n 300
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: apps/web/playwright-report, retention-days: 7 }
      - if: always()
        run: docker compose -f infra/compose.yaml --env-file .env down -v
```
`--wait` needs every service to have a healthcheck or to be `service_started`-only; give `web` the healthcheck above and confirm `proxy` and `mailpit` either have one or that `--wait` treats them as started (Compose v2.20+ waits for `healthy` where defined, `running` otherwise). The `web` container's `pnpm install` on first start is the slow step (~2–3 min in CI); the 600 s wait covers it.

- [ ] **Step 3:** Push; watch the job; iterate until green. Commit: `test(e2e): register → lesson → answer → score flow against the compose stack; CI e2e job`.

---

### Task 12: Docs, PR, review, merge, tag `v0.1.0`

- [ ] `docs/03-architecture.md`: §6.2 — `content_version` keyed by `activity_id` + `version` (replace the `entity_type/entity_id` wording); note that 1c implements `rich_text` + `knowledge_check` blocks and `single_choice` questions, status/kind columns are text + CHECK constraints; §7 — mark implemented endpoints (`subjects`, `lessons/{slug}`, `activities/{id}/attempts`, `attempts/{id}/items`, `attempts/{id}/submit`, `me/results`); §5 — `math` renders as source until Phase 3 (KaTeX); §11 — contract and e2e jobs exist. Run the mermaid check if any diagram is touched.
- [ ] `docs/05-setup.md`: `make seed` + the three seed accounts; `make e2e` prerequisites (`playwright install chromium`, stack running, seeded); `make client` and what the contract job enforces; `tools/migrate-legacy` usage (one command example with the legacy checkout path).
- [ ] `docs/04-conventions.md` §9 cheat-sheet: mark `seed`, `client`, `e2e` as real; add `test-tools`/`lint-tools`.
- [ ] Traceability: `docs/02-requirements.md` — tick the FRs covered (lesson reading, knowledge checks, results) if the matrix has status cells; otherwise leave.
- [ ] Push `feat/lessons`; `gh pr create --title "Lessons and knowledge checks: content pipeline, grading, seed, api-client, e2e, migration tool"` with the PR template filled (list the manual verification from Task 10 and the e2e run). CI green (api with coverage gate, web, tools, contract, images, e2e).
- [ ] Whole-branch review: a targeted manual pass over `snapshot.py` / `strip_answers` (no key leakage), `attempts/router.py` (ownership, idempotency, status transitions), `importer.py` (re-import deletes only its own questions), `html2prose.py` (no raw HTML passes through), and the e2e job — rather than a whole-diff agent review (see memory: the last one was stopped for cost). Fix findings, re-run CI.
- [ ] `gh pr merge --squash --delete-branch`; `git tag -a v0.1.0 -m "M1: first version with tests and CI — lessons, knowledge checks, attempts"`; push the tag; close #10 #11 #12 #13 (PR body: `Closes #10, closes #11, closes #12, closes #13`).

---

## Self-review

- **Spec coverage.** Roadmap Phase 1 deliverables: Alembic baseline with the model (Tasks 2, 5 — scoped to what 1c uses; cohorts/media/outcomes/rollup come with their plans), ProseNode renderer (9), paged-lesson UI (10), knowledge-check grading → `attempt`/`attempt_item` (5), seed incl. 2 migrated lessons via `tools/migrate-legacy` from `RBE_and_OER` and `em_spectrum` (6, 7), `pr.yml` covering it all (6, 7, 8, 11), ≥1 Playwright flow (11), coverage gate 70 % on grading + auth (7), `packages/api-client` + contract job (#10, Task 8), `make seed` (#12, Task 7), #13 (Task 8), e2e config (#11, Task 11). ADR-0003: closed schema + four consumers — editor consumer is Phase 3, the other three are Tasks 1/6/9; snapshots + `strip_answers` + version pinning (3, 4, 5). ADR-0004: server-side grading, `Idempotency-Key` semantics, ownership (5); `activity_result` rollup is plan 2 per the ADR follow-ups.
- **Deviations to confirm with the owner (stated in the summary, not blocking):** `content_version.activity_id` instead of `entity_type/entity_id`; text + CHECK instead of Postgres enums for new status/kind columns; `math` node rendered as source until Phase 3; `tableCell.attrs.header` instead of a `tableHeader` node (TipTap mapping in Phase 3).
- **Placeholders:** none — every code step has the code or an exact rendering/mapping table; Task 6's golden files are generated by the tool and hand-checked (stated).
- **Type consistency:** `LessonImport` / `import_lesson(db, doc, *, publish, author)` used identically in Tasks 3, 4 (`seed_lesson`), 6, 7; `knowledge_checks(snapshot)` in 3 and 5; `strip_answers` in 3 and 4; `GradeResult(correct, score, max_score)` in 5; `AttemptOut` fields match `ResultOut`/web usage in 10; `createApi()` in 8 and 10; fixture file shape `{valid, invalid}` in 1 and 9.
