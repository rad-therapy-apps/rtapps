"""Content package: curriculum authoring, publishing and the student-facing read API.

What this file does: marks `app.content` as a package. Empty on purpose — nothing is
re-exported here, so callers import from the submodules directly (`app.content.models`,
`app.content.service`, etc.).

How it fits the project: this package holds the working-copy tables (subject, lesson,
lesson_page, question, content_block, activity), the publish step that freezes a working
copy into an immutable `content_version` snapshot, and the router that serves published
snapshots with answer keys stripped. See ADR-0003 in `docs/adr/` for the full design.

Used by: `app.main` mounts `app.content.router`; `app.attempts.router` reads
`app.content.models`/`app.content.snapshot` to grade against a pinned snapshot.
"""
