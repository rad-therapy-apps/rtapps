/**
 * What this file does: the presign -> PUT -> confirm media upload flow, as one function.
 * Used here and why: `api`/`putFile` are both injected (default `putFile` is a real `fetch` PUT)
 * so the ordering invariant — a failed PUT must never reach `confirm` — is unit-testable with
 * fakes, no network or real storage involved. `AuthorApi` is a thin, hand-typed interface over
 * the two generated-client calls this needs (`POST /authoring/media/presign`,
 * `POST /authoring/media/{id}/confirm`) rather than the raw `openapi-fetch` client itself, so this
 * module doesn't need to know about `params.path`/`res.error` shapes at all.
 * How it fits the project: Task 15's image-insert wiring — `LessonEditor.svelte` supplies
 * `RichTextEditor`'s `oninsertimage` by picking a file, then calling this, then handing the
 * resulting `{mediaAssetId, alt}` straight to TipTap's `insertContent`. Per Task 4/7's media
 * model, two images sharing one legacy `src` share one `mediaAssetId` — this function only ever
 * creates fresh ids (a new presign per upload), so it never needs to look anything up by id.
 * Depends on: nothing (the real `AuthorApi`/`fetch` wiring lives in `LessonEditor.svelte`).
 * Used by: `LessonEditor.svelte`, `uploadImage.test.ts`.
 */

/** The two authoring/media calls this flow needs, thinly wrapped over the generated client. */
export type AuthorApi = {
	presign(body: { filename: string; mime: string; bytes: number }): Promise<{
		id: string;
		upload_url: string;
	}>;
	confirm(id: string): Promise<void>;
};

/**
 * Uploads `file`: creates a pending media asset + presigned URL, PUTs the bytes directly to
 * storage, then confirms the upload landed. Returns the id/alt pair `RichTextEditor`'s
 * `oninsertimage` expects. Throws (without confirming) if the PUT itself fails.
 */
export async function uploadImage(
	file: File,
	api: AuthorApi,
	putFile: (url: string, file: File) => Promise<Response> = (url, f) =>
		fetch(url, { method: 'PUT', body: f, headers: { 'content-type': f.type } })
): Promise<{ mediaAssetId: string; alt: string }> {
	const presigned = await api.presign({ filename: file.name, mime: file.type, bytes: file.size });
	const res = await putFile(presigned.upload_url, file);
	// A failed direct-to-storage PUT must never be confirmed — confirming marks the asset
	// servable, and there is nothing servable at `storage_key` yet.
	if (!res.ok) throw new Error(`upload failed (${res.status})`);
	await api.confirm(presigned.id);
	return { mediaAssetId: presigned.id, alt: file.name };
}
