import { describe, expect, it } from 'vitest';
import { decideAccess } from './guard';

const student = { id: '1', email: 's@x', display_name: 'S', role: 'student' as const };
const admin = { ...student, role: 'admin' as const };

describe('decideAccess', () => {
	it('allows public routes without a user', () => {
		expect(decideAccess('/login', null)).toEqual({ allow: true });
		expect(decideAccess('/', null)).toEqual({ allow: true });
	});
	it('redirects anonymous users to login with next', () => {
		expect(decideAccess('/home', null)).toEqual({ redirect: '/login?next=%2Fhome' });
	});
	it('enforces role prefixes', () => {
		expect(decideAccess('/admin/users', student)).toEqual({ redirect: '/home' });
		expect(decideAccess('/admin/users', admin)).toEqual({ allow: true });
		expect(decideAccess('/educator/cohorts', student)).toEqual({ redirect: '/home' });
	});
});
