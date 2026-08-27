const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/health']);

export type AccessDecision = { allow: true } | { redirect: string };

/** Pure route access decision: no user required for public paths, role-gated prefixes otherwise. */
export function decideAccess(pathname: string, user: App.User | null): AccessDecision {
	if (PUBLIC_PATHS.has(pathname)) return { allow: true };

	if (!user) return { redirect: `/login?next=${encodeURIComponent(pathname)}` };

	if (pathname === '/admin' || pathname.startsWith('/admin/')) {
		if (user.role !== 'admin') return { redirect: '/home' };
	} else if (pathname === '/educator' || pathname.startsWith('/educator/')) {
		if (user.role !== 'educator' && user.role !== 'admin') return { redirect: '/home' };
	}

	return { allow: true };
}
