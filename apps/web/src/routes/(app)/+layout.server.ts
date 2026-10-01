/**
 * What this file does: `load` for the `(app)` route group layout, covering every page under it
 * (home, subjects, lessons). Guarantees a signed-in user before any child route runs.
 *
 * Used here and why: `LayoutServerLoad` runs on the server for the whole group; `redirect()` is
 * used (not `error()`) because the correct response to "not signed in" is to send the browser to
 * `/login`, not to show an error page.
 *
 * How it fits the project: this is a second, belt-and-braces check — `hooks.server.ts` /
 * `guard.ts` already redirect anonymous users before routes under `(app)` run, so in practice
 * `locals.user` is always set here. Because of that upstream guard, every `(app)` page's own
 * `load` and markup can assume a signed-in `App.User` without re-checking. `docs/03-architecture.md`
 * §4, ADR-0002.
 *
 * Works with: `app.d.ts` (`App.Locals.user`). Used by: the root `+layout.svelte` shell (the `(app)` svelte
 * layout is gone) and, transitively, every page under `(app)/`.
 */
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	// Defence in depth: guard.ts should already have redirected anonymous users away from (app).
	if (!locals.user) redirect(303, resolve('/(auth)/login'));
	return { user: locals.user };
};
