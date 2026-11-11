import { beforeEach, describe, expect, it, vi } from 'vitest';

let D: typeof import('./dialogs');
beforeEach(async () => {
	vi.resetModules();
	D = await import('./dialogs');
});

/** A dialog that is open until closed, counting its closes. */
function dialog(open: boolean) {
	const d = { open, closes: 0 };
	return {
		d,
		isOpen: () => d.open,
		close: () => {
			d.open = false;
			d.closes++;
		}
	};
}

describe('dialogs', () => {
	it('reports no open dialog when none is', () => {
		const a = dialog(false);
		D.registerDialog('a', a.isOpen, a.close);
		expect(D.openDialogName()).toBe(null);
	});

	it('names the first registered dialog that is open', () => {
		const a = dialog(false),
			b = dialog(true),
			c = dialog(true);
		D.registerDialog('a', a.isOpen, a.close);
		D.registerDialog('b', b.isOpen, b.close);
		D.registerDialog('c', c.isOpen, c.close);
		expect(D.openDialogName()).toBe('b');
	});

	it('closes only that dialog, and says one was open', () => {
		const b = dialog(true),
			c = dialog(true);
		D.registerDialog('b', b.isOpen, b.close);
		D.registerDialog('c', c.isOpen, c.close);
		expect(D.closeOpenDialog()).toBe(true);
		expect([b.d.closes, c.d.closes]).toEqual([1, 0]);
		expect(D.openDialogName()).toBe('c');
	});

	it('closes nothing and returns false when no dialog is open', () => {
		const a = dialog(false);
		D.registerDialog('a', a.isOpen, a.close);
		expect(D.closeOpenDialog()).toBe(false);
		expect(a.d.closes).toBe(0);
	});

	it('replaces a dialog registered again under the same name, in its place', () => {
		const old = dialog(true),
			later = dialog(true),
			fresh = dialog(true);
		D.registerDialog('x', old.isOpen, old.close);
		D.registerDialog('y', later.isOpen, later.close);
		D.registerDialog('x', fresh.isOpen, fresh.close);
		D.closeOpenDialog();
		expect([old.d.closes, fresh.d.closes, later.d.closes]).toEqual([0, 1, 0]);
	});
});
