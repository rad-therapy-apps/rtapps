/** Only accept same-origin relative paths as a redirect target (open-redirect guard). */
export function safeNext(value: string | null | undefined): string {
	// Reject `//host` and `/\host`: browsers normalise the backslash and treat both as protocol-relative.
	if (value && value.startsWith('/') && !/^\/[/\\]/.test(value)) return value;
	return '/home';
}

/**
 * Builds a human-readable message from an RFC 9457 problem+json body.
 * Prefers per-field validation errors (`errors[]`), then falls back to `detail`, then `title`.
 */
export function problemMessage(problem: unknown, status: number): string {
	if (problem && typeof problem === 'object') {
		const { title, detail, errors } = problem as {
			title?: unknown;
			detail?: unknown;
			errors?: unknown;
		};

		if (Array.isArray(errors) && errors.length > 0) {
			const parts = errors
				.map((error) => {
					if (!error || typeof error !== 'object') return undefined;
					const { loc, msg } = error as { loc?: unknown; msg?: unknown };
					if (typeof msg !== 'string') return undefined;
					const field =
						Array.isArray(loc) && loc.length > 0 ? String(loc[loc.length - 1]) : undefined;
					return field ? `${field}: ${msg}` : msg;
				})
				.filter((part): part is string => Boolean(part));
			if (parts.length > 0) return parts.join('; ');
		}

		if (typeof detail === 'string' && detail) return detail;
		if (typeof title === 'string' && title) return title;
	}

	return `Request failed (${status})`;
}
