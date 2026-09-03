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
	import type { components } from '@rtapps/api-client';
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

	function errorTitle(error: unknown): string {
		return (error as { title?: string }).title ?? 'Request failed';
	}

	// Same field-path-preserving 422 formatter as LessonEditor.svelte.
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
				questionSaveError = errorTitle(res.error);
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
	<title>{data.quiz.title} — Author — RTApps</title>
</svelte:head>

<h1>{data.quiz.title}</h1>

<div role="tablist" aria-label="Quiz editor tabs">
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
	<div role="tabpanel" class="quiz-editor">
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

		<label>
			Access
			<select
				value={access}
				onchange={(e) => {
					access = e.currentTarget.value;
					markDirty();
				}}
			>
				<option value="practice">Practice</option>
				<option value="assessment">Assessment</option>
			</select>
		</label>
		<p class="hint">
			Assessment activities are hidden from students entirely -- reserved for a future
			educator-assigned quiz pool (ADR-0006). Use Practice unless that's what you mean.
		</p>

		<label>
			Pass percent
			<input
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
		</label>

		<label>
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

		<label>
			Present N questions (optional -- leave blank to show every question)
			<input
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
		</label>

		<h2>Questions ({questions.length})</h2>
		<ol class="question-list">
			{#each questions as question, i (question.id)}
				<li class="question-row">
					<div class="question-summary">
						<button
							type="button"
							onclick={() => (expandedId = expandedId === question.id ? null : question.id)}
						>
							{expandedId === question.id ? 'Collapse' : 'Expand'}
						</button>
						<span>{question.stem}</span>
					</div>
					<div class="question-controls">
						<button type="button" onclick={() => moveQuestion(i, -1)} disabled={i === 0}>
							Move up
						</button>
						<button
							type="button"
							onclick={() => moveQuestion(i, 1)}
							disabled={i === questions.length - 1}
						>
							Move down
						</button>
						<button type="button" onclick={() => removeQuestion(i)}>Remove from quiz</button>
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
						<button
							type="button"
							onclick={() => saveQuestion(i)}
							disabled={questionSaving !== null}
						>
							Save question
						</button>
						{#if questionSaveError}
							<p role="alert">{questionSaveError}</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>

		<h3>Add a question</h3>
		<QuestionPicker onadd={addQuestion} />

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
			activityId={data.quiz.activity_id}
			importNotes={data.importNotes}
			versions={data.versions}
		/>
	</div>
{/if}

<style>
	.question-row {
		margin-block: 1rem;
		padding-block-start: 1rem;
		border-block-start: 1px dashed var(--border-color, #ccc);
	}
	.question-summary,
	.question-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-block: 0.25rem;
	}
	.hint {
		font-size: 0.9em;
		opacity: 0.8;
	}
</style>
