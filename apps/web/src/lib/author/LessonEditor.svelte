<!--
	What this file does: the Edit tab of a lesson's editor — a page/block tree editor (rich-text
	blocks via RichTextEditor, knowledge-check blocks via KnowledgeCheckForm), image insertion,
	dirty tracking, and a save button that PUTs the whole page tree back.
	Used here and why: editor state is one `$state` array of `ClientPage` (the `AuthorPage` shape
	plus a per-block `instanceId` — see `./types.ts`); every mutation handler sets `dirty = true`
	directly rather than deriving it via a deep-compare (cheap, and matches the brief). `put`
	defaults to the real API client (`$lib/author/api`'s `api.PUT`) but is overridable, the same
	injectable-client pattern `$lib/activity/attempts.ts`'s players use for `post`, so
	`LessonEditor.svelte.spec.ts` can assert on the exact PUT body without a network call. `save`
	is busy-guarded with try/catch/finally so a failed request can never wedge the button (the
	plan-3a players' rule — see `KnowledgeCheck.svelte`/`LessonPager.svelte`). Each RichTextEditor
	mount is wrapped in `{#key block.instanceId}` (never array index) so TipTap's one-time-mount
	contract (Task 14) survives reordering a block. `beforeNavigate` blocks leaving the page with
	unsaved changes.
	How it fits the project: the core of Task 15's lesson editor; `+page.svelte` renders this for
	the Edit tab. `PagesIn`/`KnowledgeCheckImport`/`RichTextImport` are Task 8's authoring wire
	shapes; `replace_lesson_pages` (apps/api) is what actually persists the PUT.
	Depends on: `$app/navigation` (`beforeNavigate`), `./RichTextEditor.svelte`,
	`./KnowledgeCheckForm.svelte`, `./uploadImage` (`uploadImage`, `AuthorApi`), `./api` (`api`),
	`./types` (`AuthorPage`, `ClientPage`, `ClientBlock`).
	Used by: `+page.svelte` (Edit tab), `LessonEditor.svelte.spec.ts`.
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import RichTextEditor from './RichTextEditor.svelte';
	import KnowledgeCheckForm from './KnowledgeCheckForm.svelte';
	import { uploadImage, type AuthorApi } from './uploadImage';
	import { api } from './api';
	import type { AuthorPage, ClientPage, ClientBlock } from './types';
	import type { ProseDoc } from '../prose/types';
	import type { components } from '@rtapps/api-client';

	type PagesIn = components['schemas']['PagesIn'];

	// Same RFC 9457 fallback as attempts.ts/KnowledgeCheck.svelte: apps/api's global exception
	// handlers return a problem+json body with `title` for every error response.
	function errorTitle(error: unknown): string {
		return (error as { title?: string }).title ?? 'Request failed';
	}

	// The real AuthorApi wiring for uploadImage, built on the same injected `put`'s sibling
	// (`api.POST`) — a default so `LessonEditor.svelte.spec.ts` never needs to exercise it.
	// Declared before the `$props()` destructuring below so it exists as a default value.
	const defaultAuthorApi: AuthorApi = {
		async presign(body) {
			const res = await api.POST('/api/v1/authoring/media/presign', { body });
			if (res.error) throw new Error(errorTitle(res.error));
			return res.data;
		},
		async confirm(id) {
			const res = await api.POST('/api/v1/authoring/media/{asset_id}/confirm', {
				params: { path: { asset_id: id } }
			});
			if (res.error) throw new Error(errorTitle(res.error));
		}
	};

	let {
		lessonId,
		initialPages,
		put = api.PUT,
		authorApi = defaultAuthorApi
	}: {
		lessonId: string;
		initialPages: AuthorPage[];
		put?: typeof api.PUT;
		authorApi?: AuthorApi;
	} = $props();

	const EMPTY_DOC: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

	// The 422 body's `errors[]` carries a full JSON path per entry (`loc`), unlike
	// `$lib/server/auth-forms.ts`'s `problemMessage` (server-only, unusable from a client
	// component) which collapses `loc` to its last segment — shown here in full so the path is
	// actually visible to the author.
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

	// Maps the loaded wire shape into client state once, attaching a stable instanceId per block
	// (see ./types.ts) so reordering never remounts a RichTextEditor.
	function toClientPages(pages: AuthorPage[]): ClientPage[] {
		return pages.map((page) => ({
			title: page.title,
			blocks: page.blocks.map((block) => ({ ...block, instanceId: crypto.randomUUID() }))
		}));
	}

	let pages = $state<ClientPage[]>(toClientPages(initialPages));
	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function markDirty() {
		dirty = true;
	}

	// --- page operations ---

	function addPage() {
		pages = [...pages, { title: 'Untitled page', blocks: [] }];
		markDirty();
	}

	function movePage(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= pages.length) return;
		const next = [...pages];
		[next[index], next[target]] = [next[target], next[index]];
		pages = next;
		markDirty();
	}

	function deletePage(index: number) {
		if (!confirm('Delete this page?')) return;
		pages = pages.filter((_, i) => i !== index);
		markDirty();
	}

	function retitlePage(index: number, title: string) {
		pages = pages.map((page, i) => (i === index ? { ...page, title } : page));
		markDirty();
	}

	// --- block operations ---

	function addBlock(pageIndex: number, type: 'rich_text' | 'knowledge_check') {
		const block: ClientBlock =
			type === 'rich_text'
				? { instanceId: crypto.randomUUID(), type: 'rich_text', body: structuredClone(EMPTY_DOC) }
				: {
						instanceId: crypto.randomUUID(),
						type: 'knowledge_check',
						// A short, unique-enough default; authors can't edit it once saved (it's the
						// stable grading identifier), so this is only ever a fresh block's starting value.
						key: `kc_${crypto.randomUUID().slice(0, 8)}`,
						stem: structuredClone(EMPTY_DOC),
						options: ['', ''],
						answer: 0,
						explanation: null
					};
		pages = pages.map((page, i) =>
			i === pageIndex ? { ...page, blocks: [...page.blocks, block] } : page
		);
		markDirty();
	}

	function moveBlock(pageIndex: number, blockIndex: number, direction: -1 | 1) {
		const page = pages[pageIndex];
		const target = blockIndex + direction;
		if (target < 0 || target >= page.blocks.length) return;
		const blocks = [...page.blocks];
		[blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]];
		pages = pages.map((p, i) => (i === pageIndex ? { ...p, blocks } : p));
		markDirty();
	}

	function deleteBlock(pageIndex: number, blockIndex: number) {
		if (!confirm('Delete this block?')) return;
		pages = pages.map((page, i) =>
			i === pageIndex ? { ...page, blocks: page.blocks.filter((_, bi) => bi !== blockIndex) } : page
		);
		markDirty();
	}

	function updateBlock(pageIndex: number, blockIndex: number, next: ClientBlock) {
		pages = pages.map((page, i) =>
			i === pageIndex
				? { ...page, blocks: page.blocks.map((b, bi) => (bi === blockIndex ? next : b)) }
				: page
		);
		markDirty();
	}

	// --- image insertion (RichTextEditor's `oninsertimage`) ---

	// Opens a native file picker and resolves with the chosen file, or null if the user cancels.
	// `<input type=file>`'s `cancel` event (widely supported since 2022) is what makes the null
	// case observable at all — there is no other signal a picker was dismissed.
	function pickFile(): Promise<File | null> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
			input.addEventListener('cancel', () => resolve(null), { once: true });
			input.click();
		});
	}

	async function insertImage(): Promise<{ mediaAssetId: string; alt: string } | null> {
		const file = await pickFile();
		if (!file) return null;
		return uploadImage(file, authorApi);
	}

	// --- save ---

	// Strips `instanceId` and maps back to the PagesIn wire shape.
	function toPagesIn(): PagesIn {
		return {
			pages: pages.map((page) => ({
				title: page.title,
				blocks: page.blocks.map((block) =>
					block.type === 'rich_text'
						? { type: 'rich_text', body: block.body }
						: {
								type: 'knowledge_check',
								key: block.key,
								stem: block.stem,
								options: block.options,
								answer: block.answer,
								explanation: block.explanation
							}
				)
			}))
		} as PagesIn;
	}

	async function save() {
		if (saving) return;
		saving = true;
		saveError = undefined;
		try {
			const res = await put('/api/v1/authoring/lessons/{lesson_id}/pages', {
				params: { path: { lesson_id: lessonId } },
				body: toPagesIn()
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

<div class="lesson-editor">
	{#each pages as page, pi (pi)}
		<section class="page">
			<label>
				Page title
				<input value={page.title} oninput={(e) => retitlePage(pi, e.currentTarget.value)} />
			</label>
			<div class="page-controls">
				<button type="button" onclick={() => movePage(pi, -1)} disabled={pi === 0}
					>Move page up</button
				>
				<button type="button" onclick={() => movePage(pi, 1)} disabled={pi === pages.length - 1}
					>Move page down</button
				>
				<button type="button" onclick={() => deletePage(pi)}>Delete page</button>
			</div>

			{#each page.blocks as block, bi (block.instanceId)}
				<div class="block">
					{#if block.type === 'rich_text'}
						{#key block.instanceId}
							<RichTextEditor
								doc={block.body}
								onchange={(body) => updateBlock(pi, bi, { ...block, body })}
								oninsertimage={insertImage}
							/>
						{/key}
					{:else}
						<KnowledgeCheckForm {block} onchange={(next) => updateBlock(pi, bi, next)} />
					{/if}
					<div class="block-controls">
						<button type="button" onclick={() => moveBlock(pi, bi, -1)} disabled={bi === 0}
							>Move block up</button
						>
						<button
							type="button"
							onclick={() => moveBlock(pi, bi, 1)}
							disabled={bi === page.blocks.length - 1}>Move block down</button
						>
						<button type="button" onclick={() => deleteBlock(pi, bi)}>Delete block</button>
					</div>
				</div>
			{/each}

			<div class="add-block-controls">
				<button type="button" onclick={() => addBlock(pi, 'rich_text')}>Add text block</button>
				<button type="button" onclick={() => addBlock(pi, 'knowledge_check')}
					>Add knowledge check</button
				>
			</div>
		</section>
	{/each}

	<button type="button" onclick={addPage}>Add page</button>

	<div class="save-controls">
		<button type="button" onclick={save} disabled={!dirty || saving}>Save</button>
		{#if saveError}
			<p role="alert">{saveError}</p>
		{/if}
	</div>
</div>

<style>
	.page {
		margin-block-end: 2rem;
		padding: 1rem;
		border: 1px solid var(--border-color, #ccc);
	}
	.block {
		margin-block: 1rem;
		padding-block-start: 1rem;
		border-block-start: 1px dashed var(--border-color, #ccc);
	}
	.page-controls,
	.block-controls,
	.add-block-controls {
		display: flex;
		gap: 0.5rem;
		margin-block: 0.5rem;
	}
</style>
