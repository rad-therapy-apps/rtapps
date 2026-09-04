/**
 * What this file does: unit tests for `uploadImage`'s presign -> PUT -> confirm ordering.
 * Used here and why: vitest `server` project — pure function, no DOM needed; `api`/`putFile` are
 * both `vi.fn` fakes so call order and the PUT-failure short-circuit can be asserted without a
 * real network call or storage.
 * How it fits the project: covers the Task 15 upload flow's one load-bearing invariant — a failed
 * direct-to-storage PUT must never be confirmed.
 * Depends on: `./uploadImage`, vitest.
 * Used by: `pnpm --filter web test` (vitest `server` project).
 */
import { describe, expect, it, vi } from 'vitest';
import { uploadImage, type AuthorApi } from './uploadImage';

// A minimal real File; Node's global `File` (undici) is enough for these tests since neither
// path reads the file's bytes, only its name/type/size.
function makeFile(): File {
	return new File(['fake-bytes'], 'figure.png', { type: 'image/png' });
}

describe('uploadImage', () => {
	// Scenario: presign, PUT, and confirm all succeed.
	// Invariant: the three calls happen in order (presign -> PUT -> confirm), the PUT receives
	// the presigned upload_url and the file, and the returned shape matches what
	// RichTextEditor's oninsertimage expects.
	it('calls presign, then PUT, then confirm, in order', async () => {
		const calls: string[] = [];
		const api: AuthorApi = {
			presign: vi.fn(async (body) => {
				calls.push('presign');
				expect(body).toEqual({ filename: 'figure.png', mime: 'image/png', bytes: 10 });
				return { id: 'asset-1', upload_url: 'https://storage.example/asset-1' };
			}),
			confirm: vi.fn(async (id) => {
				calls.push('confirm');
				expect(id).toBe('asset-1');
			})
		};
		const putFile = vi.fn(async (url: string) => {
			calls.push('put');
			expect(url).toBe('https://storage.example/asset-1');
			return new Response(null, { status: 200 });
		});

		const result = await uploadImage(makeFile(), api, putFile);

		expect(calls).toEqual(['presign', 'put', 'confirm']);
		expect(result).toEqual({ mediaAssetId: 'asset-1', alt: 'figure.png' });
	});

	// Scenario: the direct-to-storage PUT fails (non-2xx).
	// Invariant: uploadImage throws, and confirm is never called — nothing servable exists yet
	// at that storage key.
	it('never confirms when the PUT fails', async () => {
		const api: AuthorApi = {
			presign: vi.fn(async () => ({
				id: 'asset-2',
				upload_url: 'https://storage.example/asset-2'
			})),
			confirm: vi.fn(async () => {})
		};
		const putFile = vi.fn(async () => new Response(null, { status: 500 }));

		await expect(uploadImage(makeFile(), api, putFile)).rejects.toThrow('upload failed (500)');
		expect(api.confirm).not.toHaveBeenCalled();
	});
});
