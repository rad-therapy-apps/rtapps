<!--
	What this file does: Admin audit log page at `(app)/admin/audit`. Lists audit rows, filterable
	by action.

	Used here and why: the `$lib/ui` kit (PageHeader, Field, Button, Alert); a plain `GET` form for the action filter so it's a shareable/bookmarkable
	URL; Svelte 5 runes (`$props()`); no `use:enhance`/`resolve()` needed — this page has no POST
	actions or internal links.

	How it fits the project: `data.rows`/`data.action` come from this route's `load`
	(`GET /admin/audit-log?action=&limit=100`); `guard.ts` already restricts `/admin/*` to the
	admin role.

	Used by: reached from the nav's "Admin" area (linked from `(app)/admin/users`, if added) or
	directly at `/admin/audit`.
-->
<script lang="ts">
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin audit log — RTTLearn</title>
</svelte:head>

<PageHeader title="Admin audit log" />

<!-- Plain GET filter form: keeps the action filter in the URL, so it's shareable. -->
<form method="GET" class="filter">
	<Field label="Action" id="action">
		<input id="action" name="action" value={data.action} />
	</Field>
	<Button type="submit">Filter</Button>
</form>

{#if data.error}
	<Alert tone="danger">{data.error}</Alert>
{:else if data.rows.length === 0}
	<Card><p class="muted">No audit rows found.</p></Card>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="table-wrap" role="region" aria-label="Audit log" tabindex="0">
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
						<td class="num">{row.at}</td>
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
	</div>
{/if}

<style>
	.muted {
		margin: 0;
		color: var(--text-muted);
	}

	.filter {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		margin-block-end: var(--space-4);
	}
	.filter :global(.field) {
		flex: 1 1 14rem;
		max-width: 20rem;
	}
	.table-wrap {
		overflow-x: auto;
	}
	.num {
		font-variant-numeric: tabular-nums;
	}
</style>
