"""Audit package: the append-only `audit_log` table and the one helper that writes it.

What this file does: marks `app.audit` as a package. Empty on purpose — nothing is re-exported;
import the submodules directly: `models` (`AuditLog`), `service` (`record_audit`, `client_ip`).
Used here and why: an explicit package (not a namespace package) so tooling (mypy, pytest, ruff)
resolves `app.audit.*` reliably and the package docstring documents the module map. How it fits
the project: FR-E-10 / FR-M-01 (plan 2): every educator read of student data and every admin
mutation is recorded with actor, target, cohort, request id and ip. Works with: Depends on:
`app.auth.models.User` (actor), `app.db.Base`. Used by: `app.cohorts.router`,
`app.analytics.router`, `app.admin.router`, `tests/test_audit.py`.
"""
