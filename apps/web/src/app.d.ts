/**
 * What this file does: SvelteKit's ambient type-declaration hook. Augments the global `App`
 * namespace so `event.locals` and the signed-in user shape are typed everywhere in the app,
 * without importing anything.
 * Used here and why: SvelteKit convention (`App.Locals`, `App.User`) picked up automatically by
 * `svelte-check`/TypeScript — no runtime code, compile-time only.
 * How it fits the project: `App.Locals.user` is set once per request in `hooks.server.ts` from
 * the API's `/auth/me` (ADR-0002 same-origin cookie session); `App.User.role` drives the route
 * guards in `guard.ts`. See `docs/03-architecture.md` §4.2.
 * Depends on: nothing (ambient declaration only).
 * Used by: `hooks.server.ts` (assigns `Locals`), `guard.ts` (`App.User` param) and, transitively,
 * every `+layout.server.ts`/`+page.server.ts` that reads `event.locals.user`.
 */
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Per-request state set once in hooks.server.ts: a correlation id and the signed-in user (or null).
			requestId: string;
			user: User | null;
		}
		interface User {
			// Mirrors the API's /auth/me response shape (id/email/display_name/role); role drives route guards.
			id: string;
			email: string;
			display_name: string;
			role: 'student' | 'educator' | 'admin';
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
