<!--
	What this file does: the Edit tab of a lesson's editor — a page/block tree editor (rich-text
	blocks via RichTextEditor, knowledge-check blocks via KnowledgeCheckForm), image insertion,
	dirty tracking, and a save button that PUTs the whole page tree back.
	Used here and why: editor state is one `$state` array of `ClientPage` (the `AuthorPage` shape
	plus a per-page and per-block `instanceId` — see `./types.ts`); every mutation handler sets
	`dirty = true` directly rather than deriving it via a deep-compare (cheap, and matches the
	brief). `put` defaults to the real API client (`$lib/author/api`'s `api.PUT`) but is
	overridable, the same injectable-client pattern `$lib/activity/attempts.ts`'s players use for
	`post`, so `LessonEditor.svelte.spec.ts` can assert on the exact PUT body without a network
	call. `save` is busy-guarded with try/catch/finally so a failed request can never wedge the
	button (the plan-3a players' rule — see `KnowledgeCheck.svelte`/`LessonPager.svelte`). The
	outer pages `{#each}` is keyed on `page.instanceId` (never array index) so `movePage`/
	`deletePage` move a page's whole DOM subtree instead of remounting it in place; each
	RichTextEditor mount is further wrapped in `{#key block.instanceId}` so TipTap's one-time-mount
	contract (Task 14) survives reordering a block. A page's last remaining block can't be deleted
	(the API's `PageImport.blocks` requires at least one), so `deleteBlock`'s control disables
	itself the same way `KnowledgeCheckForm`'s remove-option button does at its own two-option
	floor. Image insertion is guarded by an `uploading` flag: busy-guarded so only one upload runs
	at a time (every block's Image button is disabled meanwhile, via `oninsertimage` going
	undefined), and a failed upload surfaces in the same error banner `save` uses rather than
	rejecting silently. `beforeNavigate` blocks leaving the page with unsaved changes.
	`normalizeBlock` (Task 18) reconciles a real drift between the GET and PUT wire shapes: the
	authoring GET (`build_snapshot` reused verbatim) nests a knowledge_check's options/answer
	under `body`, but the PUT (`KnowledgeCheckImport`) and this editor's own state are flat — an
	existing lesson's knowledge checks rendered with zero options before this normalization.
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
	import { errorTitle, problemDetail } from './problem';
	import type {
		AuthorBlock,
		AuthorKnowledgeCheckBlock,
		AuthorPage,
		ClientPage,
		ClientBlock
	} from './types';
	import type { ProseDoc } from '../prose/types';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import type { components } from '@rtapps/api-client';

	type PagesIn = components['schemas']['PagesIn'];

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

	// `LessonAuthorOut.pages` (this route's `load`) is `build_snapshot` reused verbatim
	// (apps/api/app/authoring/router.py's own docstring) — the same shape the student-facing
	// snapshot uses, which nests a knowledge_check's options/answer under `body` and adds
	// `question_id`, NOT the flat `AuthorKnowledgeCheckBlock` shape `PagesIn`'s PUT expects (or
	// that `LessonEditor.svelte.spec.ts`'s hand-written fixtures use). Normalize on load so the
	// editor — and the PUT `toPagesIn` sends back below — only ever deals with the flat shape.
	function normalizeBlock(block: AuthorBlock): AuthorBlock {
		if (block.type !== 'knowledge_check') return block;
		const raw = block as unknown as AuthorKnowledgeCheckBlock & {
			body?: { options: string[]; answer: number };
		};
		return {
			type: 'knowledge_check',
			key: raw.key,
			stem: raw.stem,
			options: raw.body ? raw.body.options : raw.options,
			answer: raw.body ? raw.body.answer : raw.answer,
			explanation: raw.explanation
		};
	}

	// Maps the loaded wire shape into client state once, attaching a stable instanceId per page and
	// per block (see ./types.ts) so reordering never remounts a page's or a RichTextEditor's DOM.
	function toClientPages(pages: AuthorPage[]): ClientPage[] {
		return pages.map((page) => ({
			title: page.title,
			blocks: page.blocks.map((block) => ({
				...normalizeBlock(block),
				instanceId: crypto.randomUUID()
			})),
			instanceId: crypto.randomUUID()
		}));
	}

	let pages = $state<ClientPage[]>(toClientPages(initialPages));
	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);
	let uploading = $state(false);

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function markDirty() {
		dirty = true;
	}

	// --- page operations ---

	function addPage() {
		pages = [...pages, { title: 'Untitled page', blocks: [], instanceId: crypto.randomUUID() }];
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
		// A page must keep at least one block (the API's PageImport.blocks requires min_length=1);
		// the delete control disables itself in this case (see the template), so this is a backstop.
		if (pages[pageIndex].blocks.length <= 1) return;
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
		uploading = true;
		try {
			return await uploadImage(file, authorApi);
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Image upload failed';
			return null;
		} finally {
			uploading = false;
		}
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
	{#each pages as page, pi (page.instanceId)}
		<section class="page">
			<label>
				Page title
				<input value={page.title} oninput={(e) => retitlePage(pi, e.currentTarget.value)} />
			</label>
			<div class="page-controls">
				<Button onclick={() => movePage(pi, -1)} disabled={pi === 0}>Move page up</Button>
				<Button onclick={() => movePage(pi, 1)} disabled={pi === pages.length - 1}
					>Move page down</Button
				>
				<Button variant="danger" onclick={() => deletePage(pi)}>Delete page</Button>
			</div>

			{#each page.blocks as block, bi (block.instanceId)}
				<div class="block">
					{#if block.type === 'rich_text'}
						{#key block.instanceId}
							<RichTextEditor
								doc={block.body}
								label={`Page ${pi + 1} text block ${bi + 1}`}
								onchange={(body) => updateBlock(pi, bi, { ...block, body })}
								oninsertimage={uploading ? undefined : insertImage}
							/>
						{/key}
					{:else}
						<KnowledgeCheckForm {block} onchange={(next) => updateBlock(pi, bi, next)} />
					{/if}
					<div class="block-controls">
						<Button onclick={() => moveBlock(pi, bi, -1)} disabled={bi === 0}>Move block up</Button>
						<Button onclick={() => moveBlock(pi, bi, 1)} disabled={bi === page.blocks.length - 1}
							>Move block down</Button
						>
						<Button
							variant="danger"
							onclick={() => deleteBlock(pi, bi)}
							disabled={page.blocks.length <= 1}
							title={page.blocks.length <= 1 ? 'A page must have at least one block' : undefined}
							>Delete block</Button
						>
					</div>
				</div>
			{/each}

			<div class="add-block-controls">
				<Button onclick={() => addBlock(pi, 'rich_text')}>Add text block</Button>
				<Button onclick={() => addBlock(pi, 'knowledge_check')}>Add knowledge check</Button>
			</div>
		</section>
	{/each}

	<Button onclick={addPage}>Add page</Button>

	<div class="save-controls">
		<Button variant="primary" onclick={save} disabled={!dirty || saving}>Save</Button>
		{#if saveError}
			<Alert tone="danger" role="alert">{saveError}</Alert>
		{/if}
	</div>
</div>

<style>
	/* Same raised look as the kit Card; a plain section because tests select `.page`. */
	.page {
		margin-block-end: var(--space-6);
		padding: var(--space-5);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-1);
	}
	.lesson-editor label {
		display: grid;
		gap: var(--space-1);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.block {
		margin-block: var(--space-4);
		padding-block-start: var(--space-4);
		border-block-start: 1px dashed var(--border-strong);
	}
	.page-controls,
	.block-controls,
	.add-block-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-block: var(--space-3);
	}
	.save-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-block-start: var(--space-5);
	}
</style>
