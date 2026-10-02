/**
 * What this file does: the end-to-end authoring flow for plan 3b's milestone — an educator opens
 * the migrated-content needs-review queue, fixes a knowledge check and inserts an image into a
 * rich-text block on the seeded `rbe-and-oer` lesson, saves, previews, and publishes with a
 * change note; a student then sees the edit (including the image resolving through the media
 * route) and the lesson drops off the needs-review queue. A second, independent test drives the
 * seeded MU calculator as a student.
 * Used here and why: Playwright against the running compose stack (baseURL http://localhost:8080,
 * see playwright.config.ts) with real S3 storage (SeaweedFS), so the presign → PUT → confirm media flow actually
 * writes an object; role/label/testid locators (no CSS selectors) except for the two places with
 * no accessible name to hook into — the TipTap contenteditable stem editor (no aria-label; see
 * `$lib/author/RichTextEditor.svelte`) and the page-section scoping for the lesson editor's Edit
 * tab (each page has no test id of its own) — both documented inline below. The knowledge check
 * this test edits is deliberately `lq_page5_1` (page index 4, "Why Tumor Hypoxia Matters
 * Clinically"), NOT `lq_page2_1` (page index 1) — `lesson.e2e.ts` answers `lq_page2_1` and
 * asserts its specific correct option, and both spec files run against the same shared seeded
 * lesson in the same compose stack, so editing `lq_page2_1` here would make that spec flaky/wrong
 * regardless of run order. `page.on('dialog', ...)` auto-accepts the Publish button's native
 * `confirm()` (the only dialog this flow ever triggers, since edits are saved before any tab
 * switch or navigation, so `LessonEditor`'s own unsaved-changes confirm never fires). The seeded
 * MU calculator's expected MU is computed in this file from the same depth/field-size/PDD numbers
 * `apps/api/app/seed.py`'s `SEED_PDD_TABLE_KEY` grid seeds (depth 10 / field size 10 is an exact
 * grid point, so no interpolation is needed to reproduce the lookup here).
 * How it fits the project: plan 3b's final task (18) — this is "the milestone's proof" the task
 * brief describes: it exercises the full authoring API + UI (dashboard, lesson editor, media
 * presign flow, publish) landed across Tasks 8-17, plus the seeded MU calculator (Task 11/17).
 * `docs/03-architecture.md` §7 (authoring), §11 (End-to-end row).
 * Works with: `./helpers` (signIn, signOut); `apps/api/app/seed.py` (`rbe-and-oer`'s import_notes
 * and two knowledge checks, the seeded `pdd_6mv` data table and "MU calculator" activity);
 * `./fixtures/pixel.png` (a real 1x1 PNG, committed so the upload is a real file, not a fabricated
 * buffer). Used by: `make e2e` and the CI `e2e` job in `.github/workflows/pr.yml`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { signIn, signOut } from './helpers';

const EDUCATOR = { email: 'educator@example.com', password: 'rtapps-dev-password' };
const STUDENT = { email: 'student@example.com', password: 'rtapps-dev-password' };

const FIXTURE_PNG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/pixel.png');

const EDITED_STEM =
	'Why does high-LET radiation work better against hypoxic tumors than X-rays? (edited by authoring e2e)';
const CHANGE_NOTE = 'Fixed the hypoxia knowledge check and added a figure (authoring e2e)';

test('an educator fixes a needs-review lesson and a student sees the published edit', async ({
	page
}) => {
	// The only dialog this flow ever triggers is PublishPanel's `confirm()` before publishing.
	page.on('dialog', (dialog) => dialog.accept());

	// --- Educator: open rbe-and-oer from the needs-review queue ---
	await signIn(page, EDUCATOR.email, EDUCATOR.password);
	await page.goto('/author');
	// The seed's re-scanned migrated content always flags some pages (Task 5) — the queue is
	// never empty, and rbe-and-oer (import_notes: highlight→bold) is always one of them.
	await expect(page.getByRole('heading', { name: /Needs review \([1-9]\d*\)/ })).toBeVisible();
	// The needs-review section's own link (not the "Subjects" section further down the same
	// dashboard, which links the same lesson without the "first in queue" framing).
	await page.getByRole('link', { name: 'RBE and OER' }).first().click();
	await expect(page).toHaveURL(/\/author\/lessons\//);

	// Edit tab is active by default; each of the lesson's 7 pages is a direct-child <section
	// class="page"> with no test id of its own (Task 15 predates the e2e), so page index is the
	// only stable way to reach a specific one — matches lesson.e2e.ts's own reliance on the same
	// fixed page order ("Page 1 of 7" ... "Page 7 of 7").
	const editorPages = page.locator('.lesson-editor > .page');

	// Page index 4 ("Why Tumor Hypoxia Matters Clinically") carries lq_page5_1, untouched by
	// lesson.e2e.ts — pick a different correct answer (index 0 -> 1) and rewrite the stem.
	const hypoxiaPage = editorPages.nth(4);
	const kcForm = hypoxiaPage.locator('fieldset.kc-form');
	await kcForm.getByRole('radio', { name: 'Correct answer: option 2' }).check();
	// The stem's TipTap editor has no aria-label (RichTextEditor.svelte wraps a bare
	// contenteditable div); scoped to the "Question" field (not "Explanation", which also has its
	// own RichTextEditor instance further down the same fieldset) via its preceding label text.
	const stemEditor = kcForm
		.locator('.field', { hasText: 'Question' })
		.locator('[contenteditable="true"]');
	await stemEditor.click();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.type(EDITED_STEM);

	// Page index 0 ("Not All Radiation Damages Equally") is rich_text-only — insert the fixture
	// image into its one block.
	const introPage = editorPages.nth(0);
	const fileChooserPromise = page.waitForEvent('filechooser');
	await introPage.getByRole('button', { name: 'Image' }).click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(FIXTURE_PNG);
	await expect(introPage.locator('img')).toBeVisible({ timeout: 15_000 });

	// Save: both edits round-trip through one PUT of the whole page tree. `saveButton` disables
	// immediately on click (`LessonEditor.svelte`'s `disabled={!dirty || saving}` — busy-guarded
	// on `saving`, not just `dirty`), so waiting for that alone races ahead of the request itself;
	// waiting for the PUT's own response is what actually proves the save landed before Preview
	// (below) reads the working copy.
	const saveButton = page.getByRole('button', { name: 'Save' });
	await expect(saveButton).toBeEnabled();
	const savePut = page.waitForResponse(
		(res) => res.request().method() === 'PUT' && res.url().endsWith('/pages')
	);
	await saveButton.click();
	await savePut;
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(saveButton).toBeDisabled(); // dirty -> false after the successful save above

	// Preview: fetches the working copy's stripped snapshot fresh: page to index 4 and see the
	// edited stem rendered through the same student ProseDoc renderer.
	await page.getByRole('tab', { name: 'Preview' }).click();
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: 'Next' }).click();
	}
	await expect(page.getByText(EDITED_STEM)).toBeVisible();

	// Publish with a change note; the dialog is auto-accepted at the top of this test.
	await page.getByRole('tab', { name: 'Publish' }).click();
	await page.getByLabel('Change note').fill(CHANGE_NOTE);
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByText(CHANGE_NOTE)).toBeVisible(); // now in the version history list
	await expect(page.getByRole('alert')).toHaveCount(0);

	// The dashboard's needs-review queue no longer lists this lesson (publish clears import_notes).
	await page.goto('/author');
	const needsReviewSection = page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: /Needs review/ }) });
	await expect(needsReviewSection.getByRole('link', { name: 'RBE and OER' })).toHaveCount(0);
	await signOut(page);

	// --- Student: the published edit, including the image resolving through /api/v1/media/ ---
	await signIn(page, STUDENT.email, STUDENT.password);
	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await page.getByRole('link', { name: 'RBE and OER' }).click();
	await expect(page.getByText('Page 1 of 7')).toBeVisible();

	// The inserted image: a real <img> whose src is the authenticated media redirect route,
	// followed (page.request shares the browser's session cookie) to a 200.
	const img = page.locator('img[src^="/api/v1/media/"]');
	await expect(img).toBeVisible();
	const src = await img.getAttribute('src');
	const mediaRes = await page.request.get(src!);
	expect(mediaRes.status()).toBe(200);

	// Page 5 (index 4) carries the edited stem.
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: 'Next' }).click();
	}
	await expect(page.getByText('Page 5 of 7')).toBeVisible();
	await expect(page.getByText(EDITED_STEM)).toBeVisible();
});

test('a student computes MU from the seeded calculator', async ({ page }) => {
	// Mirrors apps/api/app/seed.py's SEED_PDD_TABLE_KEY ("pdd_6mv") grid: depth (rows) x field
	// size (cols) in cm, PDD values in %. Depth 10 / field size 10 is an exact grid point (row
	// index 2, col index 1) — no interpolation needed to reproduce the expected lookup here.
	const PDD_ROWS: Record<number, number[]> = {
		1.5: [98.0, 99.0, 99.5, 100.0],
		5: [88.0, 90.0, 91.0, 92.0],
		10: [64.0, 67.0, 69.0, 70.0],
		20: [36.0, 40.0, 43.0, 45.0]
	};
	const PDD_COLS = [5, 10, 15, 20];
	const dose = 200;
	const depth = 10;
	const fieldSize = 10;
	const pdd = PDD_ROWS[depth][PDD_COLS.indexOf(fieldSize)];
	// The seeded calculator's config now carries the sc_6mv/sp_6mv/wedge_factors tables too
	// (both scatter factors are exactly 1.0 at field size 10, wedge angle defaults to 0 →
	// no wedge), so at these inputs the only factor beyond PDD is the inverse-square factor
	// at the component's defaults: SSD 100, dmax 1.5.
	const isf = ((100 + 1.5) / (100 + depth)) ** 2;
	const expectedMu = dose / ((pdd / 100) * isf);

	await signIn(page, STUDENT.email, STUDENT.password);
	await page.getByRole('link', { name: 'Subjects', exact: true }).click();
	await page.getByRole('link', { name: 'Radiation Biology' }).click();
	await page.getByRole('link', { name: 'MU calculator' }).click();

	await page.getByRole('radio', { name: 'SSD (PDD)' }).check();
	await page.getByLabel('Prescribed dose (cGy)').fill(String(dose));
	await page.getByLabel('Depth (cm)').fill(String(depth));
	await page.getByLabel('Field size (cm)').fill(String(fieldSize));

	await expect(page.getByTestId('mu-lookup')).toHaveText(`PDD: ${pdd.toFixed(4)}`);
	await expect(page.getByTestId('mu-result')).toHaveText(`MU = ${expectedMu.toFixed(1)}`);
});
