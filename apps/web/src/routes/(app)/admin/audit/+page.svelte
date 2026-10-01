<!--
	What this file does: Admin audit log page at `(app)/admin/audit`. Lists audit rows, filterable
	by action.

	Used here and why: a plain `GET` form for the action filter so it's a shareable/bookmarkable
	URL; Svelte 5 runes (`$props()`); no `use:enhance`/`resolve()` needed — this page has no POST
	actions or internal links.

	How it fits the project: `data.rows`/`data.action` come from this route's `load`
	(`GET /admin/audit-log?action=&limit=100`); `guard.ts` already restricts `/admin/*` to the
	admin role.

	Used by: reached from the nav's "Admin" area (linked from `(app)/admin/users`, if added) or
	directly at `/admin/audit`.
-->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin audit log — RTTLearn</title>
</svelte:head>

<h1>Admin audit log</h1>

<!-- Plain GET filter form: keeps the action filter in the URL, so it's shareable. -->
<form method="GET">
	<label for="action">Action</label>
	<input id="action" name="action" value={data.action} />
	<button>Filter</button>
</form>

{#if data.error}
	<p>{data.error}</p>
{:else if data.rows.length === 0}
	<p>No audit rows found.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Time</th>
				<th>Actor</th>
				<th>Action</th>
				<th>Target</th>
				<th>Cohort</th>
				<th>IP</th>
				<th>Request id</th>
				<th>Detail</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (row.id)}
				<tr>
					<td>{row.at}</td>
					<td>{row.actor_email ?? row.actor_id ?? '—'}</td>
					<td>{row.action}</td>
					<td>{row.target_type} {row.target_id ?? '—'}</td>
					<td>{row.cohort_id ?? '—'}</td>
					<td>{row.ip ?? '—'}</td>
					<td>{row.request_id ?? '—'}</td>
					<td>{JSON.stringify(row.detail)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
