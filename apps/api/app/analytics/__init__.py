"""Analytics package: the audited educator views over cohort results.

What this file does: marks `app.analytics` as a package. Empty on purpose — nothing is
re-exported; import the submodules directly: `schemas` (overview and student-detail response
models), `queries` (aggregations over `activity_result` scoped to one cohort), `router` (`GET
/cohorts/{id}/overview`, `GET /cohorts/{id}/students/{uid}`). Used here and why: an explicit
package (not a namespace package) so tooling (mypy, pytest, ruff) resolves `app.analytics.*`
reliably and the package docstring documents the module map. How it fits the project:
FR-E-04/05/09/10 (plan 2): the educator half of the M2 vertical slice; every read writes an
`audit_log` row. Works with: Depends on: `app.cohorts` (`require_cohort_educator`, `cohort_out`,
`MemberOut`), `app.attempts.rollup` (`ActivityResult`), `app.attempts.models`,
`app.content.models`, `app.audit.service`. Used by: `app.main` (mounts `router`),
`tests/test_analytics.py`.
"""
