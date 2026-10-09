<!--
	What this file does: the quiz editor at `(app)/author/quizzes/[id]` -- two tabs (Edit/Publish)
	over one quiz working copy: settings (title/access/pass_percent/shuffle/present_n), the
	ordered question list (reorder/remove, expandable to edit a question's own bank content
	in place), a question-bank picker to add more, and the shared `PublishPanel`.
	Used here and why: Svelte 5 runes for the active-tab/editor state; every quiz-level edit
	(title, settings, question add/move/remove) sets `dirty = true` directly, same as
	`LessonEditor.svelte`; `save()` is busy-guarded with try/catch/finally so a failed request can
	never wedge the Save button, and `beforeNavigate` blocks leaving with unsaved changes. Editing
	an *existing* bank question's own stem/options/answer/explanation is a separate action
	(`PUT /authoring/questions/{id}`, busy-guarded per-row via `questionSaving`) from saving the
	quiz itself -- that write changes the bank question everywhere it's referenced (per that
	route's own docstring), not just this quiz, so it doesn't fold into `dirty`/`save()`.
	`config` is untyped JSON on the wire (`QuizAuthorOut.config`), so `pass_percent`/`shuffle`/
	`present_n` are read out of it with a cast at load time, same pattern as `AuthorPage`'s cast in
	`LessonEditor.svelte`.
	How it fits the project: `data.quiz`/`data.versions`/`data.importNotes` come from this route's
	`load`; `QuizPutIn` (Task 9) is what `save()` PUTs; `PublishPanel` (Task 10/15) is reused
	verbatim for the Publish tab.
	Depends on: `$app/navigation` (`beforeNavigate`), `$lib/author/BankQuestionForm.svelte`,
	`$lib/author/QuestionPicker.svelte`, `$lib/author/PublishPanel.svelte`, `$lib/author/api`
	(`api`).
	Used by: reached from `(app)/author`'s dashboard.
-->
<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import BankQuestionForm from '$lib/author/BankQuestionForm.svelte';
	import QuestionPicker from '$lib/author/QuestionPicker.svelte';
	import PublishPanel from '$lib/author/PublishPanel.svelte';
	import { api } from '$lib/author/api';
	import { problemDetail } from '$lib/author/problem';
	import type { components } from '@rtapps/api-client';
	import Alert from '$lib/ui/Alert.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PageData } from './$types';

	type QuestionAuthorOut = components['schemas']['QuestionAuthorOut'];

	let { data }: { data: PageData } = $props();

	// `QuizAuthorOut.config` is untyped JSON on the wire -- narrowed once, here, same pattern as
	// `LessonEditor.svelte`'s `AuthorPage` cast.
	const initialConfig = data.quiz.config as {
		pass_percent?: number;
		shuffle?: boolean;
		present_n?: number;
	};

	let activeTab = $state<'edit' | 'publish'>('edit');

	let title = $state(data.quiz.title);
	let access = $state(data.quiz.access);
	let passPercent = $state(initialConfig.pass_percent ?? 80);
	let shuffle = $state(initialConfig.shuffle ?? true);
	let presentN = $state<number | null>(initialConfig.present_n ?? null);
	let questions = $state<QuestionAuthorOut[]>(data.quiz.questions);
	let expandedId = $state<string | null>(null);

	let dirty = $state(false);
	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	let questionSaving = $state<string | null>(null);
	let questionSaveError = $state<string | undefined>(undefined);

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Discard unsaved changes?')) cancel();
	});

	function markDirty() {
		dirty = true;
	}

	function addQuestion(question: QuestionAuthorOut) {
		if (questions.some((q) => q.id === question.id)) return; // already in this quiz
		questions = [...questions, question];
		markDirty();
	}

	function moveQuestion(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= questions.length) return;
		const next = [...questions];
		[next[index], next[target]] = [next[target], next[index]];
		questions = next;
		markDirty();
	}

	function removeQuestion(index: number) {
		questions = questions.filter((_, i) => i !== index);
		markDirty();
	}

	// Updates the *local* draft of a bank question's own content; persisted separately by
	// `saveQuestion` below, not by the quiz's own `save()`.
	function updateQuestionDraft(
		index: number,
		next: { stem: string; options: string[]; answer: number; explanation: string | null }
	) {
		questions = questions.map((q, i) => (i === index ? { ...q, ...next } : q));
		markDirty();
	}

	async function saveQuestion(index: number) {
		if (questionSaving) return;
		const question = questions[index];
		questionSaving = question.id;
		questionSaveError = undefined;
		try {
			const res = await api.PUT('/api/v1/authoring/questions/{question_id}', {
				params: { path: { question_id: question.id } },
				body: {
					stem: question.stem,
					options: question.options,
					answer: question.answer,
					explanation: question.explanation
				}
			});
			if (res.error) {
				questionSaveError = problemDetail(res.error);
				return;
			}
			questions = questions.map((q, i) => (i === index ? res.data : q));
		} catch {
			questionSaveError = 'Request failed';
		} finally {
			questionSaving = null;
		}
	}

	async function save() {
		if (saving) return;
		saving = true;
		saveError = undefined;
		try {
			const config: Record<string, unknown> = { pass_percent: passPercent, shuffle };
			if (presentN !== null) config.present_n = presentN;
			const res = await api.PUT('/api/v1/authoring/quizzes/{activity_id}', {
				params: { path: { activity_id: data.quiz.activity_id } },
				body: { title, access, config, question_ids: questions.map((q) => q.id) }
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
	<title>{data.quiz.title} — Author — RTTLearn</title>
</svelte:head>

<PageHeader title={data.quiz.title} />

<Tabs
	tabs={[
		{ id: 'edit', label: 'Edit' },
		{ id: 'publish', label: 'Publish' }
	]}
	bind:selected={activeTab}
	label="Quiz editor tabs"
/>

{#if activeTab === 'edit'}
	<div role="tabpanel" class="quiz-editor">
		<Card as="section">
			<div class="stack">
				<Field label="Title" id="quiz-title">
					<input
						id="quiz-title"
						value={title}
						oninput={(e) => {
							title = e.currentTarget.value;
							markDirty();
						}}
					/>
				</Field>

				<Field label="Access" id="quiz-access">
					<select
						id="quiz-access"
						value={access}
						onchange={(e) => {
							access = e.currentTarget.value;
							markDirty();
						}}
					>
						<option value="practice">Practice</option>
						<option value="assessment">Assessment</option>
					</select>
				</Field>
				<p class="hint">
					Assessment activities are hidden from students entirely -- reserved for a future
					educator-assigned quiz pool (ADR-0006). Use Practice unless that's what you mean.
				</p>

				<Field label="Pass percent" id="quiz-pass-percent">
					<input
						id="quiz-pass-percent"
						type="number"
						min="1"
						max="100"
						value={passPercent}
						oninput={(e) => {
							const n = e.currentTarget.valueAsNumber;
							if (!Number.isNaN(n)) {
								passPercent = n;
								markDirty();
							}
						}}
					/>
				</Field>

				<label class="check">
					<input
						type="checkbox"
						checked={shuffle}
						onchange={(e) => {
							shuffle = e.currentTarget.checked;
							markDirty();
						}}
					/>
					Shuffle question order
				</label>

				<Field
					label="Present N questions (optional -- leave blank to show every question)"
					id="quiz-present-n"
				>
					<input
						id="quiz-present-n"
						type="number"
						min="1"
						value={presentN ?? ''}
						oninput={(e) => {
							const value = e.currentTarget.value;
							const n = e.currentTarget.valueAsNumber;
							if (value === '') {
								presentN = null;
								markDirty();
							} else if (!Number.isNaN(n)) {
								presentN = n;
								markDirty();
							}
						}}
					/>
				</Field>
			</div>
		</Card>

		<Card as="section">
			<h2>Questions ({questions.length})</h2>
			<ol class="question-list">
				{#each questions as question, i (question.id)}
					<li class="question-row">
						<div class="question-summary">
							<Button
								variant="secondary"
								onclick={() => (expandedId = expandedId === question.id ? null : question.id)}
							>
								{expandedId === question.id ? 'Collapse' : 'Expand'}
							</Button>
							<span>{question.stem}</span>
						</div>
						<div class="question-controls">
							<Button variant="ghost" onclick={() => moveQuestion(i, -1)} disabled={i === 0}>
								Move up
							</Button>
							<Button
								variant="ghost"
								onclick={() => moveQuestion(i, 1)}
								disabled={i === questions.length - 1}
							>
								Move down
							</Button>
							<Button variant="danger" icon={Trash2} onclick={() => removeQuestion(i)}>
								Remove from quiz
							</Button>
						</div>
						{#if expandedId === question.id}
							<BankQuestionForm
								value={{
									stem: question.stem,
									options: question.options,
									answer: question.answer,
									explanation: question.explanation
								}}
								onchange={(next) => updateQuestionDraft(i, next)}
							/>
							<Button
								variant="primary"
								onclick={() => saveQuestion(i)}
								disabled={questionSaving !== null}
							>
								Save question
							</Button>
							{#if questionSaveError}
								<Alert tone="danger" role="alert">{questionSaveError}</Alert>
							{/if}
						{/if}
					</li>
				{/each}
			</ol>
		</Card>

		<Card as="section">
			<h3>Add a question</h3>
			<QuestionPicker onadd={addQuestion} />
		</Card>

		<div class="save-controls">
			<Button variant="primary" onclick={save} disabled={!dirty || saving}>Save</Button>
			{#if saveError}
				<Alert tone="danger" role="alert">{saveError}</Alert>
			{/if}
		</div>
	</div>
{:else}
	<div role="tabpanel">
		<PublishPanel
			activityId={data.quiz.activity_id}
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
	.hint {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.quiz-editor {
		display: grid;
		gap: var(--space-5);
	}
	.question-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.question-row {
		margin-block: var(--space-3);
		padding-block-start: var(--space-3);
		border-block-start: 1px dashed var(--border-strong);
	}
	.question-summary,
	.question-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		margin-block: var(--space-1);
	}
	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		font-size: var(--text-sm);
	}
</style>
