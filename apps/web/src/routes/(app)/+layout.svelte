<!--
	What this file does: Layout markup for the `(app)` route group. Wraps every signed-in page
	(home, subjects, lessons) in a `<main>` element.

	Used here and why: Svelte 5 runes (`$props()`); a route group layout — the `(app)` segment
	itself contributes nothing to the URL, only to which layout/guard applies.

	How it fits the project: purely structural; the actual signed-in guarantee comes from
	`(app)/+layout.server.ts`'s `load`. `docs/03-architecture.md` §4.

	Used by: every page under `(app)/` (home, subjects, subjects/[slug], lessons/[slug]).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main>
	{@render children()}
</main>
