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
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>My cohorts — RTTLearn</title>
</svelte:head>

<h1>My cohorts</h1>

<!-- Create-cohort form: posts to the `create` action, which redirects on success. -->
<form method="POST" action="?/create" use:enhance>
	<label for="name">Cohort name</label>
	<input id="name" name="name" required value={form?.name ?? ''} />
	<button>Create cohort</button>
</form>

<!-- Server-rendered error from the last failed create (e.g. validation, API down). -->
{#if form?.error}
	<p role="alert">{form.error}</p>
{/if}

<!-- Three mutually exclusive states: load error, no cohorts yet, or the cohorts table. -->
{#if data.error}
	<p>{data.error}</p>
{:else if data.cohorts.length === 0}
	<p>No cohorts yet — create one above.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>Students</th>
				<th>Join code</th>
			</tr>
		</thead>
		<tbody>
			{#each data.cohorts as c (c.id)}
				<tr>
					<td><a href={resolve('/(app)/educator/cohorts/[id]', { id: c.id })}>{c.name}</a></td>
					<td>{c.student_count}</td>
					<td>{c.join_code ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
