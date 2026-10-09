<!--
	What this file does: Author dashboard at `(app)/author`. Shows the migrated-content review
	queue first (every activity flagged `needs_review`, across all subjects), then one card per
	subject with its activities grouped and counted by kind, each linking to that activity's
	editor route; a "New lesson" form creates a draft lesson.

	Used here and why: `use:enhance` on the create-lesson form for progressive enhancement;
	`resolve()` for the one route that already exists (`/subjects/[slug]`); the per-kind editor
	routes (`/author/lessons/[id]`, `/author/quizzes/[id]`, `/author/decks/[id]`,
	`/author/matching/[id]`, `/author/sequencing/[id]`) and `/author/data-tables` don't exist yet
	(Tasks 15/16), so those hrefs are plain strings with an inline `eslint-disable-next-line` —
	`resolve()` can only target route ids SvelteKit already knows about. Svelte 5 runes
	(`$props()`).

	How it fits the project: `data.bySubject`/`data.needsReview` come from this route's `load`
	(`GET /authoring/subjects`, `GET /authoring/subjects/{slug}/activities`); the needs-review
	section is the migrated-content review queue (Task 4's `import_notes`/`needs_review`); the
	create form posts to the `createLesson` action, which redirects into the new lesson's editor.
	`docs/03-architecture.md` §7.

	Works with: `$app/forms`, `$app/paths`. Used by: reached from the nav's "Author" link
	(shown to educator/admin).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { components } from '@rtapps/api-client';
	import type { ActionData, PageData } from './$types';

	type ActivityAuthorRow = components['schemas']['ActivityAuthorRow'];

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Display label per activity kind, also fixing the section order within each subject card.
	const kindLabels: Record<string, string> = {
		lesson: 'Lessons',
		quiz: 'Quizzes',
		flashcards: 'Flashcards',
		matching: 'Matching',
		sequencing: 'Sequencing',
		calculator: 'Calculators'
	};

	// Editor route per kind, keyed by `activity_id` for every kind except `lesson`, whose editor
	// route is keyed by `lesson_id` instead (`GET /authoring/lessons/{lesson_id}`; see
	// `ActivityAuthorRow.lesson_id`). `calculator` has no editor route in this plan yet, so it's
	// omitted — its activities render as plain text below.
	function editorHref(row: ActivityAuthorRow): string | undefined {
		switch (row.kind) {
			case 'lesson':
				return row.lesson_id ? `/author/lessons/${row.lesson_id}` : undefined;
			case 'quiz':
				return `/author/quizzes/${row.activity_id}`;
			case 'flashcards':
				return `/author/decks/${row.activity_id}`;
			case 'matching':
				return `/author/matching/${row.activity_id}`;
			case 'sequencing':
				return `/author/sequencing/${row.activity_id}`;
			default:
				return undefined;
		}
	}
</script>

<svelte:head>
	<title>Author — RTTLearn</title>
</svelte:head>

<PageHeader title="Author">
	{#snippet actions()}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- /author/data-tables lands in a later task, not yet a known route id -->
		<a class="link-button" href="/author/data-tables">Data tables</a>
	{/snippet}
</PageHeader>

<section>
	<h2>Needs review ({data.needsReview.length})</h2>
	{#if data.needsReview.length === 0}
		<p class="muted">Nothing needs review.</p>
	{:else}
		<ul class="rows">
			{#each data.needsReview as row (row.activity_id)}
				{@const href = editorHref(row)}
				<Card as="li">
					{#if href}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- editor route lands in Task 15/16, not yet a known route id -->
						<a {href}>{row.subject.title} / {row.title}</a>
					{:else}
						{row.subject.title} / {row.title}
					{/if}
					{#if row.import_notes.length > 0}
						<ul class="notes">
							<!-- Keyed on position, not `note` itself (Task 18): the same converter note
								 text legitimately repeats per occurrence on a real migrated lesson, and a
								 keyed-each requires unique keys — keying on the value threw
								 `each_key_duplicate` for any such row (see PublishPanel.svelte's own fix). -->
							{#each row.import_notes.slice(0, 2) as note, i (i)}
								<li>{note}</li>
							{/each}
						</ul>
						{#if row.import_notes.length > 2}
							<p class="muted">+{row.import_notes.length - 2} more</p>
						{/if}
					{/if}
				</Card>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h2>New lesson</h2>
	<Card>
		<form method="POST" action="?/createLesson" use:enhance>
			<Field label="Title" id="title">
				<input id="title" name="title" required value={form?.title ?? ''} />
			</Field>

			<Field label="Slug" id="slug">
				<input id="slug" name="slug" required value={form?.slug ?? ''} />
			</Field>

			<Field label="Subject" id="subject_slug">
				<select id="subject_slug" name="subject_slug" required>
					{#each data.bySubject as entry (entry.subject.id)}
						<option value={entry.subject.slug} selected={form?.subject_slug === entry.subject.slug}>
							{entry.subject.title}
						</option>
					{/each}
				</select>
			</Field>

			<Button type="submit" variant="primary">Create lesson</Button>
		</form>
		{#if form?.error}
			<Alert tone="danger" role="alert">{form.error}</Alert>
		{/if}
	</Card>
</section>

<section>
	<h2>Subjects</h2>
	<div class="subjects">
		{#each data.bySubject as entry (entry.subject.id)}
			<Card as="article">
				<h3>
					<a href={resolve('/(app)/subjects/[slug]', { slug: entry.subject.slug })}
						>{entry.subject.title}</a
					>
					({entry.activities.length})
				</h3>
				{#each Object.entries(kindLabels) as [kind, label] (kind)}
					{@const activities = entry.activities.filter((a) => a.kind === kind)}
					{#if activities.length > 0}
						<h4>{label} ({activities.length})</h4>
						<ul class="activities">
							{#each activities as activity (activity.activity_id)}
								{@const href = editorHref(activity)}
								<li>
									{#if href}
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- editor route lands in Task 15/16, not yet a known route id -->
										<a {href}>{activity.title}</a>
									{:else}
										{activity.title}
									{/if}
									<span class="muted">({activity.status})</span>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</Card>
		{/each}
	</div>
</section>

<style>
	section {
		margin-block-end: var(--space-6);
	}
	.link-button {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-height);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface-raised);
		color: var(--text);
		font-weight: 600;
		text-decoration: none;
	}
	.link-button:hover {
		border-color: var(--accent);
	}
	.rows,
	.activities,
	.notes {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rows {
		display: grid;
		gap: var(--space-3);
	}
	.notes {
		margin-block-start: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.activities li {
		padding-block: var(--space-1);
	}
	.subjects {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: var(--space-4);
	}
	.subjects h4 {
		margin-block: var(--space-4) var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	form {
		display: grid;
		gap: var(--space-3);
		max-width: 20rem;
	}
	form :global(.btn) {
		justify-self: start;
	}
	.muted {
		color: var(--text-muted);
	}
</style>
