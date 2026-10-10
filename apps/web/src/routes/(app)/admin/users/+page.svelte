<!--
	What this file does: Admin users page at `(app)/admin/users`. Search by email/name, and per-row
	change a user's role or deactivate them.

	Used here and why: `use:enhance` on the role/deactivate/reset forms for progressive
	enhancement; a plain `GET` form for search so it's a shareable/bookmarkable URL; `resolve()`
	for the "Next page" link, per `svelte/no-navigation-without-resolve`; Svelte 5 runes
	(`$props()`).

	How it fits the project: `data.page`/`data.q` come from this route's `load`
	(`GET /admin/users?q=&cursor=`); the role/deactivate/reset forms post to the
	`role`/`deactivate`/`reset` actions (`PATCH /admin/users/{id}/role`,
	`POST /admin/users/{id}/deactivate`, `POST /admin/users/{id}/reset-password`); `guard.ts`
	already restricts `/admin/*` to the admin role. The reset action's temporary password is
	rendered once, from the action result — it is never put in a URL, cookie, or console.log.

	Works with: `$app/forms`, `$app/paths`, the `$lib/ui` kit. Used by: reached from the nav's "Admin" link.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Builds the "Next page" query string, carrying the current search term forward alongside the cursor.
	function nextPageQuery(cursor: string): string {
		const params = new SvelteURLSearchParams();
		if (data.q) params.set('q', data.q);
		params.set('cursor', cursor);
		return params.toString();
	}
</script>

<svelte:head>
	<title>Admin users — RTTLearn</title>
</svelte:head>

<PageHeader title="Admin users" />

<!-- Plain GET search form: keeps the search term in the URL, so it's shareable and paginates cleanly. -->
<form method="GET" class="search">
	<Field label="Search" id="q">
		<input id="q" name="q" value={data.q} />
	</Field>
	<Button type="submit">Search</Button>
</form>

<!-- Server-rendered error from the last failed role-change/deactivate/reset action. -->
{#if form?.error}
	<Alert tone="danger" role="alert">{form.error}</Alert>
{/if}

<!-- Shown once, right after a successful reset: the temporary password never persists past this
     render (not stored in a URL, cookie, or log). -->
{#if form?.temporaryPassword}
	<Alert tone="warning" role="status">
		Temporary password: <code>{form.temporaryPassword}</code>. They must change it at next sign-in.
	</Alert>
{/if}

{#if data.error}
	<Alert tone="danger">{data.error}</Alert>
{:else if data.page.items.length === 0}
	<Card><p class="muted">No users found.</p></Card>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Email</th>
					<th>Name</th>
					<th>Role</th>
					<th>Deactivated</th>
					<th></th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.page.items as u (u.id)}
					<tr>
						<td>{u.email}</td>
						<td>{u.display_name}</td>
						<td>
							<form method="POST" action="?/role" use:enhance class="inline">
								<input type="hidden" name="user_id" value={u.id} />
								<select name="role" aria-label="Role for {u.email}">
									<option value="student" selected={u.role === 'student'}>student</option>
									<option value="educator" selected={u.role === 'educator'}>educator</option>
									<option value="admin" selected={u.role === 'admin'}>admin</option>
								</select>
								<Button type="submit"
									>Save<span class="visually-hidden"> for {u.email}</span></Button
								>
							</form>
						</td>
						<td>{u.deactivated_at ?? 'No'}</td>
						<td>
							<form method="POST" action="?/deactivate" use:enhance>
								<input type="hidden" name="user_id" value={u.id} />
								<Button type="submit" variant="danger"
									>Deactivate<span class="visually-hidden"> for {u.email}</span></Button
								>
							</form>
						</td>
						<td>
							<form method="POST" action="?/reset" use:enhance>
								<input type="hidden" name="user_id" value={u.id} />
								<Button type="submit"
									>Reset password<span class="visually-hidden"> for {u.email}</span></Button
								>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if data.page.next_cursor}
	<p>
		<a href={resolve(`/(app)/admin/users?${nextPageQuery(data.page.next_cursor)}`)}>Next page</a>
	</p>
{/if}

<style>
	.muted {
		margin: 0;
		color: var(--text-muted);
	}

	.search {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		margin-block-end: var(--space-4);
	}
	.search :global(.field) {
		flex: 1 1 14rem;
		max-width: 20rem;
	}
	.table-wrap {
		/* Contains the absolutely-positioned visually-hidden row-button suffixes inside the scroller. */
		position: relative;
		overflow-x: auto;
	}
	.inline {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
</style>
