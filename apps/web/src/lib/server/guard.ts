/**
 * What this file does: the pure route-access decision used by `hooks.server.ts` on every
 * request — decides whether a pathname is public, requires login, or requires a role.
 * Used here and why: kept as a plain function taking `(pathname, user)` (no `RequestEvent`)
 * specifically so it's unit-testable without mocking SvelteKit.
 * How it fits the project: this is the authorization half of ADR-0002's route groups
 * (`(app)`/`(auth)` plus `/admin`, `/educator` prefixes) — `web` redirects for UX, but the API
 * is what actually enforces authorization on every request (this guard is not itself a
 * security boundary). See `docs/03-architecture.md` §9.
 * Depends on: `App.User` (ambient type from `app.d.ts`).
 * Used by: `hooks.server.ts`.
 */
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/health']);

export type AccessDecision = { allow: true } | { redirect: string };

/** Pure route access decision: no user required for public paths, role-gated prefixes otherwise. */
export function decideAccess(pathname: string, user: App.User | null): AccessDecision {
	if (PUBLIC_PATHS.has(pathname)) return { allow: true };

	if (!user) return { redirect: `/login?next=${encodeURIComponent(pathname)}` };

	// Role-gated prefixes: admin and educator areas fall through to `allow` for any other signed-in user.
	if (pathname === '/admin' || pathname.startsWith('/admin/')) {
		if (user.role !== 'admin') return { redirect: '/home' };
	} else if (pathname === '/educator' || pathname.startsWith('/educator/')) {
		if (user.role !== 'educator' && user.role !== 'admin') return { redirect: '/home' };
	}

	return { allow: true };
}
