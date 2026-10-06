/**
 * What this file does: SSR `load` for `(app)/simulator`. Resolves the player route params of
 * the three simulator entries — the radiation oncology center (the sim-hub activity), the
 * LINAC/CT console suite, and the gantry position game — so the page can link straight to
 * each one's player.
 *
 * Used here and why: the simulators are external activities addressed by stable names, never
 * by embedded UUIDs (plan 4c): the hub and the console carry an `sdk_slug`, resolved through
 * `GET /activities/by-sdk-slug/{slug}`; the gantry game is a plain arcade game with only an
 * `arcade_slug`, resolved through `GET /activities/by-arcade-slug/{slug}`. Each lookup is
 * best-effort: a 404 (not seeded, unpublished) or a network failure leaves that entry `null`
 * and the page shows its "coming soon" placeholder, so one missing simulator never breaks the
 * page. The three lookups run in parallel.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user. Each entry
 * links to `(app)/subjects/[slug]/activities/[id]`, the same player route as the Games shelf.
 *
 * Works with: `$lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SdkSlugOut`).
 * Used by: `+page.svelte` (this route); driven by `apps/web/e2e/simulator.e2e.ts`,
 * `long-tail.e2e.ts` and `ui.e2e.ts`.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { components } from '@rtapps/api-client';
import type { PageServerLoad } from './$types';

/** Player route params for one simulator entry, or null when it does not resolve. */
export type SimulatorEntry = { slug: string; id: string } | null;

async function resolveEntry(event: RequestEvent, path: string): Promise<SimulatorEntry> {
	try {
		const res = await apiFetch(event, path);
		if (!res.ok) return null;
		const info: components['schemas']['SdkSlugOut'] = await res.json();
		return { slug: info.subject_slug, id: info.activity_id };
	} catch {
		// Best-effort by contract: a network-level failure degrades to the placeholder.
		return null;
	}
}

export const load: PageServerLoad = async (event) => {
	const [hub, console, gantry] = await Promise.all([
		resolveEntry(event, '/activities/by-sdk-slug/sim-hub-qa'),
		resolveEntry(event, '/activities/by-sdk-slug/sim-linac-fraction'),
		resolveEntry(event, '/activities/by-arcade-slug/gantry-game')
	]);
	return { hub, console, gantry };
};
