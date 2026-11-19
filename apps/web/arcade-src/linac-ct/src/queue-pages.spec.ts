import { describe, expect, it } from 'vitest';
import { pageCount, pageOfRow, rowsPerPage, turnPage } from './queue-pages';

describe('rowsPerPage', () => {
	it('fits whole rows only', () => {
		expect(rowsPerPage(300, 50, 5)).toBe(6);
		expect(rowsPerPage(299, 50, 5)).toBe(5);
	});
	it('always shows at least one row', () => {
		expect(rowsPerPage(20, 50, 5)).toBe(1);
	});
	it('keeps the fallback until the frame is measured', () => {
		expect(rowsPerPage(0, 50, 5)).toBe(5);
		expect(rowsPerPage(300, 0, 5)).toBe(5);
	});
});

describe('pageCount and pageOfRow', () => {
	it('counts pages, at least one', () => {
		expect(pageCount(13, 6)).toBe(3);
		expect(pageCount(12, 6)).toBe(2);
		expect(pageCount(3, 6)).toBe(1);
		expect(pageCount(0, 6)).toBe(1);
	});
	it('finds the page holding a row', () => {
		expect(pageOfRow(0, 6)).toBe(0);
		expect(pageOfRow(5, 6)).toBe(0);
		expect(pageOfRow(6, 6)).toBe(1);
		expect(pageOfRow(-1, 6)).toBe(0);
	});
});

describe('turnPage', () => {
	it('moves and stops at both ends', () => {
		expect(turnPage(0, 1, 3)).toBe(1);
		expect(turnPage(2, 1, 3)).toBe(2);
		expect(turnPage(0, -1, 3)).toBe(0);
		expect(turnPage(5, 0, 3)).toBe(2);
	});
});
