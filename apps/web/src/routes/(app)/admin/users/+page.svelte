<!--
	What this file does: Admin users page at `(app)/admin/users`. Search by email/name, and per-row
	change a user's role or deactivate them.

	Used here and why: `use:enhance` on the role/deactivate forms for progressive enhancement; a
	plain `GET` form for search so it's a shareable/bookmarkable URL; `resolve()` for the "Next
	page" link, per `svelte/no-navigation-without-resolve`; Svelte 5 runes (`$props()`).

	How it fits the project: `data.page`/`data.q` come from this route's `load`
	(`GET /admin/users?q=&cursor=`); the role/deactivate forms post to the `role`/`deactivate`
	actions (`PATCH /admin/users/{id}/role`, `POST /admin/users/{id}/deactivate`); `guard.ts`
	already restricts `/admin/*` to the admin role.

	Works with: `$app/forms`, `$app/paths`. Used by: reached from the nav's "Admin" link.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
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
	<title>Admin users — RTApps</title>
</svelte:head>

<h1>Admin users</h1>

<!-- Plain GET search form: keeps the search term in the URL, so it's shareable and paginates cleanly. -->
<form method="GET">
	<label for="q">Search</label>
	<input id="q" name="q" value={data.q} />
	<button>Search</button>
</form>

<!-- Server-rendered error from the last failed role-change/deactivate action. -->
{#if form?.error}
	<p role="alert">{form.error}</p>
{/if}

{#if data.error}
	<p>{data.error}</p>
{:else if data.page.items.length === 0}
	<p>No users found.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Email</th>
				<th>Name</th>
				<th>Role</th>
				<th>Deactivated</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.page.items as u (u.id)}
				<tr>
					<td>{u.email}</td>
					<td>{u.display_name}</td>
					<td>
						<form method="POST" action="?/role" use:enhance>
							<input type="hidden" name="user_id" value={u.id} />
							<select name="role">
								<option value="student" selected={u.role === 'student'}>student</option>
								<option value="educator" selected={u.role === 'educator'}>educator</option>
								<option value="admin" selected={u.role === 'admin'}>admin</option>
							</select>
							<button>Save</button>
						</form>
					</td>
					<td>{u.deactivated_at ?? 'No'}</td>
					<td>
						<form method="POST" action="?/deactivate" use:enhance>
							<input type="hidden" name="user_id" value={u.id} />
							<button>Deactivate</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

{#if data.page.next_cursor}
	<a href={resolve(`/(app)/admin/users?${nextPageQuery(data.page.next_cursor)}`)}>Next page</a>
{/if}
