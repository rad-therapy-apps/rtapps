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

<h1>Author</h1>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- /author/data-tables lands in a later task, not yet a known route id -->
<p><a href="/author/data-tables">Data tables</a></p>

<section>
	<h2>Needs review ({data.needsReview.length})</h2>
	{#if data.needsReview.length === 0}
		<p>Nothing needs review.</p>
	{:else}
		<ul>
			{#each data.needsReview as row (row.activity_id)}
				{@const href = editorHref(row)}
				<li>
					{#if href}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- editor route lands in Task 15/16, not yet a known route id -->
						<a {href}>{row.subject.title} / {row.title}</a>
					{:else}
						{row.subject.title} / {row.title}
					{/if}
					{#if row.import_notes.length > 0}
						<ul>
							<!-- Keyed on position, not `note` itself (Task 18): the same converter note
								 text legitimately repeats per occurrence on a real migrated lesson, and a
								 keyed-each requires unique keys — keying on the value threw
								 `each_key_duplicate` for any such row (see PublishPanel.svelte's own fix). -->
							{#each row.import_notes.slice(0, 2) as note, i (i)}
								<li>{note}</li>
							{/each}
						</ul>
						{#if row.import_notes.length > 2}
							<p>+{row.import_notes.length - 2} more</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h2>New lesson</h2>
	<form method="POST" action="?/createLesson" use:enhance>
		<label for="title">Title</label>
		<input id="title" name="title" required value={form?.title ?? ''} />

		<label for="slug">Slug</label>
		<input id="slug" name="slug" required value={form?.slug ?? ''} />

		<label for="subject_slug">Subject</label>
		<select id="subject_slug" name="subject_slug" required>
			{#each data.bySubject as entry (entry.subject.id)}
				<option value={entry.subject.slug} selected={form?.subject_slug === entry.subject.slug}>
					{entry.subject.title}
				</option>
			{/each}
		</select>

		<button>Create lesson</button>
	</form>
	{#if form?.error}
		<p role="alert">{form.error}</p>
	{/if}
</section>

<section>
	<h2>Subjects</h2>
	{#each data.bySubject as entry (entry.subject.id)}
		<article>
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
					<ul>
						{#each activities as activity (activity.activity_id)}
							{@const href = editorHref(activity)}
							<li>
								{#if href}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- editor route lands in Task 15/16, not yet a known route id -->
									<a {href}>{activity.title}</a>
								{:else}
									{activity.title}
								{/if}
								({activity.status})
							</li>
						{/each}
					</ul>
				{/if}
			{/each}
		</article>
	{/each}
</section>
