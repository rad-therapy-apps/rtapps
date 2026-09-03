"""Shared dependency for every `/authoring/*` route: `require_author`.

What this file does: defines the one dependency every authoring route (media upload, and
Tasks 8-11's lesson/activity authoring routes) depends on for authorization.

Used here and why: `app.auth.deps.require_role`, the same factory `app.cohorts.router` and
`app.admin.router` use, so authoring's role check can never drift from the rest of the
app's role-checking convention.

How it fits the project: plan 3b (authoring API). Authoring is open to educators and
admins (spec decision) - students get 403, not 404, since authoring routes are not secret.

Depends on: `app.auth.deps.require_role`, `app.auth.models.UserRole`.
Used by: `app.media.router` (Task 7); Tasks 8-11's authoring routers.
"""

from app.auth.deps import require_role
from app.auth.models import UserRole

# Authoring is open to educators and admins (spec decision, plan 3b): the guard for every
# /authoring/* route. Students receive 403 - authoring routes are not secret, no 404 masking.
require_author = require_role(UserRole.educator, UserRole.admin)
