<!--
	What this file does: the lesson editor page at `(app)/author/lessons/[id]` — three tabs
	(Edit/Preview/Publish) over one lesson working copy.
	Used here and why: Svelte 5 runes (`$props`, `$state`) for the active-tab/preview state; the
	Preview tab fetches `GET /authoring/activities/{id}/preview` fresh on every activation (not
	cached) so it reflects edits saved since the last look, and renders it through the same
	student `ProseDoc`/`ProseNode` renderer (ADR-0003) plus a static, non-interactive `{#snippet}`
	for knowledge checks (an options list, no grading — the preview response is answer-stripped
	just like the published snapshot) with a simple page pager mirroring
	`$lib/lesson/LessonPager.svelte`'s structure. Edit and Publish are each delegated whole to
	`LessonEditor.svelte`/`PublishPanel.svelte`.
	How it fits the project: `data.lesson`/`data.versions` come from this route's `load`
	(`docs/03-architecture.md` §7); `data.lesson.pages` is opaque JSON to the generated schema, so
	it's cast to `AuthorPage[]` at this one boundary (same pattern as `$lib/lesson/snapshot.ts`).
	Works with: `$lib/author/LessonEditor.svelte`, `$lib/author/PublishPanel.svelte`,
	`$lib/author/api` (`api.GET`), `$lib/prose/ProseDoc.svelte`, `$lib/lesson/types`
	(`LessonSnapshot`, `KnowledgeCheckBlock`). Used by: reached from `(app)/author`'s dashboard.
-->
<script lang="ts">
	import LessonEditor from '$lib/author/LessonEditor.svelte';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import { api } from '$lib/author/api';
	import ProseDoc from '$lib/prose/ProseDoc.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { AuthorPage } from '$lib/author/types';
	import type { LessonSnapshot, KnowledgeCheckBlock } from '$lib/lesson/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// `LessonAuthorOut.pages` is opaque JSON to the generated schema (the API treats page/block
	// content as untyped JSONB) — cast to the actual shape once, here, same pattern as
	// `$lib/lesson/snapshot.ts`.
	const initialPages = $derived(data.lesson.pages as unknown as AuthorPage[]);

	let activeTab = $state<'edit' | 'preview' | 'publish'>('edit');

	let previewSnapshot = $state<LessonSnapshot | undefined>(undefined);
	let previewPageIndex = $state(0);
	let previewLoading = $state(false);
	let previewError = $state<string | undefined>(undefined);

	async function loadPreview() {
		previewLoading = true;
		previewError = undefined;
		try {
			const res = await api.GET('/api/v1/authoring/activities/{activity_id}/preview', {
				params: { path: { activity_id: data.lesson.activity_id } }
			});
			if (res.error) {
				// Same RFC 9457 fallback as LessonEditor.svelte/attempts.ts: apps/api's global
				// exception handlers return a problem+json body with `title`.
				previewError = (res.error as { title?: string }).title ?? 'Request failed';
				return;
			}
			previewSnapshot = res.data as unknown as LessonSnapshot;
			previewPageIndex = 0;
		} catch {
			previewError = 'Request failed';
		} finally {
			previewLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.lesson.title} — Author — RTTLearn</title>
</svelte:head>

<PageHeader title={data.lesson.title} />

<Tabs
	tabs={[
		{ id: 'edit', label: 'Edit' },
		{ id: 'preview', label: 'Preview' },
		{ id: 'publish', label: 'Publish' }
	]}
	bind:selected={activeTab}
	label="Lesson editor tabs"
	onselect={(id) => id === 'preview' && loadPreview()}
/>

{#if activeTab === 'edit'}
	<div role="tabpanel">
		<LessonEditor lessonId={data.lesson.lesson_id} {initialPages} />
	</div>
{:else if activeTab === 'preview'}
	<div role="tabpanel">
		{#if previewLoading}
			<p>Loading preview…</p>
		{/if}
		{#if previewError}
			<Alert tone="danger" role="alert">{previewError}</Alert>
		{/if}
		{#if previewSnapshot}
			{@const page = previewSnapshot.lesson.pages[previewPageIndex]}
			<p>Page {previewPageIndex + 1} of {previewSnapshot.lesson.pages.length}</p>
			<h2>{page.title}</h2>
			{#each page.blocks as block, i (block.type === 'knowledge_check' ? block.key : `rt-${i}`)}
				{#if block.type === 'rich_text'}
					<ProseDoc doc={block.body} />
				{:else}
					{@render knowledgeCheckPreview(block)}
				{/if}
			{/each}
			<div class="pager-controls">
				<Button disabled={previewPageIndex === 0} onclick={() => previewPageIndex--}>
					Previous
				</Button>
				<Button
					disabled={previewPageIndex === previewSnapshot.lesson.pages.length - 1}
					onclick={() => previewPageIndex++}
				>
					Next
				</Button>
			</div>
		{/if}
	</div>
{:else}
	<div role="tabpanel">
		<PublishPanel
			activityId={data.lesson.activity_id}
			importNotes={data.lesson.import_notes}
			versions={data.versions}
		/>
	</div>
{/if}

<!-- Static (non-interactive) knowledge-check preview: the response is already answer-stripped,
	 so there is no correct answer to mark — just the stem and the option list. -->
{#snippet knowledgeCheckPreview(block: KnowledgeCheckBlock)}
	<fieldset>
		<legend><ProseDoc doc={block.stem} /></legend>
		<ol>
			{#each block.body.options as option, i (i)}
				<li>{option}</li>
			{/each}
		</ol>
	</fieldset>
{/snippet}

<style>
	.pager-controls {
		display: flex;
		gap: var(--space-4);
		margin: var(--space-4) 0;
	}
</style>
