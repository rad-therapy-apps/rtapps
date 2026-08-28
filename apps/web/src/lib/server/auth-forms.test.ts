/**
 * What this file does: unit tests for `safeNext` (open-redirect guard) and `problemMessage`
 * (RFC 9457 problem+json → user-facing text).
 * Used here and why: vitest `server` project — pure functions, no DOM needed.
 * How it fits the project: covers the open-redirect guard the login/register flow relies on
 * (ADR-0002) and the error-message fallback chain used on those same forms.
 * Depends on: `./auth-forms` (problemMessage, safeNext), vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import { problemMessage, safeNext } from './auth-forms';

describe('safeNext', () => {
	// Scenario: a legitimate in-app path.
	// Invariant: returned unchanged.
	it('accepts a same-origin relative path', () => {
		expect(safeNext('/home')).toBe('/home');
	});

	// Scenario: `//evil` — browsers treat this as protocol-relative to another host.
	// Invariant: falls back to /home rather than redirecting off-site.
	it('rejects protocol-relative paths', () => {
		expect(safeNext('//evil')).toBe('/home');
	});

	// Scenario: a fully-qualified URL.
	// Invariant: rejected — only same-origin relative paths are accepted.
	it('rejects absolute URLs', () => {
		expect(safeNext('https://x')).toBe('/home');
	});

	// Scenario: no `next` param at all.
	// Invariant: defaults to /home.
	it('defaults to /home when there is no value', () => {
		expect(safeNext(null)).toBe('/home');
	});
});

describe('problemMessage', () => {
	// Scenario: a 422 validation problem with multiple field errors.
	// Invariant: each error is rendered as "field: message" and joined, in order.
	it('builds a message from errors[], joining multiple entries', () => {
		const problem = {
			title: 'Validation failed',
			status: 422,
			errors: [
				{ loc: ['body', 'password'], msg: 'String should have at least 10 characters' },
				{ loc: ['body', 'email'], msg: 'value is not a valid email address' }
			]
		};

		expect(problemMessage(problem, 422)).toBe(
			'password: String should have at least 10 characters; email: value is not a valid email address'
		);
	});

	// Scenario: a problem body with `detail` but no per-field `errors[]`.
	// Invariant: `detail` is used.
	it('falls back to detail when there is no errors[]', () => {
		const problem = { title: 'Bad request', detail: 'Email already registered' };
		expect(problemMessage(problem, 400)).toBe('Email already registered');
	});

	// Scenario: a problem body with only `title`.
	// Invariant: `title` is used as the last structured fallback.
	it('falls back to title when there is no detail', () => {
		expect(problemMessage({ title: 'Unauthorized' }, 401)).toBe('Unauthorized');
	});

	// Scenario: the body isn't a problem+json object at all (e.g. undefined).
	// Invariant: a generic "Request failed (status)" message is produced.
	it('falls back to a generic message for non-object input', () => {
		expect(problemMessage(undefined, 500)).toBe('Request failed (500)');
	});
});
