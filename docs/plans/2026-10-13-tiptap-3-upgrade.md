# TipTap 3 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the lesson rich-text editor from TipTap 2.27.2 to 3.31.4. The saved `ProseDoc` JSON stays identical, and authors see no difference except the approved list keymap.

**Architecture:**
- **Task 1** adds a round-trip test and proves it on TipTap 2. The test loads each shared prose fixture into a real `Editor` built from `authorExtensions()` and checks `fromEditor(editor.getJSON())` equals the fixture.
- **Task 2** does the upgrade. It adopts TipTap 3's layout: Link and Underline move inside StarterKit, and the table nodes come from `@tiptap/extension-table`. It disables `trailingNode` and replaces the deprecated link `validate` with `isAllowedUri`. The Task 1 test must keep passing unchanged.

**Tech Stack:** SvelteKit 2 / Svelte 5, TipTap 3.31.4, vitest browser project (Chromium), Playwright, pnpm workspace.

**Spec:** `docs/specs/2026-10-13-tiptap-3-upgrade-design.md`

## Global Constraints

- **Versions:**
  - Every `@tiptap/*` package resolves to exactly **3.31.4**; 3.32.0 is less than a week old and must not be used. `package.json` ranges are `^3.31.4`, and the lockfile must resolve 3.31.4.
  - `prosemirror-view` must stay ≥ 1.42.3.
  - After Task 2, `pnpm audit --prod` must no longer list `@tiptap/core`.
- **Saved data:** the `ProseDoc` JSON that `fromEditor(editor.getJSON())` produces for every fixture in `packages/schemas/fixtures/prose-doc.json` → `valid` is unchanged (deep-equal to the fixture).
- **No changes for authors:**
  - no copy changes;
  - toolbar `aria-label`s, `title`s, `aria-pressed` and labels unchanged;
  - the `.prose`, `.ProseMirror a` and `.paste-controls textarea` selectors keep working.
- **Behaviour:** the only new behaviour is StarterKit 3's `listKeymap`, left at its default (on). `trailingNode` must be `false`.
- **Links:** `isAllowedUri` accepts only URLs starting with `https://`. That matches the schema's `href` pattern `^https://`.
- **Gates** (run from `apps/web`):
  - `pnpm exec prettier --check src e2e`
  - `pnpm exec eslint src e2e` (`eslint .` trips on a stray gitignored `apps/web/.superpowers` asset; that is known)
  - `pnpm check`: 0 errors, no new warnings (baseline 23)
  - `pnpm exec vitest run`
  - `pnpm build`
- **Security:** never read, create or edit any `.env*` file. Never print secret values or seed passwords.
- **Git:**
  - Stay on branch `deps/tiptap-3`.
  - Stage only the files you changed; never `git add -A` or `git add .`.
  - End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Round-trip test on TipTap 2 (baseline)

**Files:**
- Create: `apps/web/src/lib/author/extensions.svelte.spec.ts`. It runs in the vitest `client` (browser) project because the name matches `src/**/*.svelte.{test,spec}.{js,ts}`.

**Interfaces:**
- Consumes:
  - `authorExtensions(): Extensions` from `./extensions`;
  - `toEditor(doc: ProseDoc): JSONContent` and `fromEditor(json: JSONContent): ProseDoc` from `./prosemap`;
  - fixtures from `@rtapps/schemas/fixtures/prose-doc.json` (`valid` holds `callout_image_math`, `empty_paragraph`, `heading_levels`, `lists_and_quote`, `paragraph_with_marks` and `table`).
- Produces: the test file Task 2 must keep passing unchanged, plus a `describe('authorExtensions', …)` block that Task 2 adds one test to.

- [ ] **Step 1: Write the test**

```ts
/**
 * What this file does: proves the author editor's extension set round-trips every shared prose
 * fixture unchanged — load `toEditor(doc)` into a real TipTap `Editor` built from
 * `authorExtensions()`, read it back with `fromEditor(editor.getJSON())`, expect the fixture.
 * Used here and why: a real Editor (browser project) because the TipTap schema, default attrs and
 * StarterKit members (e.g. v3's `trailingNode`) only show up when the editor parses content.
 * Written on TipTap 2 as the baseline for the TipTap 3 upgrade
 * (docs/specs/2026-10-13-tiptap-3-upgrade-design.md): it must pass unchanged on both.
 * How it fits the project: guards ADR-0003's closed prose schema at the editor boundary — saved
 * lesson JSON must not change because a library changed.
 * Depends on: `@tiptap/core`, `./extensions`, `./prosemap`, `@rtapps/schemas/fixtures/prose-doc.json`.
 * Used by: `pnpm --filter web test` (client project).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';
import { authorExtensions } from './extensions';
import { fromEditor, toEditor } from './prosemap';
import type { ProseDoc } from '../prose/types';

describe('authorExtensions', () => {
	let editor: Editor | undefined;
	afterEach(() => {
		editor?.destroy();
		editor = undefined;
	});

	function load(doc: ProseDoc): Editor {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: authorExtensions(),
			content: toEditor(doc)
		});
		return editor;
	}

	// Scenario: every schema-valid fixture, loaded into the editor and read straight back.
	// Invariant: the saved ProseDoc is exactly the fixture — no added nodes (e.g. a trailing
	// paragraph), no dropped or defaulted attrs, no reordered content.
	for (const [name, doc] of Object.entries(fixtures.valid)) {
		it(`round-trips the "${name}" fixture unchanged`, () => {
			const out = fromEditor(load(doc as ProseDoc).getJSON());
			expect(out).toEqual(doc);
		});
	}
});
```

- [ ] **Step 2: Run it on TipTap 2 and confirm it passes**

Run (from `apps/web`): `pnpm exec vitest run src/lib/author/extensions.svelte.spec.ts`
Expected: 6 tests PASS.

If any fixture fails on TipTap 2, that is a pre-existing `prosemap` gap, not part of this upgrade. **Stop and report it** with the diff; don't change `prosemap.ts` or the fixtures.

- [ ] **Step 3: Gates and commit**

Run the Global Constraints gates. Then:

```bash
git add apps/web/src/lib/author/extensions.svelte.spec.ts
git commit -m "test(web): author editor round-trips every prose fixture (TipTap 2 baseline)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Upgrade to TipTap 3.31.4

**Files:**
- Modify: `apps/web/package.json` and `pnpm-lock.yaml` (repo root).
- Modify: `apps/web/src/lib/author/extensions.ts`, covering the imports (lines 21–31), the header `Depends on` comment (lines 16–18) and `authorExtensions()` (lines 104–131).
- Modify, only if svelte-check or the tests require it: `apps/web/src/lib/author/RichTextEditor.svelte`.
- Test: `apps/web/src/lib/author/extensions.svelte.spec.ts`, adding one test.

**Interfaces:**
- Consumes: Task 1's test file, unchanged except for the one added `it`.
- Produces: `authorExtensions(): Extensions` with the same name and signature. `RichTextEditor.svelte` and `LessonEditor.svelte` callers are unchanged.

- [ ] **Step 1: Write the failing link test**

Append inside `describe('authorExtensions', …)` in `extensions.svelte.spec.ts`:

```ts
	// Scenario: a document arrives with a non-https link (the schema only allows ^https://).
	// Invariant: the editor drops the link mark (keeping the text) instead of carrying a link
	// the API would reject with a 422 on save. TipTap 3's `isAllowedUri` applies on load/paste;
	// TipTap 2's `validate` only applied to autolinking, so this fails before the upgrade.
	it('drops non-https links on load', () => {
		const withHttp = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'see ', marks: [] },
						{ type: 'text', text: 'here', marks: [{ type: 'link', attrs: { href: 'http://example.com' } }] }
					]
				}
			]
		} as unknown as ProseDoc;
		const json = JSON.stringify(load(withHttp).getJSON());
		expect(json).toContain('here');
		expect(json).not.toContain('http://example.com');
	});
```

If `toEditor` expects a different text/mark shape, match the `paragraph_with_marks` fixture's shape; the assertion stays the same. Run `pnpm exec prettier --write` on the file.

- [ ] **Step 2: Run it and confirm it fails on TipTap 2**

Run: `pnpm exec vitest run src/lib/author/extensions.svelte.spec.ts`
Expected: the 6 round-trip tests PASS, and `drops non-https links on load` FAILS because the JSON still contains `http://example.com`.

- [ ] **Step 3: Swap the dependencies**

Run from the repo root:

```bash
pnpm --filter web remove @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
pnpm --filter web add @tiptap/core@3.31.4 @tiptap/pm@3.31.4 @tiptap/starter-kit@3.31.4 @tiptap/extension-table@3.31.4 @tiptap/extension-image@3.31.4 @tiptap/extension-subscript@3.31.4 @tiptap/extension-superscript@3.31.4
```

Then check the resolutions:

```bash
grep -n '"@tiptap' apps/web/package.json          # 7 entries, each "^3.31.4"
pnpm ls -r --depth Infinity 2>/dev/null | grep -oE '@tiptap/[a-z-]+ [0-9.]+' | sort -u   # every one 3.31.4
pnpm why prosemirror-model | grep -c 'prosemirror-model '   # a single version
pnpm ls -r --depth Infinity prosemirror-view | grep -oE 'prosemirror-view [0-9.]+' | sort -u  # >= 1.42.3
```

If any `@tiptap/*` package resolves to 3.32.x, or prosemirror-model shows more than one version, run `pnpm dedupe` and re-check. If 3.32.x persists, stop and report.

- [ ] **Step 4: Update `extensions.ts`**

Replace the header's `Depends on` lines 16–18 with:

```ts
 * Depends on: `@tiptap/core`, `@tiptap/starter-kit` (incl. its Link and Underline in TipTap 3),
 * `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, `@tiptap/extension-table`
 * (Table, TableRow, TableCell, TableHeader), `@tiptap/extension-image`.
```

Replace the imports (lines 21–31) with:

```ts
import { Node, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import type { CalloutKind } from '../prose/types';
```

Replace `authorExtensions()` with:

```ts
export function authorExtensions(): Extensions {
	return [
		StarterKit.configure({
			codeBlock: false,
			horizontalRule: false,
			strike: false,
			heading: { levels: [2, 3, 4] },
			blockquote: {},
			code: {},
			// TipTap 3 bundles Link and Underline into StarterKit.
			underline: {},
			link: {
				openOnClick: false,
				autolink: false,
				// Matches the schema's `href` pattern (^https://). In TipTap 3 this also applies on
				// load and paste, so a non-https link becomes plain text instead of a 422 on save.
				isAllowedUri: (url) => url.startsWith('https://')
			},
			// TipTap 3 would otherwise append an empty paragraph to every document, changing the
			// saved ProseDoc. `listKeymap` (new in 3) stays on: owner-approved, nicer list editing.
			trailingNode: false
		}),
		Subscript,
		Superscript,
		Table.configure({ resizable: false }),
		TableRow,
		TableCell,
		TableHeader,
		AuthorImage,
		Callout,
		MathSource
	];
}
```

Leave `AuthorImage`, the `declare module '@tiptap/core'` Commands augmentation, `Callout` and `MathSource` as they are. Change them only if svelte-check reports a v3 type error, then make the smallest type-only fix and record it in the report.

- [ ] **Step 5: Run the editor tests**

Run: `pnpm exec vitest run src/lib/author`
Expected: every test PASSES. That includes the 6 round-trip tests unchanged, the new link test, `RichTextEditor.svelte.spec.ts`, `LessonEditor.svelte.spec.ts`, `prosemap.test.ts`, `uploadImage.test.ts` and `GridEditor.svelte.spec.ts`.

If a round-trip test fails, the TipTap 3 JSON differs from v2, for example a new default attr on a table cell or image.
- Fix it in `extensions.ts`, for instance by overriding `addAttributes` on the affected node the way `AuthorImage` does.
- Do NOT change `prosemap.ts`, the fixtures or the test.
- If the fix can't live in `extensions.ts`, stop and report it with the diff.

- [ ] **Step 6: `RichTextEditor.svelte` (only if needed)**

Run `pnpm check`. If it reports v3 API errors in `RichTextEditor.svelte` (`new Editor({...})` options, `isActive`, the `chain()` commands, `extendMarkRange('link').setLink`, `insertTable` or `insertContent`), make the smallest fix that keeps the same behaviour, and record it. Don't touch markup, labels or CSS.

- [ ] **Step 7: Full gates and audit**

Run every Global Constraints gate. Then, from the repo root:

```bash
pnpm audit --prod 2>&1 | grep -c '@tiptap'   # expected 0
```

- [ ] **Step 8: Local e2e**

Run e2e on a fresh local stack. The controller provides a helper script that brings up a throwaway `rtlocal` compose stack with made-up values, seeds it, then runs Playwright with `--workers=1 --retries=0` plus the arguments you pass:

```bash
<local-e2e.sh> e2e/authoring.e2e.ts e2e/ui.e2e.ts --project=chromium --project=mobile-360
<local-e2e.sh> down
```

Expected: all pass, including `ui.e2e.ts` "lesson editor is accessible and fits the viewport". Always run `down` afterwards.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/author/extensions.ts apps/web/src/lib/author/extensions.svelte.spec.ts
# plus apps/web/src/lib/author/RichTextEditor.svelte only if Step 6 changed it
git commit -m "feat(web): upgrade the lesson editor to TipTap 3.31.4

Fixes GHSA-cp6q-959q-f8rh (@tiptap/core <3.30.4; no 2.x fix). Link and Underline
come from StarterKit 3; the table nodes from @tiptap/extension-table (4 packages
dropped). trailingNode off so saved ProseDoc JSON is unchanged (round-trip test,
written on TipTap 2, passes unchanged); link validate -> isAllowedUri https-only
(matches the schema, now also applies on load/paste). listKeymap left on.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
