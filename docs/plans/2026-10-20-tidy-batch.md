# Tidy-up batch (#114 no-decision items, #61, #75) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the small follow-ups that need no owner decision: tab/panel ARIA wiring and copied CSS from #114, the test/CI hygiene in #61, and the auth polish in #75. Nothing changes for users.

**Architecture:** Three independent tasks on branch `chore/tidy-batch`, one commit each (Task 3 may use two).
- Task 1 gives the `Tabs` kit component an explicit tab-set id and a `tabPanel()` helper, so the five editor routes can pair each panel with its tab.
- Task 2 moves three identical, copy-pasted CSS rules into `app.css`.
- Task 3 tightens tests and comments.

**Tech Stack:** SvelteKit 3 / Svelte 5 (runes), vitest 5 (browser + node projects), Playwright 1.64, FastAPI + pytest.

## Global Constraints

- **No user-visible change.** Look, spacing, copy and behaviour stay exactly as they are. If a change would move a pixel, stop and report it.
- No test may be weakened; any assertion edit must keep or strengthen its meaning. vitest 5: `toHaveTextContent` is an exact whole-text match and `toMatchTextContent` is partial. Watch for `.not` checks that would pass vacuously.
- Out of scope, do not do: the danger-button hover, error-page subtitles, moving `.player-error` to `Alert`, seeding a sequencing activity, CI path filtering, or the #114 owner-decision items.
  - Reasons: `Alert`'s `margin-block` would add space above player errors; the sequencing activity needs real teaching content.
- Never read, create or edit any file whose name starts with `.env`. Never print passwords. Never disable or weaken the login rate limiter.
- Icons only from Lucide; no emoji.
- Stay on branch `chore/tidy-batch`. Never switch branches, push, stash or force.
- Never `git add` anything under `.superpowers/` or `apps/web/e2e/.auth/`.
- Commit trailer: `Co-Authored-By: <your model name> <noreply@anthropic.com>`.
- Gates for any web change, run in `apps/web`:
  - `pnpm check` must show 0 errors;
  - `pnpm exec eslint src e2e` must be clean;
  - `pnpm exec prettier --check src e2e/*.ts` must pass;
  - `pnpm test` must report the same total as before plus any new tests (318 before this plan).
- Gates for any API change, run in `apps/api`: `uv run ruff check .`, `uv run ruff format --check .` and `uv run mypy app`, plus the touched test files.
  - The API tests need a Postgres 18 on `localhost:5433` with database `rtapps_test`, user `rtapps`, password `rtapps` (the same throwaway credentials as `.github/workflows/pr.yml`).
  - Start one with `docker run -d --name rtapps-testdb -p 127.0.0.1:5433:5432 -e POSTGRES_USER=rtapps -e POSTGRES_PASSWORD=rtapps -e POSTGRES_DB=rtapps_test postgres:18` and remove it with `docker rm -f rtapps-testdb` when done.
- Local e2e runner (dev compose stack, the same stack CI uses): `bash /private/tmp/claude-501/-Users-christopherguzman-Desktop-coding-projects-rt-app/ddf33f06-4740-4816-9092-fb619a5ecffb/scratchpad/sw/local-e2e.sh --project=setup --project=chromium <specs>`, then `... local-e2e.sh down`.
  - It resets compose project `rtlocal` with made-up scratch values, seeds it, and runs Playwright with `--workers=1 --retries=0`.
  - Only chromium is installed locally; webkit and firefox run in CI.

---

### Task 1: Tabs pair each tab with its panel (aria-controls / aria-labelledby)

**Files:**
- Modify: `apps/web/src/lib/ui/Tabs.svelte`
- Modify: the five editor routes under `apps/web/src/routes/(app)/author/`:
  - `decks/[id]/+page.svelte`
  - `matching/[id]/+page.svelte`
  - `quizzes/[id]/+page.svelte`
  - `sequencing/[id]/+page.svelte`
  - `lessons/[id]/+page.svelte`
- Test: `apps/web/src/lib/ui/ui.svelte.spec.ts` (the `describe('Tabs')` block)

**Interfaces:**
- Produces:
  - `Tabs` gets a new **required** prop `id: string`, the tab set's id, unique on the page. It replaces the internal `$props.id()` uid.
  - Each tab button's id becomes `` `${id}-tab-${tab.id}` ``.
  - Only the selected tab gets `` aria-controls=`${id}-panel-${tab.id}` ``. The editor routes render only the selected panel, and an `aria-controls` pointing at a missing element is invalid.
  - A module-level export: `export function tabPanel(set: string, tab: string): { role: 'tabpanel'; id: string; 'aria-labelledby': string }`. It returns `{ role: 'tabpanel', id: `${set}-panel-${tab}`, 'aria-labelledby': `${set}-tab-${tab}` }`.

- [ ] **Step 1: Write the failing tests.** In `ui.svelte.spec.ts`:
  - Add `id: 'editor'` to every existing `render(Tabs, …)` call.
  - Import `{ tabPanel }` from `./Tabs.svelte`.
  - Add these tests inside `describe('Tabs')`:

```ts
	it('pairs the selected tab with its panel and names each tab by the tab-set id', async () => {
		await render(Tabs, { id: 'editor', tabs, selected: 'edit', label: 'Editor tabs' });
		const edit = page.getByRole('tab', { name: 'Edit' });
		await expect.element(edit).toHaveAttribute('id', 'editor-tab-edit');
		await expect.element(edit).toHaveAttribute('aria-controls', 'editor-panel-edit');
		// Only the selected panel is rendered by the editor routes, so an unselected tab must not
		// point at a panel that is not in the document.
		await expect.element(page.getByRole('tab', { name: 'Publish' })).not.toHaveAttribute('aria-controls');
	});

	it('tabPanel() gives the panel the matching id and label', () => {
		expect(tabPanel('editor', 'edit')).toEqual({
			role: 'tabpanel',
			id: 'editor-panel-edit',
			'aria-labelledby': 'editor-tab-edit'
		});
	});
```

  Use the spec's existing `tabs` fixture. If its tab labels are not "Edit" and "Publish", use the fixture's labels and ids, and keep the same three assertions.

- [ ] **Step 2: Run and see them fail.** `cd apps/web && pnpm exec vitest run src/lib/ui/ui.svelte.spec.ts`. Expected: the new tests fail (no `tabPanel` export, wrong ids). Also expect a type error on `id` until Step 3.
- [ ] **Step 3: Implement in `Tabs.svelte`.**
  - Add a `<script module lang="ts">` block that exports `tabPanel`, and make the instance script use the same id scheme.
  - Replace `const uid = $props.id();` with the required `id` prop.
  - Set the button `id` and the conditional `aria-controls`.
  - Update the keyboard handler's `document.getElementById(...)` to the new tab id.
  - Update the header comment, including "Used by" and the props it lists.
- [ ] **Step 4: Wire the five routes.**
  - Give each `<Tabs>` an `id`: `deck-editor-tabs`, `matching-editor-tabs`, `quiz-editor-tabs`, `sequencing-editor-tabs`, `lesson-editor-tabs`.
  - Replace every `<div role="tabpanel">` with `<div {...tabPanel('<that id>', '<the tab id that panel belongs to>')}>`. Read each route's `{#if activeTab === …}` branches to pair each panel with its tab id correctly.
  - Keep any other attributes on those divs, e.g. `class="quiz-editor"` in quizzes.
  - Import `{ tabPanel }` alongside `Tabs`.
- [ ] **Step 5: Gates.** Run every web gate. `pnpm test` must report 320 (318 + 2). Then run the editor axe scans locally: `local-e2e.sh --project=setup --project=chromium e2e/ui.e2e.ts`. All must pass. Then run `local-e2e.sh down`.
- [ ] **Step 6: Commit.** `git commit -m "fix(ui): pair each editor tab with its panel (aria-controls, aria-labelledby)"`. The body names the `id` prop and `tabPanel()`, and says "Part of #114."

---

### Task 2: One copy of three duplicated CSS rules

**Background:** these rules are copied verbatim into Svelte scoped `<style>` blocks:

| Rule | Copies | Identical copies |
|---|---|---|
| `.stack { display: grid; gap: var(--space-4); }` | 5 | 4: decks, matching, quizzes, sequencing editors |
| `.save-controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }` | 6 | 5: the four editors + `author/data-tables/+page.svelte` |
| `.muted { margin: 0; color: var(--text-muted); }` | 9 | 8 |

The odd ones out:
- `author/data-tables/+page.svelte`'s `.stack` adds `grid-template-columns: minmax(0, 1fr)`.
- `src/lib/author/LessonEditor.svelte`'s `.save-controls` adds `margin-block-start: var(--space-5)`.
- `author/+page.svelte` (the author hub) has `.muted { color: var(--text-muted); }` **without** `margin: 0`. It is used on `<p>`/`<span>` elements, where the global `p` margin (`margin-block: 0 var(--space-3)`) must keep applying.

**Files:**
- Modify: `apps/web/src/app.css`. Add a short "Shared layout utilities" section with the three rules, each with a one-line comment naming who uses it.
- Modify: the files holding the identical copies (remove the copy only; leave every other rule in place):
  - the four editors;
  - `author/data-tables/+page.svelte` (`.save-controls` only);
  - the eight `.muted` pages:
    - `home`
    - `admin/users`
    - `admin/audit`
    - `educator`
    - `educator/cohorts/[id]`
    - `educator/cohorts/[id]/outcomes`
    - `educator/cohorts/[id]/students/[uid]`
    - `educator/cohorts/[id]/activities/[aid]`
- Modify: `author/+page.svelte`. Rename its local class `muted` to `subtle`: the rule `.subtle { color: var(--text-muted); }` and its three `class="muted"` usages. With the new global `.muted` carrying `margin: 0`, keeping the name would remove the paragraphs' bottom margin.
- Keep the two superset copies (data-tables `.stack`, LessonEditor `.save-controls`) as they are. Their extra declarations still apply, and every shared declaration has the same value.

**The risk to check, not assume:** a scoped Svelte rule `.x.svelte-abc` has specificity (0,2,0); a global `.x` has (0,1,0). Moving a rule to global can let a *competing* rule win where it used to lose. Examples:
- a scoped `p { margin… }`;
- a `:global(...)` rule;
- a kit component rule on the same element.

For each element using these classes, check for such competitors. Then prove there is no visual change with screenshots.

- [ ] **Step 1: Baseline screenshots, before any edit.**
  - Write a scratch Playwright spec plus config. They go in the session scratchpad directory, never in the repo, and the config extends `apps/web/playwright.config.ts` with `testDir` pointing at the scratch spec and the `setup` dependency kept.
  - The spec visits each affected page, signed in as needed, using `educatorState` / `adminState` from `apps/web/e2e/helpers.ts` and a registered student for `/home`. It waits for network idle and takes a full-page `toHaveScreenshot` per page at 1280px and 360px:
    - the four editors (via the seeded activities in the author hub)
    - `/author/data-tables`
    - `/author` (the hub)
    - `/home`
    - `/admin/users`
    - `/admin/audit`
    - `/educator`
    - the Demo cohort page
    - its outcomes page
    - one student page
    - one activity stats page
    - one lesson editor (for LessonEditor)
  - Mask volatile content (timestamps, join codes, generated names) with `mask`.
  - Run it once against the local stack with `--update-snapshots` to record the baselines.
- [ ] **Step 2: Make the CSS change** as described above.
- [ ] **Step 3: Compare.** Rerun the same scratch spec without `--update-snapshots`. Every screenshot must match. If any differs, find the competing rule and fix the cause (not the screenshot), or report it.
- [ ] **Step 4: Gates.** Run all web gates (318 total) and `local-e2e.sh --project=setup --project=chromium e2e/ui.e2e.ts`. Tear down.
- [ ] **Step 5: Commit.** `git commit -m "refactor(ui): one shared copy of .stack, .save-controls and .muted"`. The body lists the counts removed and why the author hub uses `.subtle`, says "screenshots of N pages at 1280/360 unchanged", and ends with "Part of #114."

---

### Task 3: Test and comment hygiene (#61, #75)

**Files and items:**

1. **Explicit CI worker count (#61).** `apps/web/playwright.config.ts`: add `workers: process.env.CI ? 2 : undefined`, with a comment. CI's log already shows `Running 68 tests using 2 workers` (the GitHub-hosted runner default), so this pins today's behaviour.
2. **External-submit 422s assert their Problem detail (#61).** `apps/api/tests/test_external_activity.py`: the 422 asserts at about lines 235, 248, 285, 300, 315 and 328. For each, also assert the response's Problem detail/title, using the exact text the route produces. Read `app/attempts/router.py` and `app/errors.py` to get it; do not guess. Keep `status_code == 422`.
3. **Arcade readiness gates (#61).** `apps/web/e2e/arcade.e2e.ts`: change `toBeAttached()` to `toBeVisible()` for `#gameOverScreen` (~L62) and `#endScreen` (~L135), but only if those elements are actually visible at that point. Check the game's markup under `apps/web/arcade/`. If one is legitimately attached but hidden, keep `toBeAttached` and say why in the report. Also add the score test's `Simulator`/`Games` heading assertion to the completion-only test, if the score test has it and the completion test lacks it.
4. **caddy-sync path anchor (#61).** `apps/web/src/lib/server/caddy-sync.test.ts:21` resolves `../../../../../infra` from `__dirname`. Anchor it at the repo root instead: walk up from `__dirname` to the directory containing `pnpm-workspace.yaml`, then `infra/<file>`. A file move then no longer silently changes the path depth. Keep the assertions identical.
5. **`validate_password_strength` (#75).** `apps/api/app/auth/passwords.py`:
   - Replace the stale `NOTE(review)` comment ("no route calls this"). `app/auth/router.py:166` (change-password) now calls it.
   - Then decide about its `ValueError`. If change-password's request schema already enforces the same minimum length, so the `ValueError` can't be reached, say so in the comment and leave the code. If it *can* be reached, the request would 500, which is a real bug: stop and report it instead of fixing it silently.
6. **Misleading reset comment (#75).** `apps/api/app/admin/router.py` around lines 99–103: make the comment say what happens. An admin resetting their own password gets a 400 from the self-modification check, after the last-active-admin guard. It must not imply self-reset is allowed. Read `_target` first.
7. **Audit detail value (#75).** `apps/api/tests/test_admin_reset_password.py:131` only asserts that the `sessions_revoked` key exists. Assert its value: the number of sessions the test set up for the target user. Read the test setup to get the exact number.

- [ ] **Step 1:** Items 2 and 7 are test strengthenings. Each must pass against the current code. Mutation-check each one by temporarily changing the expected text/value and confirming the test fails, then restoring it.
- [ ] **Step 2:** Make items 1, 3, 4, 5 and 6.
- [ ] **Step 3: Gates.**
  - API: ruff, ruff format, mypy, and `uv run pytest tests/test_external_activity.py tests/test_admin_reset_password.py tests/test_passwords.py -q`.
  - Web: all gates, plus `local-e2e.sh --project=setup --project=chromium e2e/arcade.e2e.ts`.
  - Remove the test database.
- [ ] **Step 4: Commit.** Use one or two commits, e.g. `test: assert 422 details, audit value; pin CI workers; sturdier caddy-sync path` and `docs(api): correct the password-strength and admin-reset comments`. Both say "Part of #61 / #75".

## After all tasks (controller)

- Final whole-branch review.
- Push and open the PR.
- Wait for CI with zero retried tests, then merge and verify the deploy.
- Close #61 and #75. Tick the done items in #114 and add a comment there explaining the skipped items (player-error/Alert margin, sequencing content).
- Update memory.
