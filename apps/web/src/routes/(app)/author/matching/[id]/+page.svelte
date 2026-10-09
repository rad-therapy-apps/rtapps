<!--
	What this file does: the matching activity editor at `(app)/author/matching/[id]` -- a thin
	wrapper around `PairsEditor.svelte` (term/definition, `minRows=2`) plus title, and the shared
	`PublishPanel`.
	Used here and why: Svelte 5 runes; `access`/`config` have no UI here but are still echoed back
	verbatim in the save PUT for the same reason as the deck route (`MatchingPutIn` replaces them
	wholesale). `dirty`/`saving`/`saveError`/`beforeNavigate` mirror `LessonEditor.svelte`'s idiom.
	How it fits the project: `data.matching`/`data.versions`/`data.importNotes` come from this
	route's `load`; `MatchingPutIn` (Task 9) is what `save()` PUTs; `PublishPanel` (Task 10/15) is
	reused verbatim for the Publish tab. `MatchingPair`'s wire shape (`term`/`definition`) is
	exactly `PairsEditor`'s row shape.
	Depends on: `$app/navigation` (`beforeNavigate`), `$lib/author/PairsEditor.svelte`,
	`$lib/author/PublishPanel.svelte`, `$lib/author/api` (`api`).
	Used by: reached from `(app)/author`'s dashboard.
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import PairsEditor from '$lib/author/PairsEditor.svelte';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import { api } from '$lib/author/api';
	import { problemDetail } from '$lib/author/problem';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'edit' | 'publish'>('edit');

	let title = $state(data.matching.title);
	let pairs = $state(data.matching.pairs);

	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function markDirty() {
		dirty = true;
	}

	async function save() {
		if (saving) return;
		saving = true;
		saveError = undefined;
		try {
			const res = await api.PUT('/api/v1/authoring/matching/{activity_id}', {
				params: { path: { activity_id: data.matching.activity_id } },
				body: { title, access: data.matching.access, config: data.matching.config, pairs }
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
	<title>{data.matching.title} — Author — RTTLearn</title>
</svelte:head>

<PageHeader title={data.matching.title} />

<Tabs
	tabs={[
		{ id: 'edit', label: 'Edit' },
		{ id: 'publish', label: 'Publish' }
	]}
	bind:selected={activeTab}
	label="Matching editor tabs"
/>

{#if activeTab === 'edit'}
	<div role="tabpanel">
		<Card as="section">
			<div class="stack">
				<Field label="Title" id="matching-title">
					<input
						id="matching-title"
						value={title}
						oninput={(e) => {
							title = e.currentTarget.value;
							markDirty();
						}}
					/>
				</Field>

				<PairsEditor
					rows={pairs}
					onchange={(next) => {
						pairs = next;
						markDirty();
					}}
					termLabel="Term"
					definitionLabel="Definition"
					minRows={2}
				/>

				<div class="save-controls">
					<Button variant="primary" onclick={save} disabled={!dirty || saving}>Save</Button>
					{#if saveError}
						<Alert tone="danger" role="alert">{saveError}</Alert>
					{/if}
				</div>
			</div>
		</Card>
	</div>
{:else}
	<div role="tabpanel">
		<PublishPanel
			activityId={data.matching.activity_id}
			importNotes={data.importNotes}
			versions={data.versions}
		/>
	</div>
{/if}

<style>
	.stack {
		display: grid;
		gap: var(--space-4);
	}
	.save-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}
</style>
