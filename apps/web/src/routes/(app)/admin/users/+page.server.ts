/**
 * What this file does: placeholder `load` for `(app)/admin/users`, the target of the nav's
 * "Admin" link.
 * Used here and why: exists only so `resolve('/(app)/admin/users')` type-checks in
 * `(app)/+layout.svelte`'s nav (`svelte/no-navigation-without-resolve` requires a real route).
 * How it fits the project: Task 8 (`.superpowers/sdd/task-8-brief.md`) replaces this with the
 * real admin users list/role/deactivate page (`GET /admin/users`); `guard.ts` already restricts
 * `/admin/*` to the admin role.
 * Depends on: nothing.
 * Used by: `+page.svelte` (this route).
 */
import type { PageServerLoad } from './$types';

// No data yet: Task 8 replaces this load with the real GET /admin/users call.
export const load: PageServerLoad = async () => ({});
