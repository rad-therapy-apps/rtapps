"""Attempts package: recording and grading a student's run at a published activity.

What this file does: marks `app.attempts` as a package. Empty on purpose — nothing is
re-exported here, so callers import from the submodules directly (`app.attempts.models`,
`app.attempts.router`, etc.).

How it fits the project: an `attempt` pins the `content_version` a student is answering
against, so grading and historical scores are stable even after the author edits or
republishes the lesson. See ADR-0004 in `docs/adr/` for the full design.

Used by: `app.main` mounts `app.attempts.router`.
"""
