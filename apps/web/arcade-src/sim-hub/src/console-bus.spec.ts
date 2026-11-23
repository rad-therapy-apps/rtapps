import { describe, it, expect } from 'vitest';
import { channel, linacWalkthrough } from './console-bus';

describe('console message channels', () => {
	it('passes each value to every listener, in the order they were added', () => {
		const ch = channel<number>(),
			seen: string[] = [];
		ch.on((v) => seen.push(`a${v}`));
		ch.on((v) => seen.push(`b${v}`));
		ch.emit(1);
		ch.emit(2);
		expect(seen).toEqual(['a1', 'b1', 'a2', 'b2']);
	});

	it('stops calling a listener once it is removed, even from inside a call', () => {
		const ch = channel<string>(),
			seen: string[] = [];
		const off = ch.on((v) => {
			seen.push(v);
			off();
		});
		ch.on((v) => seen.push(`other ${v}`));
		ch.emit('x');
		ch.emit('y');
		expect(seen).toEqual(['x', 'other x', 'other y']);
	});

	it('emits the walkthrough position to its listeners until they are removed', () => {
		const seen: unknown[] = [];
		const off = linacWalkthrough.on((v) => seen.push(v));
		linacWalkthrough.emit({ part: 'setup', index: 1, of: 4 });
		linacWalkthrough.emit(null);
		off();
		linacWalkthrough.emit({ part: 'queue', index: 0, of: 2 });
		expect(seen).toEqual([{ part: 'setup', index: 1, of: 4 }, null]);
	});
});
