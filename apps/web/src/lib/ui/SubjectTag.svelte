<!--
	What this file does: A small pill showing a subject name in the colour derived from its slug.

	Used here and why: `tagIndex` gives a stable colour per subject; the dot is decorative and the label carries the meaning, so colour is never the only signal.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: `./subject-tag.ts`.
	Used by: subject lists and subject pages.
-->

<script lang="ts">
	import { tagIndex } from './subject-tag';
	let { slug, label }: { slug: string; label: string } = $props();
	const n = $derived(tagIndex(slug));
</script>

<span class="tag tag-{n}"><span class="dot" aria-hidden="true"></span>{label}</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0.125rem var(--space-2);
		border-radius: 999px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: currentColor;
	}
	.tag-1 {
		color: var(--tag-1-fg);
		background: var(--tag-1-bg);
	}
	.tag-2 {
		color: var(--tag-2-fg);
		background: var(--tag-2-bg);
	}
	.tag-3 {
		color: var(--tag-3-fg);
		background: var(--tag-3-bg);
	}
	.tag-4 {
		color: var(--tag-4-fg);
		background: var(--tag-4-bg);
	}
	.tag-5 {
		color: var(--tag-5-fg);
		background: var(--tag-5-bg);
	}
	.tag-6 {
		color: var(--tag-6-fg);
		background: var(--tag-6-bg);
	}
</style>
