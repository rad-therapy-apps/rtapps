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
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
	<title>{data.deck.title} — Author — RTApps</title>
</svelte:head>

<h1>{data.deck.title}</h1>

<div role="tablist" aria-label="Flashcard deck editor tabs">
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
			<button type="button" onclick={save} disabled={!dirty || saving}>Save</button>
			{#if saveError}
				<p role="alert">{saveError}</p>
			{/if}
		</div>
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
