"""Cohorts package: cohorts, enrollments and join-by-code.

What this file does: marks `app.cohorts` as a package. Empty on purpose — nothing is re-exported;
import the submodules directly: `models` (Cohort, Enrollment, join-code generator), `schemas`
(request/response models), `deps` (`require_cohort_educator`, the one ownership check), `router`
(create/list/get/patch/rotate/join/members/remove). Used here and why: an explicit package (not a
namespace package) so tooling (mypy, pytest, ruff) resolves `app.cohorts.*` reliably and the
package docstring documents the module map. How it fits the project: FR-E-01/02/03/09, FR-S-06
(plan 2); ownership is enforced in SQL via `deps.require_cohort_educator`, which `app.analytics`
reuses. Works with: Depends on: `app.auth` (users, roles, `require_user`), `app.audit.service`
(audit rows), `app.attempts.models` (roster last-activity). Used by: `app.main` (mounts `router`),
`app.analytics`, `app.seed`, the cohort/analytics tests.
"""
