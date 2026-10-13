# TipTap 3 upgrade: design

**Date:** 2026-10-13. **Status:** approved by the owner (approach A, keep list keymap). **Replaces:** Dependabot PR #69.

## Why

- `@tiptap/core` 2.x is affected by **GHSA-cp6q-959q-f8rh** (moderate). In that advisory, `mergeAttributes()` turns an own `__proto__` key into inherited, executable DOM attributes. The fix exists only in **3.30.4 and later**; there will be no 2.x fix.
- TipTap 2 is out of support, so any future advisory against it will stay unpatched.
- **Our exposure today is low.** TipTap runs only in the authoring editor, which is limited to educators and admins. Students see lessons through our own `ProseDoc` renderer. Everything saved is validated by the API against the closed `prose-doc.schema.json`, which rejects unknown attributes.

## Goal

Move the lesson editor from TipTap **2.27.2** to **3.31.4**. 3.31.4 was released on 2026-09-30, so it satisfies the one-week rule; 3.32.0 was only a day old. The requirements:

- Authors see no difference.
- The saved `ProseDoc` JSON stays byte-identical.
- No copy changes.

## Approach: adopt TipTap 3's package layout

### Dependencies (`apps/web/package.json`)

- **Bump to `^3.31.4`:**
  - `@tiptap/core`
  - `@tiptap/pm`
  - `@tiptap/starter-kit`
  - `@tiptap/extension-table`
  - `@tiptap/extension-image`
  - `@tiptap/extension-subscript`
  - `@tiptap/extension-superscript`
- **Remove:**
  - `@tiptap/extension-underline` and `@tiptap/extension-link`: StarterKit 3 includes both.
  - `@tiptap/extension-table-row`, `-table-cell` and `-table-header`: TipTap 3 exports these from `@tiptap/extension-table`, which no longer has a default export.
- **Check:** the prosemirror packages that `@tiptap/pm` resolves must not regress, in particular `prosemirror-view` ≥ 1.42.3. `pnpm audit --prod` must no longer list `@tiptap/core`.

### `src/lib/author/extensions.ts`

- **Table imports:** `import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'`, with `Table.configure({ resizable: false })` as today.
- **`StarterKit.configure`** keeps every current option and adds:
  - `trailingNode: false`. **Required:** otherwise v3 appends an empty paragraph to every document, which changes the saved JSON.
  - `link: { openOnClick: false, autolink: false, isAllowedUri: (url) => url.startsWith('https://') }`. This replaces the deprecated `validate`. It matches the schema's `href` pattern `^https://`, and in v3 it also applies on load and paste. A pasted `http://` link becomes plain text instead of causing a 422 when saved.
  - `underline: {}`: on, as today.
  - `listKeymap`: left at its default (on). This is the only new behaviour, and it gives more natural Backspace and Delete at list-item edges. The owner approved keeping it.
  - Every other StarterKit 3 member stays at its default **only if** it doesn't change the saved JSON. `undoRedo`, `dropcursor` and `gapcursor` were already active in v2 under other names.
- **Custom extensions keep their behaviour:** `AuthorImage` (`Image.extend`), `Callout` (`Node.create` plus a `toggleCallout` command and its `Commands` module augmentation) and `MathSource`. Adapt them only where the v3 types require it.

### `src/lib/author/RichTextEditor.svelte`

The code uses `new Editor({ element, extensions, content, editorProps, onUpdate, onTransaction })`, `getJSON`, `isActive`, `chain().focus()…` commands, `extendMarkRange('link').setLink`, `insertTable` and `insertContent`. Change it only where the v3 API differs.

- The toolbar must look the same.
- `aria-label`, `aria-pressed`, the labels and the error copy stay unchanged.

### Not in scope

- New editor features.
- Undo/redo buttons.
- Markdown.
- `prosemap.ts`. Its `JSONContent` type import is unchanged in v3; it changes only if a test proves the v3 JSON shape differs, and then only to keep its output identical.

## Testing

1. **New baseline round-trip test, written and passing on TipTap 2 before the upgrade.**
   - It is a browser spec under `src/lib/author/`, in the `client` vitest project (`*.svelte.spec.ts`).
   - For each document in `packages/schemas/fixtures/prose-doc.json` → `valid` (`callout_image_math`, `empty_paragraph`, `heading_levels`, `lists_and_quote`, `paragraph_with_marks`, `table`), it builds an `Editor` with `authorExtensions()` and `content: toEditor(doc)`. It then asserts that `fromEditor(editor.getJSON())` deep-equals `doc`.
   - The same test must pass unchanged after the upgrade. That proves the saved data doesn't change.
2. **These tests must pass unchanged:**
   - `RichTextEditor.svelte.spec.ts`
   - `LessonEditor.svelte.spec.ts`
   - `prosemap.test.ts`
   - `uploadImage.test.ts`
   - the full vitest suite
3. **Checks:** svelte-check reports 0 errors and no new warnings; eslint and the build pass.
4. **Browser tests:**
   - Local e2e: `authoring.e2e.ts`, and `ui.e2e.ts` (whose lesson-editor scan must still pass axe), on chromium and mobile-360.
   - Then the full CI matrix.
5. **Owner check after deploy** on test.rttlearn.com:
   - type text, then try bold, a heading and a list;
   - add a callout;
   - add an `https://` link, and check an `http://` link is rejected;
   - insert a table and select cells;
   - insert an image;
   - save, publish, and check the lesson renders for a student.

## Risks

- **v3 JSON shape differences** (e.g. extra default attrs on table cells or images). The round-trip test catches these; the fix belongs in `extensions.ts` attribute definitions.
- **Behaviour of StarterKit 3 members we didn't have** (`listKeymap`, `trailingNode`). `trailingNode` is disabled, and `listKeymap` was accepted.
- **Duplicate prosemirror copies after the bump.** Check with `pnpm why prosemirror-model` and fix with `pnpm dedupe`. Two copies break `instanceof` checks inside ProseMirror.
