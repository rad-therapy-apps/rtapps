# RTApps — Engineering Conventions

Status: draft (Phase 0). Finalised with the first deployment in Phase 2. These are the rules everyone working in this repository follows; where a rule is enforced by tooling, the tool is named.

## 1. Repository and branches

- One monorepo: `rad-therapy-apps/rtapps`. Legacy repositories are read-only references and are never edited.
- `main` is always deployable. It is protected: pull request required, CI (`pr.yml`) required, no force-push, linear history (squash merge).
- Branch names: `<type>/<short-kebab-summary>` — `feat/lesson-renderer`, `fix/attempt-idempotency`, `docs/adr-0006`, `chore/bump-sveltekit`, `infra/backup-cron`.
- One pull request per logical change. Small is good; a PR that touches `apps/api` and `apps/web` together is fine when the change is one feature (that is the point of the monorepo).
- Every PR description states *what* and *why*, links the issue, and lists how it was tested. The PR template enforces the headings.

## 2. Commits

- Conventional Commits: `feat(api): grade numeric-tolerance questions`, `fix(web): keep lesson page on reload`, `docs: ADR-0003`, `chore(deps): …`, `test(api): permission matrix`, `infra: …`.
- Scope is the app or package name (`api`, `web`, `schemas`, `sdk`, `migrate`, `infra`).
- Commit messages explain intent; the diff explains the mechanics.

## 3. Code standards

| Area | Tooling (enforced in CI) | Rules |
|---|---|---|
| Python (`apps/api`, `tools/`) | `ruff` (lint + format), `mypy --strict` on `app/` | Python 3.12; type hints everywhere; async SQLAlchemy sessions; Pydantic models at the API boundary only; no business logic in route functions (routes call services) |
| TypeScript (`apps/web`, `packages/`) | `eslint`, `prettier`, `svelte-check` | `strict` TS; no `any` without a comment; no `{@html}` anywhere in `apps/web` (lint rule) |
| SQL / migrations | Alembic, one migration per PR that changes the model, autogenerate then hand-review | Never edit a merged migration; write a new one |
| JSON Schemas (`packages/schemas`) | `ajv` + `jsonschema` tests with shared fixtures | The schema is the contract; change it first, then editor, validator, renderer |
| API contract | `openapi.json` exported in CI; `packages/api-client` regenerated; diff must be empty | Never hand-edit the generated client |
| Secrets | GitHub push protection; `.env*` git-ignored; `.env.example` documents every variable | A secret in a PR is a blocking review comment and a rotation |

Formatting is never discussed in review — the formatters decide.

## 4. Testing rules

- Every bug fix comes with a test that fails before the fix.
- Grading functions and auth have a 70 % coverage gate from day one (`pytest --cov`); the number only goes up.
- API tests run against a real PostgreSQL (service container in CI, compose locally) inside a transaction rolled back per test — no mocks of the database.
- One Playwright flow per user-facing feature, kept short; the full e2e suite runs on every PR.
- Test names say what is asserted: `test_student_cannot_read_other_cohort_overview`.

## 5. Adding a content type (the recipe)

1. **Schema** — add the `body` JSON Schema for the new question/activity type in `packages/schemas/` with valid and invalid fixtures.
2. **Model + migration** — add the table (or JSONB shape) in `apps/api/app/content/models.py`; Alembic migration.
3. **Grading** — `apps/api/app/grading/<type>.py`, pure function, property tests.
4. **API** — authoring endpoints (create/update), snapshot inclusion in `publish`, answer-stripping in the published read path.
5. **Renderer** — `apps/web/src/lib/activities/<Type>.svelte` consuming the snapshot; unit test that it emits the right `response` shape.
6. **Builder** — the authoring form in `(author)` routes.
7. **Migration** — if the legacy workbook has this pattern, a mapper in `tools/migrate-legacy` with a golden-file test.
8. **Docs** — one paragraph in `03-architecture.md` §6.2 and a line in the requirements traceability matrix.

## 6. Reviews

- Solo-developer reality: most PRs are self-merged after CI is green. The discipline that replaces a second reviewer is: write the PR description as if for a reviewer, wait for CI, re-read the diff on GitHub (not in the editor) before merging.
- Anything touching auth, permissions, grading, or migrations gets a second look the next day before merge, or a mentor/peer review when available.

## 7. Versioning and releases

- Semantic version tags on `main`: `v0.1.0` = first version with tests and CI (milestone M1), `v0.2.0` = vertical slice deployed (milestone M2).
- Images are tagged with the commit SHA and the version tag; `latest` is convenience only and never used by `compose.prod.yaml`.
- `CHANGELOG.md` is generated from Conventional Commits at tag time.

## 8. Documentation

- `docs/` is part of the product. A change in behaviour updates the relevant doc in the same PR.
- Decisions with alternatives get an ADR (`docs/adr/NNNN-title.md`, MADR format). Superseded ADRs are marked, never deleted.
- Diagrams are Mermaid in Markdown so they render on GitHub and diff in PRs.

## 9. Local workflow cheat-sheet

```bash
make dev        # docker compose up --build   → http://localhost:8080
make seed       # demo users, cohort, one subject with content
make test       # api + web unit tests
make e2e        # playwright against the compose stack
make lint       # ruff, mypy, eslint, svelte-check
make client     # regenerate packages/api-client from the running API
make prod-config # validate infra/compose.prod.yaml (+ tunnel overlay) against the env template
make migrate m="add data_table"   # alembic revision --autogenerate
```
(All targets exist as of v0.1.0; `make test-tools` / `make lint-tools` cover `tools/migrate-legacy`. The coverage threshold applies to full-suite runs only — `pytest tests/test_x.py` never fails on coverage.)
