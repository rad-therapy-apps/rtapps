<!--
	What this file does: the data-tables page at `(app)/author/data-tables` -- lists every
	author-editable numeric lookup table, edits one at a time (title + `GridEditor`, `PUT`
	upsert), and a "New calculator" form (title, subject, table-keys multi-select, `calc_type`
	fixed "mu") that creates a calculator activity and publishes it from its own row.
	Used here and why: `editing` (null | { key, title, grid, isNew }) holds the one table being
	worked on; selecting a different table (or "New table") re-seeds it, guarded by the same
	dirty-discard confirm `beforeNavigate` uses so a mid-edit switch can't silently drop work.
	`GridEditor` is wrapped in `{#key editing.key}` (using a `session` counter for "new table" so
	two successive "New table" clicks each get a fresh seed) so switching tables reseeds
	`GridEditor`'s own working copy instead of merging two tables' state -- the same reason
	`LessonEditor.svelte` keys each block's `RichTextEditor` on `instanceId`. `DataTableOut.grid`
	is untyped JSON on the wire (same reason `LessonAuthorOut.pages` is), cast to `Grid` once at
	selection time. There is no `GET /authoring/calculators` (list) route (Task 11 never added
	one -- calculators aren't otherwise browsable), so a created calculator's `PublishPanel` only
	ever shows the version(s) published in *this* session's `calcVersions`; the calculator itself
	still shows up on the `(app)/author` dashboard afterwards (as plain text -- that page has no
	editor route for calculators either).
	How it fits the project: `data.tables`/`data.subjects` come from this route's `load`;
	`DataTablePutIn` (Task 11) is what a table save PUTs; `CalculatorCreateIn`/`POST
	/authoring/calculators` (Task 11) is what the calculator form posts; `PublishPanel` (Task
	10/15) is reused verbatim.
	Depends on: `$app/navigation` (`beforeNavigate`), `$lib/author/GridEditor.svelte`,
	`$lib/author/PublishPanel.svelte`, `$lib/author/api` (`api`), `$lib/author/types` (`Grid`).
	Used by: reached from `(app)/author`'s dashboard ("Data tables" link).
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import GridEditor from '$lib/author/GridEditor.svelte';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import { api } from '$lib/author/api';
	import type { Grid } from '$lib/author/types';
	import type { components } from '@rtapps/api-client';
	import type { PageData } from './$types';

	type DataTableOut = components['schemas']['DataTableOut'];
	type CalculatorAuthorOut = components['schemas']['CalculatorAuthorOut'];
	type VersionOut = components['schemas']['VersionOut'];

	let { data }: { data: PageData } = $props();

	function errorTitle(error: unknown): string {
		return (error as { title?: string }).title ?? 'Request failed';
	}

	function problemDetail(problem: unknown): string {
		if (problem && typeof problem === 'object') {
			const { title, detail, errors } = problem as {
				title?: unknown;
				detail?: unknown;
				errors?: unknown;
			};
			if (Array.isArray(errors) && errors.length > 0) {
				const parts = errors
					.map((e) => {
						if (!e || typeof e !== 'object') return undefined;
						const { loc, msg } = e as { loc?: unknown; msg?: unknown };
						if (typeof msg !== 'string') return undefined;
						const path = Array.isArray(loc) ? loc.join('.') : undefined;
						return path ? `${path}: ${msg}` : msg;
					})
					.filter((part): part is string => Boolean(part));
				if (parts.length > 0) return parts.join('; ');
			}
			if (typeof detail === 'string' && detail) return detail;
			if (typeof title === 'string' && title) return title;
		}
		return 'Request failed';
	}

	const EMPTY_GRID: Grid = {
		row_label: '',
		col_label: '',
		cols: [0],
		rows: [{ key: 0, values: [0] }]
	};

	type EditingTable = { session: number; key: string; title: string; grid: Grid; isNew: boolean };

	let tables = $state(data.tables);
	let editing = $state<EditingTable | null>(null);
	let nextSession = $state(0);

	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function confirmDiscard(): boolean {
		return !dirty || confirm('Discard unsaved changes?');
	}

	function editTable(table: DataTableOut) {
		if (!confirmDiscard()) return;
		nextSession += 1;
		editing = {
			session: nextSession,
			key: table.key,
			title: table.title,
			grid: table.grid as unknown as Grid,
			isNew: false
		};
		dirty = false;
		saveError = undefined;
	}

	function newTable() {
		if (!confirmDiscard()) return;
		nextSession += 1;
		editing = {
			session: nextSession,
			key: '',
			title: '',
			grid: structuredClone(EMPTY_GRID),
			isNew: true
		};
		dirty = false;
		saveError = undefined;
	}

	function cancelEdit() {
		if (!confirmDiscard()) return;
		editing = null;
		dirty = false;
		saveError = undefined;
	}

	function setKey(key: string) {
		if (!editing) return;
		editing = { ...editing, key };
		dirty = true;
	}
	function setTitle(title: string) {
		if (!editing) return;
		editing = { ...editing, title };
		dirty = true;
	}
	function setGrid(grid: Grid) {
		if (!editing) return;
		editing = { ...editing, grid };
		dirty = true;
	}

	async function saveTable() {
		if (!editing || saving) return;
		const key = editing.key.trim();
		if (key === '') {
			saveError = 'Key is required.';
			return;
		}
		saving = true;
		saveError = undefined;
		try {
			const res = await api.PUT('/api/v1/authoring/data-tables/{key}', {
				params: { path: { key } },
				body: { title: editing.title, grid: editing.grid }
			});
			if (res.error) {
				saveError = problemDetail(res.error);
				return;
			}
			const saved = res.data;
			tables = tables.some((t) => t.key === saved.key)
				? tables.map((t) => (t.key === saved.key ? saved : t))
				: [...tables, saved].sort((a, b) => a.key.localeCompare(b.key));
			editing = { ...editing, key: saved.key, isNew: false };
			dirty = false;
		} catch {
			saveError = 'Request failed';
		} finally {
			saving = false;
		}
	}

	// --- new calculator ---

	let calcTitle = $state('');
	let calcSubjectSlug = $state(data.subjects[0]?.slug ?? '');
	let calcTableKeys = $state<string[]>([]);
	let calcSaving = $state(false);
	let calcError = $state<string | undefined>(undefined);
	let createdCalculator = $state<CalculatorAuthorOut | null>(null);
	// No `GET /authoring/calculators` (list) route exists, so there is nothing to re-fetch after
	// a publish -- this panel only ever reflects what happened in this session (see file header).
	let calcVersions = $state<VersionOut[]>([]);

	function toggleTableKey(key: string, checked: boolean) {
		calcTableKeys = checked ? [...calcTableKeys, key] : calcTableKeys.filter((k) => k !== key);
	}

	async function createCalculator() {
		if (calcSaving) return;
		calcSaving = true;
		calcError = undefined;
		try {
			const res = await api.POST('/api/v1/authoring/calculators', {
				body: {
					title: calcTitle,
					subject_slug: calcSubjectSlug,
					calc_type: 'mu',
					data_tables: calcTableKeys
				}
			});
			if (res.error) {
				calcError = errorTitle(res.error);
				return;
			}
			createdCalculator = res.data;
			calcVersions = [];
			calcTitle = '';
			calcTableKeys = [];
		} catch {
			calcError = 'Request failed';
		} finally {
			calcSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Data tables — Author — RTApps</title>
</svelte:head>

<h1>Data tables</h1>

<section>
	<h2>Tables ({tables.length})</h2>
	{#if tables.length === 0}
		<p>No data tables yet.</p>
	{:else}
		<ul>
			{#each tables as table (table.key)}
				<li>
					<button type="button" onclick={() => editTable(table)}>{table.title}</button>
					(<code>{table.key}</code>)
				</li>
			{/each}
		</ul>
	{/if}
	<button type="button" onclick={newTable}>New table</button>
</section>

{#if editing}
	<section>
		<h2>{editing.isNew ? 'New table' : `Edit ${editing.title}`}</h2>
		<label>
			Key
			<input
				value={editing.key}
				disabled={!editing.isNew}
				oninput={(e) => setKey(e.currentTarget.value)}
			/>
		</label>
		<label>
			Title
			<input value={editing.title} oninput={(e) => setTitle(e.currentTarget.value)} />
		</label>

		{#key editing.session}
			<GridEditor initialGrid={editing.grid} onchange={setGrid} />
		{/key}

		<div class="save-controls">
			<button type="button" onclick={saveTable} disabled={saving}>Save table</button>
			<button type="button" onclick={cancelEdit}>Cancel</button>
			{#if saveError}
				<p role="alert">{saveError}</p>
			{/if}
		</div>
	</section>
{/if}

<section>
	<h2>New calculator</h2>
	<label>
		Title
		<input value={calcTitle} oninput={(e) => (calcTitle = e.currentTarget.value)} />
	</label>
	<label>
		Subject
		<select value={calcSubjectSlug} onchange={(e) => (calcSubjectSlug = e.currentTarget.value)}>
			{#each data.subjects as subject (subject.id)}
				<option value={subject.slug}>{subject.title}</option>
			{/each}
		</select>
	</label>
	<fieldset>
		<legend>Table keys</legend>
		{#if tables.length === 0}
			<p>No data tables to reference yet.</p>
		{:else}
			{#each tables as table (table.key)}
				<label>
					<input
						type="checkbox"
						checked={calcTableKeys.includes(table.key)}
						onchange={(e) => toggleTableKey(table.key, e.currentTarget.checked)}
					/>
					{table.key} — {table.title}
				</label>
			{/each}
		{/if}
	</fieldset>
	<p>Calc type: <code>mu</code></p>
	<button type="button" onclick={createCalculator} disabled={calcSaving}>Create calculator</button>
	{#if calcError}
		<p role="alert">{calcError}</p>
	{/if}
</section>

{#if createdCalculator}
	<section>
		<h3>
			{createdCalculator.title} ({createdCalculator.subject_slug}) — {createdCalculator.status}
		</h3>
		<PublishPanel
			activityId={createdCalculator.activity_id}
			importNotes={[]}
			versions={calcVersions}
		/>
	</section>
{/if}
