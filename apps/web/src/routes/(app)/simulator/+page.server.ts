/**
 * What this file does: SSR `load` for `(app)/simulator`. Resolves the player route params of
 * the page's one entry, the radiation oncology center (the sim-hub activity), so the page can
 * link straight to its player.
 *
 * Used here and why: the simulators are external activities addressed by stable names, never
 * by embedded UUIDs (plan 4c): the hub carries an `sdk_slug`, resolved through
 * `GET /activities/by-sdk-slug/{slug}`. The lookup is best-effort: a 404 (not seeded,
 * unpublished) or a network failure leaves the entry `null` and the page shows its "coming
 * soon" placeholder, so a missing simulator never breaks the page. The LINAC/CT console and
 * gantry game lookups went on 2026-11-11 (docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md,
 * PR 2): the LINAC/CT simulators are reached through the center's doors, and the gantry game is
 * archived.
 *
 * How it fits the project: `(app)/+layout.server.ts` guarantees a signed-in user. The entry
 * links to `(app)/subjects/[slug]/activities/[id]`, the same player route as the Games shelf.
 *
 * Works with: `#lib/server/api` (`apiFetch`), `@rtapps/api-client` (`SdkSlugOut`).
 * Used by: `+page.svelte` (this route); driven by `apps/web/e2e/simulator.e2e.ts`,
 * `long-tail.e2e.ts` and `ui.e2e.ts`.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
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
	const hub = await resolveEntry(event, '/activities/by-sdk-slug/sim-hub-qa');
	return { hub };
};
