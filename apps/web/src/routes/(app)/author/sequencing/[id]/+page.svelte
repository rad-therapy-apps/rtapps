<!--
	What this file does: the sequencing activity editor at `(app)/author/sequencing/[id]` --
	ordered label/detail rows with move up/down (the on-screen order IS the correct answer),
	title, and the shared `PublishPanel`.
	Used here and why: Svelte 5 runes; no `PairsEditor` here -- a sequencing item's shape
	(`label`/`detail`) isn't a term/definition pair, so the duplicate-label warning is done
	directly against `$lib/author/duplicates` (the same rule `_SequencingContentMixin
	._unique_labels` enforces server-side as a 422, surfaced here before saving instead).
	`access`/`config` have no UI here but are still echoed back verbatim in the save PUT, same
	reason as the deck/matching routes (`SequencingPutIn` replaces them wholesale).
	`dirty`/`saving`/`saveError`/`beforeNavigate` mirror `LessonEditor.svelte`'s idiom.
	How it fits the project: `data.sequencing`/`data.versions`/`data.importNotes` come from this
	route's `load`; `SequencingPutIn` (Task 9) is what `save()` PUTs; `PublishPanel` (Task 10/15)
	is reused verbatim for the Publish tab.
	Depends on: `$app/navigation` (`beforeNavigate`), `$lib/author/duplicates` (`duplicates`),
	`$lib/author/PublishPanel.svelte`, `$lib/author/api` (`api`).
	Used by: reached from `(app)/author`'s dashboard.
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { duplicates } from '$lib/author/duplicates';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import { api } from '$lib/author/api';
	import { problemDetail } from '$lib/author/problem';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'edit' | 'publish'>('edit');

	let title = $state(data.sequencing.title);
	let items = $state(data.sequencing.items);

	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	const duplicateLabels = $derived(duplicates(items.map((i) => i.label)));

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function markDirty() {
		dirty = true;
	}

	function setLabel(index: number, label: string) {
		items = items.map((item, i) => (i === index ? { ...item, label } : item));
		markDirty();
	}
	function setDetail(index: number, detail: string) {
		items = items.map((item, i) => (i === index ? { ...item, detail: detail || null } : item));
		markDirty();
	}
	function addItem() {
		items = [...items, { label: '', detail: null }];
		markDirty();
	}
	function moveItem(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= items.length) return;
		const next = [...items];
		[next[index], next[target]] = [next[target], next[index]];
		items = next;
		markDirty();
	}
	function removeItem(index: number) {
		if (items.length <= 2) return; // SequencingPutIn.items requires at least 2
		items = items.filter((_, i) => i !== index);
		markDirty();
	}

	async function save() {
		if (saving) return;
		saving = true;
		saveError = undefined;
		try {
			const res = await api.PUT('/api/v1/authoring/sequencing/{activity_id}', {
				params: { path: { activity_id: data.sequencing.activity_id } },
				body: {
					title,
					access: data.sequencing.access,
					config: data.sequencing.config,
					items
				}
			});
			if (res.error) {
				saveError = problemDetail(res.error);
				return;
			}
			dirty = false;
		} catch {
			saveError = 'Request failed';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{data.sequencing.title} — Author — RTTLearn</title>
</svelte:head>

<h1>{data.sequencing.title}</h1>

<div role="tablist" aria-label="Sequencing editor tabs">
	<button
		type="button"
		role="tab"
		aria-selected={activeTab === 'edit'}
		onclick={() => (activeTab = 'edit')}
	>
		Edit
	</button>
	<button
		type="button"
		role="tab"
		aria-selected={activeTab === 'publish'}
		onclick={() => (activeTab = 'publish')}
	>
		Publish
	</button>
</div>

{#if activeTab === 'edit'}
	<div role="tabpanel">
		<label>
			Title
			<input
				value={title}
				oninput={(e) => {
					title = e.currentTarget.value;
					markDirty();
				}}
			/>
		</label>

		<p class="hint">
			The order below IS the correct answer -- students must drag/arrange items to match this
			sequence exactly.
		</p>

		<ol class="sequencing-list">
			{#each items as item, i (i)}
				<li class="sequencing-row">
					<input
						value={item.label}
						oninput={(e) => setLabel(i, e.currentTarget.value)}
						aria-invalid={duplicateLabels.has(item.label)}
						aria-label={`Item ${i + 1} label`}
					/>
					<input
						value={item.detail ?? ''}
						oninput={(e) => setDetail(i, e.currentTarget.value)}
						placeholder="Detail (optional)"
						aria-label={`Item ${i + 1} detail`}
					/>
					<button type="button" onclick={() => moveItem(i, -1)} disabled={i === 0}>
						Move up
					</button>
					<button type="button" onclick={() => moveItem(i, 1)} disabled={i === items.length - 1}>
						Move down
					</button>
					<button type="button" onclick={() => removeItem(i)} disabled={items.length <= 2}>
						Remove
					</button>
				</li>
			{/each}
		</ol>
		<button type="button" onclick={addItem}>Add item</button>

		{#if duplicateLabels.size > 0}
			<p role="alert">Duplicate labels: {[...duplicateLabels].join(', ')}</p>
		{/if}

		<div class="save-controls">
			<button type="button" onclick={save} disabled={!dirty || saving}>Save</button>
			{#if saveError}
				<p role="alert">{saveError}</p>
			{/if}
		</div>
	</div>
{:else}
	<div role="tabpanel">
		<PublishPanel
			activityId={data.sequencing.activity_id}
			importNotes={data.importNotes}
			versions={data.versions}
		/>
	</div>
{/if}

<style>
	.sequencing-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-block: 0.5rem;
	}
	.hint {
		font-size: 0.9em;
		opacity: 0.8;
	}
</style>
