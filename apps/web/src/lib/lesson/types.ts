import type { ProseDoc } from '$lib/prose/types';

export type RichTextBlock = { type: 'rich_text'; body: ProseDoc };

export type KnowledgeCheckBlock = {
	type: 'knowledge_check';
	key: string;
	question_id: string;
	stem: ProseDoc;
	body: { type: 'single_choice'; options: string[] };
};

export type LessonBlock = RichTextBlock | KnowledgeCheckBlock;

export type LessonPage = { order: number; title: string; blocks: LessonBlock[] };

/** The shape of `LessonOut.snapshot` (an untyped JSON blob in the generated API schema). */
export type LessonSnapshot = {
	activity: { id: string; kind: string; title: string; config: Record<string, unknown> };
	lesson: {
		id: string;
		slug: string;
		title: string;
		subject: { slug: string; title: string } | null;
		pages: LessonPage[];
	};
};
