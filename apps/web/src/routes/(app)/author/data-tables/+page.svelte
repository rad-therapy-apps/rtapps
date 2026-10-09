<!--
	What this file does: the data-tables page at `(app)/author/data-tables` -- lists every
	author-editable numeric lookup table, edits one at a time (title + `GridEditor`, `PUT`
	upsert), and a "New calculator" form (title, subject, table-keys multi-select, `calc_type`
	select fed by `CALC_TYPES`) that creates a calculator activity and publishes it from its own row.
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
	`$lib/author/PublishPanel.svelte`, `$lib/author/api` (`api`), `$lib/author/types` (`Grid`),
	`$lib/calc/registry` (`CALC_TYPES`).
	Used by: reached from `(app)/author`'s dashboard ("Data tables" link).
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import GridEditor from '$lib/author/GridEditor.svelte';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { api } from '$lib/author/api';
	import { errorTitle, problemDetail } from '$lib/author/problem';
	import type { Grid } from '$lib/author/types';
	import { CALC_TYPES } from '$lib/calc/registry';
	import type { components } from '@rtapps/api-client';
	import type { PageData } from './$types';

	type DataTableOut = components['schemas']['DataTableOut'];
	type CalculatorAuthorOut = components['schemas']['CalculatorAuthorOut'];
	type VersionOut = components['schemas']['VersionOut'];

	let { data }: { data: PageData } = $props();

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
	let calcType = $state('mu');
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
					calc_type: calcType,
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
			calcType = 'mu';
			calcTableKeys = [];
		} catch {
			calcError = 'Request failed';
		} finally {
			calcSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Data tables — Author — RTTLearn</title>
</svelte:head>

<PageHeader title="Data tables" />

<div class="sections">
	<Card as="section">
		<h2>Tables ({tables.length})</h2>
		{#if tables.length === 0}
			<p>No data tables yet.</p>
		{:else}
			<ul class="table-list">
				{#each tables as table (table.key)}
					<li>
						<Button onclick={() => editTable(table)}>{table.title}</Button>
						(<code>{table.key}</code>)
					</li>
				{/each}
			</ul>
		{/if}
		<Button variant="primary" onclick={newTable}>New table</Button>
	</Card>

	{#if editing}
		<Card as="section">
			<div class="stack">
				<h2>{editing.isNew ? 'New table' : `Edit ${editing.title}`}</h2>
				<Field label="Key" id="dt-key">
					<input
						id="dt-key"
						value={editing.key}
						disabled={!editing.isNew}
						oninput={(e) => setKey(e.currentTarget.value)}
					/>
				</Field>
				<Field label="Title" id="dt-title">
					<input
						id="dt-title"
						value={editing.title}
						oninput={(e) => setTitle(e.currentTarget.value)}
					/>
				</Field>

				{#key editing.session}
					<GridEditor initialGrid={editing.grid} onchange={setGrid} />
				{/key}

				<div class="save-controls">
					<Button variant="primary" onclick={saveTable} disabled={saving}>Save table</Button>
					<Button variant="ghost" onclick={cancelEdit}>Cancel</Button>
					{#if saveError}
						<Alert tone="danger" role="alert">{saveError}</Alert>
					{/if}
				</div>
			</div>
		</Card>
	{/if}

	<Card as="section">
		<div class="stack">
			<h2>New calculator</h2>
			<Field label="Title" id="calc-title">
				<input
					id="calc-title"
					value={calcTitle}
					oninput={(e) => (calcTitle = e.currentTarget.value)}
				/>
			</Field>
			<Field label="Subject" id="calc-subject">
				<select
					id="calc-subject"
					value={calcSubjectSlug}
					onchange={(e) => (calcSubjectSlug = e.currentTarget.value)}
				>
					{#each data.subjects as subject (subject.id)}
						<option value={subject.slug}>{subject.title}</option>
					{/each}
				</select>
			</Field>
			<fieldset>
				<legend>Table keys</legend>
				{#if tables.length === 0}
					<p>No data tables to reference yet.</p>
				{:else}
					<div class="checks">
						{#each tables as table (table.key)}
							<label class="check">
								<input
									type="checkbox"
									checked={calcTableKeys.includes(table.key)}
									onchange={(e) => toggleTableKey(table.key, e.currentTarget.checked)}
								/>
								{table.key} — {table.title}
							</label>
						{/each}
					</div>
				{/if}
			</fieldset>
			<Field label="Calc type" id="calc-type">
				<select
					id="calc-type"
					value={calcType}
					onchange={(e) => (calcType = e.currentTarget.value)}
				>
					{#each CALC_TYPES as type (type)}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</Field>
			<div class="save-controls">
				<Button variant="primary" onclick={createCalculator} disabled={calcSaving}>
					Create calculator
				</Button>
				{#if calcError}
					<Alert tone="danger" role="alert">{calcError}</Alert>
				{/if}
			</div>
		</div>
	</Card>

	{#if createdCalculator}
		<Card as="section">
			<h3>
				{createdCalculator.title} ({createdCalculator.subject_slug}) — {createdCalculator.status}
			</h3>
			<PublishPanel
				activityId={createdCalculator.activity_id}
				importNotes={[]}
				versions={calcVersions}
			/>
		</Card>
	{/if}
</div>

<style>
	.sections {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	.stack {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}
	.table-list {
		display: grid;
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}
	.checks {
		display: grid;
		gap: var(--space-2);
	}
	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.save-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}
</style>
