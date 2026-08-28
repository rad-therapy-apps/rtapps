import { describe, expect, it } from 'vitest';
import { problemMessage, safeNext } from './auth-forms';

describe('safeNext', () => {
	it('accepts a same-origin relative path', () => {
		expect(safeNext('/home')).toBe('/home');
	});

	it('rejects protocol-relative paths', () => {
		expect(safeNext('//evil')).toBe('/home');
	});

	it('rejects absolute URLs', () => {
		expect(safeNext('https://x')).toBe('/home');
	});

	it('defaults to /home when there is no value', () => {
		expect(safeNext(null)).toBe('/home');
	});
});

describe('problemMessage', () => {
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

	it('falls back to detail when there is no errors[]', () => {
		const problem = { title: 'Bad request', detail: 'Email already registered' };
		expect(problemMessage(problem, 400)).toBe('Email already registered');
	});

	it('falls back to title when there is no detail', () => {
		expect(problemMessage({ title: 'Unauthorized' }, 401)).toBe('Unauthorized');
	});

	it('falls back to a generic message for non-object input', () => {
		expect(problemMessage(undefined, 500)).toBe('Request failed (500)');
	});
});
