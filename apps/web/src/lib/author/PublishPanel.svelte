<!--
	What this file does: the Publish tab — the migrated-content review notes (import_notes), a
	change-note input, a busy-guarded Publish button with a confirm dialog, and the version
	history (version, date, author, note).
	Used here and why: Svelte 5 runes (`$props`, `$state`); `post` defaults to the real API client
	(`$lib/author/api`'s `api.POST`) but is overridable, same injectable pattern as
	`LessonEditor.svelte`'s `put`. `publish()` is busy-guarded with try/catch/finally so a failed
	request never wedges the button. On success it calls `invalidateAll()` (`$app/navigation`) so
	`+page.server.ts`'s `load` reruns — the fresh `versions` list and any status change flow back
	down through `data`/props rather than this component patching its own copy.
	How it fits the project: the publish half of Task 15/10 — `POST /authoring/activities/{id}/publish`
	freezes the working copy into the next immutable version; `import_notes` is the migrated-content
	review queue (Task 4) so an educator sees what the importer flagged before publishing over it.
	Depends on: `$app/navigation` (`invalidateAll`), `./api` (`api`), `@rtapps/api-client`
	(`components['schemas']['VersionOut']`).
	Used by: `+page.svelte` (Publish tab).
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from './api';
	import type { components } from '@rtapps/api-client';

	type VersionOut = components['schemas']['VersionOut'];

	let {
		activityId,
		importNotes,
		versions,
		post = api.POST
	}: {
		activityId: string;
		importNotes: string[];
		versions: VersionOut[];
		post?: typeof api.POST;
	} = $props();

	let changeNote = $state('');
	let publishing = $state(false);
	let publishError = $state<string | undefined>(undefined);

	async function publish() {
		if (publishing) return;
		if (!confirm('Publish this activity? Students will see the new version immediately.')) return;
		publishing = true;
		publishError = undefined;
		try {
			const res = await post('/api/v1/authoring/activities/{activity_id}/publish', {
				params: { path: { activity_id: activityId } },
				body: { change_note: changeNote || null }
			});
			if (res.error) {
				// Same RFC 9457 fallback as LessonEditor.svelte/attempts.ts: apps/api's global
				// exception handlers return a problem+json body with `title`.
				publishError = (res.error as { title?: string }).title ?? 'Request failed';
				return;
			}
			changeNote = '';
			await invalidateAll();
		} catch {
			publishError = 'Request failed';
		} finally {
			publishing = false;
		}
	}
</script>

<div class="publish-panel">
	<section>
		<h2>Needs review ({importNotes.length})</h2>
		{#if importNotes.length === 0}
			<p>Nothing flagged.</p>
		{:else}
			<ul>
				<!-- Keyed on position, not `note` itself (Task 18): the same converter note text
					 (e.g. "highlight→bold") legitimately repeats once per occurrence on a real
					 migrated lesson, and a keyed-each requires unique keys — keying on the value
					 threw `each_key_duplicate` and broke this whole tab whenever a lesson had more
					 than one identical note. -->
				{#each importNotes as note, i (i)}
					<li>{note}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h2>Publish</h2>
		<label>
			Change note
			<textarea bind:value={changeNote}></textarea>
		</label>
		<button type="button" onclick={publish} disabled={publishing}>Publish</button>
		{#if publishError}
			<p role="alert">{publishError}</p>
		{/if}
	</section>

	<section>
		<h2>Version history</h2>
		{#if versions.length === 0}
			<p>Never published.</p>
		{:else}
			<ul>
				{#each versions as version (version.id)}
					<li>
						v{version.version} — {version.published_at} — {version.author_display_name ?? 'Unknown'}
						{#if version.change_note}
							— {version.change_note}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
