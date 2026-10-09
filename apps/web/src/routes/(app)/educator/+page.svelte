<!--
	What this file does: Educator landing page at `(app)/educator`. Lists the cohorts this user
	educates and offers a form to create a new one.

	Used here and why: `use:enhance` on the create form for progressive enhancement; `resolve()`
	for every href, per `svelte/no-navigation-without-resolve`; Svelte 5 runes (`$props()`).

	How it fits the project: `data.cohorts`/`data.error` come from this route's `load`
	(`GET /cohorts`, filtered to `role === 'educator'`); the create form posts to the `create`
	action, which redirects into the new cohort's overview page (FR-E-01).

	Works with: `$app/forms`, `$app/paths`. Used by: reached from the nav's "Educator" link;
	links into `(app)/educator/cohorts/[id]`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>My cohorts — RTTLearn</title>
</svelte:head>

<PageHeader title="My cohorts" />

<!-- Create-cohort form: posts to the `create` action, which redirects on success. -->
<form method="POST" action="?/create" use:enhance>
	<Field label="Cohort name" id="name">
		<input id="name" name="name" required value={form?.name ?? ''} />
	</Field>
	<Button type="submit" variant="primary">Create cohort</Button>
</form>

<!-- Server-rendered error from the last failed create (e.g. validation, API down). -->
{#if form?.error}
	<Alert tone="danger" role="alert">{form.error}</Alert>
{/if}

<!-- Three mutually exclusive states: load error, no cohorts yet, or the cohorts table. -->
{#if data.error}
	<Alert tone="danger">{data.error}</Alert>
{:else if data.cohorts.length === 0}
	<p>No cohorts yet — create one above.</p>
{:else}
	<ul class="grid">
		{#each data.cohorts as c (c.id)}
			<Card as="li">
				<h2>
					<a href={resolve('/(app)/educator/cohorts/[id]', { id: c.id })}>{c.name}</a>
				</h2>
				<p>{c.student_count} {c.student_count === 1 ? 'student' : 'students'}</p>
				<p>Join code: {c.join_code ?? '—'}</p>
			</Card>
		{/each}
	</ul>
{/if}

<style>
	form {
		display: grid;
		gap: var(--space-3);
		max-width: 20rem;
		margin-block: var(--space-4);
	}
	form :global(.btn) {
		justify-self: start;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	h2 {
		margin: 0 0 var(--space-1);
		font-size: var(--text-lg);
	}
	p {
		margin: 0;
		color: var(--text-muted);
	}
</style>
