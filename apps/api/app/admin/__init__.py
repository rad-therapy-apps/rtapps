"""Admin package: user management and the audit-log view for the `admin` role.

What this file does: marks `app.admin` as a package. Empty on purpose — nothing is re-exported;
import the submodules directly: `schemas` (paged users, role change, audit rows), `router` (`GET
/admin/users`, `PATCH /admin/users/{id}/role`, `POST /admin/users/{id}/deactivate`, `GET
/admin/audit-log`). Used here and why: an explicit package (not a namespace package) so tooling
(mypy, pytest, ruff) resolves `app.admin.*` reliably and the package docstring documents the
module map. How it fits the project: FR-M-01/02/04 (plan 2): how the owner promotes an educator on
the test VM without psql; role changes and deactivations are audited. Works with: Depends on:
`app.auth` (`require_role`, `revoke_all_for_user`), `app.audit`. Used by: `app.main` (mounts
`router`), `tests/test_admin.py`.
"""
