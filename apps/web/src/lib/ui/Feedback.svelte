<!--
	What this file does: Right/wrong answer feedback: an icon plus the caller's text.

	Used here and why: the caller keeps the exact copy (tests assert on it); the check/cross shape and the words carry the meaning, colour only repeats it.

	How it fits the project: shared UI kit, docs/specs/2026-10-01-ui-restyle-design.md (Architecture 3).

	Depends on: `./Icon.svelte`, `@lucide/svelte`.
	Used by: quiz and flashcard pages.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Icon from './Icon.svelte';

	let { correct, children }: { correct: boolean; children: Snippet } = $props();
</script>

<!-- Icon shape (check vs cross) plus the caller's words carry the meaning; colour only repeats it. -->
<p class="feedback" class:correct class:incorrect={!correct}>
	<Icon icon={correct ? CircleCheck : CircleX} />
	<span>{@render children()}</span>
</p>

<style>
	.feedback {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-sm);
	}
	.correct {
		color: var(--success);
		background: var(--success-bg);
	}
	.incorrect {
		color: var(--danger);
		background: var(--danger-bg);
	}
</style>
