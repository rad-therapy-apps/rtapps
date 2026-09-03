/**
 * What this file does: unit tests for `decideAccess`'s public/anonymous/role-gated branches.
 * Used here and why: vitest `server` project — `decideAccess` is a pure function, no SvelteKit
 * request needed.
 * How it fits the project: the only test coverage for the route-access rules `hooks.server.ts`
 * relies on for every request (ADR-0002).
 * Depends on: `./guard` (decideAccess), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import { decideAccess } from './guard';

const student = { id: '1', email: 's@x', display_name: 'S', role: 'student' as const };
const admin = { ...student, role: 'admin' as const };

describe('decideAccess', () => {
	// Scenario: public paths, signed out.
	// Invariant: always allowed regardless of user.
	it('allows public routes without a user', () => {
		expect(decideAccess('/login', null)).toEqual({ allow: true });
		expect(decideAccess('/', null)).toEqual({ allow: true });
	});
	// Scenario: a non-public path with no signed-in user.
	// Invariant: redirected to login with the original path preserved as `next`.
	it('redirects anonymous users to login with next', () => {
		expect(decideAccess('/home', null)).toEqual({ redirect: '/login?next=%2Fhome' });
	});
	// Scenario: role-gated prefixes (`/admin`, `/educator`, `/author`) hit by student vs. admin.
	// Invariant: only the required role (or admin, for educator/author paths) is let through.
	it('enforces role prefixes', () => {
		expect(decideAccess('/admin/users', student)).toEqual({ redirect: '/home' });
		expect(decideAccess('/admin/users', admin)).toEqual({ allow: true });
		expect(decideAccess('/educator/cohorts', student)).toEqual({ redirect: '/home' });
		expect(decideAccess('/author', student)).toEqual({ redirect: '/home' });
		expect(decideAccess('/author', admin)).toEqual({ allow: true });
	});
});
