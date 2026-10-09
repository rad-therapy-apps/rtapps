<!--
	What this file does: the flashcard deck editor at `(app)/author/decks/[id]` -- a thin wrapper
	around `PairsEditor.svelte` (relabelled "Front"/"Back") plus title, and the shared
	`PublishPanel`.
	Used here and why: Svelte 5 runes; `access`/`config` have no UI here (no field asks for one)
	but are still echoed back verbatim in the save PUT -- `FlashcardDeckPutIn` replaces them
	wholesale, so omitting them would silently reset access/config to their Pydantic defaults
	(`access="practice"`, `config={}`) on every save. `dirty`/`saving`/`saveError`/`beforeNavigate`
	mirror `LessonEditor.svelte`'s idiom exactly.
	How it fits the project: `data.deck`/`data.versions`/`data.importNotes` come from this route's
	`load`; `FlashcardDeckPutIn` (Task 9) is what `save()` PUTs; `PublishPanel` (Task 10/15) is
	reused verbatim for the Publish tab. `FlashcardCard`'s wire shape (`term`/`definition`) is
	exactly `PairsEditor`'s row shape, so no mapping is needed either direction.
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
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'edit' | 'publish'>('edit');

	let title = $state(data.deck.title);
	let cards = $state(data.deck.cards);

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
			const res = await api.PUT('/api/v1/authoring/flashcard-decks/{activity_id}', {
				params: { path: { activity_id: data.deck.activity_id } },
				body: { title, access: data.deck.access, config: data.deck.config, cards }
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
	<title>{data.deck.title} — Author — RTTLearn</title>
</svelte:head>

<PageHeader title={data.deck.title} />

<div class="tabs" role="tablist" aria-label="Flashcard deck editor tabs">
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
		<Card as="section">
			<div class="stack">
				<Field label="Title" id="deck-title">
					<input
						id="deck-title"
						value={title}
						oninput={(e) => {
							title = e.currentTarget.value;
							markDirty();
						}}
					/>
				</Field>

				<PairsEditor
					rows={cards}
					onchange={(next) => {
						cards = next;
						markDirty();
					}}
					termLabel="Front"
					definitionLabel="Back"
					minRows={1}
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
			activityId={data.deck.activity_id}
			importNotes={data.importNotes}
			versions={data.versions}
		/>
	</div>
{/if}

<style>
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-block-end: var(--space-5);
		border-block-end: 1px solid var(--border-strong);
	}
	.tabs button {
		border-color: transparent;
		border-end-start-radius: 0;
		border-end-end-radius: 0;
		background: transparent;
		color: var(--text-muted);
		margin-block-end: -1px;
	}
	/* Selected tab: accent underline plus bold text, so colour is not the only signal. */
	.tabs button[aria-selected='true'] {
		background: var(--accent-soft);
		border-block-end: 3px solid var(--accent);
		color: var(--text);
		font-weight: 700;
	}
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
