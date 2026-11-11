<!--
	What this file does: the Simulator page at `(app)/simulator` — one card, the radiation
	oncology center, with an entry link into its player, or a disabled "coming soon" button when
	`load` could not resolve it. The LINAC and CT simulators are inside the center, behind its
	doors, so they have no card of their own.

	Used here and why: Svelte 5 runes (`$props()`); `resolve()` for every href per
	`svelte/no-navigation-without-resolve`; the shared `PageHeader`, `Card` and `Icon` kit
	(docs/specs/2026-10-01-ui-restyle-design.md). The hub entry keeps `data-testid="simulator-entry"`
	and its "Enter the radiation oncology center" text, which the e2e specs drive.

	How it fits the project: the simulators used to sit in a "Simulator" section on every subject
	page; the owner moved them to their own tab (2026-10-06) because they are not tied to a
	subject. On 2026-11-11 the LINAC/CT console and gantry game cards went
	(docs/specs/2026-11-11-sim-hub-menu-tutorial-design.md, PR 2): the LINAC/CT simulators are
	reached through the center's doors, and the gantry game is archived. The link opens
	`(app)/subjects/[slug]/activities/[id]`, the same player route the Games shelf uses, so
	attempts and SDK scoring are unchanged.

	Works with: `$app/paths`, `#lib/ui/*`, `./+page.server.ts` (`hub`).
	Used by: `AppShell.svelte`'s "Simulator" nav link; `apps/web/e2e/simulator.e2e.ts`,
	`long-tail.e2e.ts`, `ui.e2e.ts`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Card from '#lib/ui/Card.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Simulator — RTTLearn</title>
</svelte:head>

<PageHeader
	title="Simulator"
	subtitle="Practise in a virtual radiation oncology center, with the LINAC and CT simulators inside it."
/>

<ul class="entries">
	<Card as="li">
		<h2><Icon icon={Building2} size={22} />Radiation oncology center</h2>
		<p>
			Walk the clinic: the lobby, the CT simulator, the treatment vaults and the control room.
			Explore on your own and talk to the staff, then run the QA walkthrough.
		</p>
		<p>
			The LINAC and CT simulators are inside the center: walk to the LINAC Control Area or the CT
			Simulator Room and press E at the door.
		</p>
		{#if data.hub}
			<a
				class="entry"
				href={resolve('/(app)/subjects/[slug]/activities/[id]', data.hub)}
				data-testid="simulator-entry">Enter the radiation oncology center</a
			>
		{:else}
			<button disabled title="The RT simulator arrives in a future update"
				>Enter the simulator — coming soon</button
			>
		{/if}
	</Card>
</ul>

<style>
	.entries {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-lg);
	}
	p {
		color: var(--text-muted);
	}
	/* A link styled as the primary button (the kit's Button renders a <button>). */
	.entry {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--accent-contrast);
		font-weight: 600;
		text-decoration: none;
	}
	.entry:hover {
		background: var(--accent-strong);
		border-color: var(--accent-strong);
		color: var(--accent-contrast);
	}
</style>
