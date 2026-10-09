<!--
	What this file does: the lesson reading/paging UI — walks the pages of a published lesson
	snapshot, renders rich text and knowledge checks per page, and submits the attempt for a
	final score once the last page is reached.
	Used here and why: Svelte 5 runes ($props for lesson/attempt/post, $state for page index and
	in-progress results, $derived for the current page and last-page check); `crypto.randomUUID()`
	is called once per component instance (not per request) so every submit attempt from this
	pager reuses the same `Idempotency-Key`, matching ADR-0004's retry contract; `{#key pageIndex}`
	forces each page's block list to remount on navigation so per-page component state (radio
	selection) doesn't leak across pages; `resolve('/(app)/home')` satisfies the
	`svelte/no-navigation-without-resolve` lint rule for the internal "Back to home" link.
	`collectImageIds` walks each rich_text block's doc for `image` nodes and resolves every
	mediaAssetId found to `/api/v1/media/{id}` (the same authenticated redirect route the TipTap
	editor's own `AuthorImage` uses), passed to `ProseDoc` as `images` — the missing half of Task
	15's image insertion, which only wired the editor's own rendering (Task 18).
	How it fits the project: this is the browser-driven half of ADR-0004's attempt flow — grading
	each item and the final submit both call the API directly from the client over the session
	cookie (ADR-0002); the pages/blocks themselves are ADR-0003's snapshot shape. See
	`docs/03-architecture.md` §4.3/§4.4.
	Depends on: `$lib/prose/ProseDoc.svelte`, `$lib/ui/Button.svelte` (pager controls), `./KnowledgeCheck.svelte`, `./api`, `./score`
	(`formatScore`), `./snapshot` (`lessonSnapshot`), `$app/paths` (`resolve`), `@rtapps/api-client`.
	Used by: `apps/web/src/routes/(app)/lessons/[slug]/+page.svelte`,
	`LessonPager.svelte.spec.ts`, driven end-to-end by `apps/web/e2e/lesson.e2e.ts`.
-->
<script lang="ts">
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import KnowledgeCheck from './KnowledgeCheck.svelte';
	import { api } from './api';
	import { formatScore } from './score';
	import { lessonSnapshot } from './snapshot';
	import { resolve } from '$app/paths';
	import Button from '$lib/ui/Button.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { components } from '@rtapps/api-client';
	import type { RichTextBlock } from './types';

	type LessonOut = components['schemas']['LessonOut'];
	type AttemptOut = components['schemas']['AttemptOut'];
	type ItemGradeOut = components['schemas']['ItemGradeOut'];

	// `lesson`/`attempt` come from this route's server `load` (attempt already started
	// server-side); `post` defaults to the real API client but is overridable so specs can
	// inject a fake and assert on calls.
	let {
		lesson,
		attempt,
		post = api.POST
	}: {
		lesson: LessonOut;
		attempt: AttemptOut;
		post?: typeof api.POST;
	} = $props();

	const snapshot = lessonSnapshot(lesson);
	const pages = snapshot.lesson.pages;
	// Generated once per pager instance (not once per request): every submit call below reuses
	// this same key, so a browser retry of "Finish lesson" after a dropped response is treated by
	// the API as the same idempotent submit rather than a second one (ADR-0004).
	const idempotencyKey = crypto.randomUUID();

	// Every `image` node's mediaAssetId anywhere in a rich_text doc (nested inside a list/table/
	// blockquote/callout, not just top-level), recursively.
	function collectImageIds(node: {
		type: string;
		attrs?: { mediaAssetId?: string };
		content?: unknown[];
	}): string[] {
		const ids = node.type === 'image' && node.attrs?.mediaAssetId ? [node.attrs.mediaAssetId] : [];
		const children = (node.content ?? []) as (typeof node)[];
		return ids.concat(children.flatMap(collectImageIds));
	}

	// mediaAssetId -> `/api/v1/media/{id}`, the same authenticated redirect-to-storage route the
	// TipTap editor's own `AuthorImage` renders (`$lib/author/extensions.ts`) — resolved here
	// (not by ProseDoc/ProseNode, which never fetch by id themselves) since this route is the
	// only rich_text consumer that has images to resolve at all.
	const images: Record<string, string> = Object.fromEntries(
		pages
			.flatMap((p) => p.blocks)
			.filter((b): b is RichTextBlock => b.type === 'rich_text')
			.flatMap((b) => collectImageIds(b.body))
			.map((id) => [id, `/api/v1/media/${id}`])
	);

	// Which page (0-based) is currently displayed.
	let pageIndex = $state(0);
	// Grading results keyed by knowledge-check `key`, so a result survives navigating away from
	// its page and back (passed to `KnowledgeCheck` as `initial`).
	let gradedResults = $state<Record<string, ItemGradeOut>>({});
	// The submitted attempt once `finish()` succeeds; presence of this switches the last-page UI
	// from "Finish lesson" to the score summary.
	let submitResult = $state<AttemptOut | undefined>(undefined);
	// User-facing message when submit fails.
	let submitError = $state<string | undefined>(undefined);
	// True while the submit request is in flight, to disable the Finish button against double-submits.
	let submitting = $state(false);

	// The page object to render for the current `pageIndex`.
	const currentPage = $derived(pages[pageIndex]);
	// Whether the pager is on the final page, gating the Finish/Next controls below.
	const isLastPage = $derived(pageIndex === pages.length - 1);

	// Callback passed to each KnowledgeCheck; merges its grading result into `gradedResults`.
	function recordGrade(key: string, gradeResult: ItemGradeOut) {
		gradedResults = { ...gradedResults, [key]: gradeResult };
	}

	// Submits the attempt for final scoring and stores the result (or an error message).
	async function finish() {
		submitting = true;
		submitError = undefined;
		try {
			// Same `idempotencyKey` on every call (including a retried click): the API returns the
			// same 200 body for a repeated key instead of creating a second submission.
			const res = await post('/api/v1/attempts/{attempt_id}/submit', {
				params: { path: { attempt_id: attempt.id } },
				headers: { 'Idempotency-Key': idempotencyKey }
			});
			if (res.error) {
				// See the matching comment in KnowledgeCheck.svelte: apps/api's global exception
				// handlers return an RFC7807 problem+json body with `title` for every error
				// response, which the generated schema (documenting only the default FastAPI
				// 422 body) doesn't reflect.
				submitError = (res.error as { title?: string }).title ?? 'Request failed';
				return;
			}
			submitResult = res.data;
		} catch {
			submitError = 'Request failed';
		} finally {
			submitting = false;
		}
	}
</script>

<!-- One reading panel holds the counter, page title, blocks and pager controls (styled in prose.css). -->
<div class="reading-panel">
	<p>Page {pageIndex + 1} of {pages.length}</p>
	<h2>{currentPage.title}</h2>

	<!-- Keying the whole block list on `pageIndex` forces every child (including KnowledgeCheck) to
	 be destroyed and recreated on navigation, so a radio selection or grading state from the
	 previous page never bleeds into the next one. -->
	{#key pageIndex}
		<!-- Knowledge checks are keyed by their stable `key` so a re-render doesn't remount them
		 unnecessarily; rich-text blocks have no such id, so `rt-${i}` (position) is used instead. -->
		{#each currentPage.blocks as block, i (block.type === 'knowledge_check' ? block.key : `rt-${i}`)}
			{#if block.type === 'rich_text'}
				<ProseDoc doc={block.body} {images} />
			{:else}
				<KnowledgeCheck
					{block}
					attemptId={attempt.id}
					{post}
					onGraded={recordGrade}
					initial={gradedResults[block.key]}
				/>
			{/if}
		{/each}
	{/key}

	<!-- Previous/Next navigation between pages. -->
	<div class="pager-controls">
		<Button
			variant="secondary"
			icon={ChevronLeft}
			disabled={pageIndex === 0}
			onclick={() => pageIndex--}>Previous</Button
		>
		<!-- "Next" is hidden (not just disabled) on the last page, since Finish takes over from there. -->
		{#if !isLastPage}
			<Button variant="primary" icon={ChevronRight} onclick={() => pageIndex++}>Next</Button>
		{/if}
	</div>

	<!-- Last-page-only controls: Finish button until submitted, then the score summary. -->
	{#if isLastPage}
		{#if !submitResult}
			<Button variant="primary" disabled={submitting} onclick={finish}>Finish lesson</Button>
		{:else}
			<p aria-live="polite">Score: {formatScore(submitResult)}</p>
			<a href={resolve('/(app)/home')}>Back to home</a>
		{/if}
		<!-- Submit failed: `finish()` clears this before every attempt, so in practice it only ever
		 appears alongside the still-visible Finish button, letting the student retry. -->
		{#if submitError}
			<p aria-live="polite">{submitError}</p>
		{/if}
	{/if}
</div>

<style>
	/* Lays the Previous/Next buttons out side by side with spacing. */
	.pager-controls {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
	}
</style>
