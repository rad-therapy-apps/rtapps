export type HeadingLevel = 2 | 3 | 4;
export type CalloutKind = 'key-principle' | 'clinical-note' | 'warning';

export type ProseMark =
	| { type: 'bold' }
	| { type: 'italic' }
	| { type: 'underline' }
	| { type: 'code' }
	| { type: 'subscript' }
	| { type: 'superscript' }
	| { type: 'link'; attrs: { href: string } };

export type ProseText = { type: 'text'; text: string; marks?: ProseMark[] };
export type ProseHardBreak = { type: 'hardBreak' };
export type ProseMath = { type: 'math'; attrs: { src: string } };

export type ProseInline = ProseText | ProseHardBreak | ProseMath;

export type ProseParagraph = { type: 'paragraph'; content?: ProseInline[] };
export type ProseHeading = {
	type: 'heading';
	attrs: { level: HeadingLevel };
	content: ProseInline[];
};
export type ProseListItem = { type: 'listItem'; content: ProseBlock[] };
export type ProseBulletList = { type: 'bulletList'; content: ProseListItem[] };
export type ProseOrderedList = { type: 'orderedList'; content: ProseListItem[] };
export type ProseBlockquote = { type: 'blockquote'; content: ProseBlock[] };
export type ProseTableCell = {
	type: 'tableCell';
	attrs?: { header?: boolean };
	content: ProseBlock[];
};
export type ProseTableRow = { type: 'tableRow'; content: ProseTableCell[] };
export type ProseTable = { type: 'table'; content: ProseTableRow[] };
export type ProseImage = { type: 'image'; attrs: { mediaAssetId: string; alt: string } };
export type ProseCallout = { type: 'callout'; attrs: { kind: CalloutKind }; content: ProseBlock[] };

export type ProseBlock =
	| ProseParagraph
	| ProseHeading
	| ProseBulletList
	| ProseOrderedList
	| ProseBlockquote
	| ProseTable
	| ProseImage
	| ProseCallout;

export type ProseDoc = { type: 'doc'; content: ProseBlock[] };
