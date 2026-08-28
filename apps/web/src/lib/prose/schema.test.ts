/**
 * What this file does: validates the shared `valid`/`invalid` prose-doc fixtures
 * (`@rtapps/schemas/fixtures/prose-doc.json`) against the closed JSON Schema
 * (`@rtapps/schemas/prose-doc.schema.json`) that defines ADR-0003's ProseMirror document shape.
 * Used here and why: `Ajv2020` (draft 2020-12, the schema's `$schema`) with `ajv-formats`
 * registered for the `format: "uuid"` keyword on `image.attrs.mediaAssetId`; `strict: true` so
 * schema authoring mistakes (typos, unreachable branches) fail loudly instead of being ignored.
 * How it fits the project: this is one of the "four consumers" of the single schema (ADR-0003
 * §"One schema, four consumers") — the same fixtures are also rendered by
 * `ProseDoc.svelte.spec.ts`, so "valid per schema" and "rendered by ProseDoc" can't drift apart.
 * Depends on: `ajv`/`ajv/dist/2020`, `ajv-formats`, `@rtapps/schemas` (schema + fixtures).
 * Used by: `pnpm --filter web test` (vitest `server` project, `pr.yml` job `web`).
 */
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@rtapps/schemas/prose-doc.schema.json';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';

// draft 2020-12 validator, compiled once and reused for every fixture below.
const ajv = new Ajv2020({ allErrors: false, strict: true });
// Registers `format: "uuid"` (and other standard formats) so the schema's format keywords are
// actually checked instead of silently ignored under `strict: true`.
addFormats(ajv);
const validate = ajv.compile(schema);

describe('prose-doc schema fixtures', () => {
	// Scenario: every fixture under `fixtures.valid` (one `it` per named fixture).
	// Invariant: each must pass schema validation; a failure prints Ajv's errors for the one that broke.
	for (const [name, doc] of Object.entries(fixtures.valid)) {
		it(`valid: ${name}`, () => expect(validate(doc), JSON.stringify(validate.errors)).toBe(true));
	}
	// Scenario: every fixture under `fixtures.invalid` (unknown node/mark types, malformed attrs, etc).
	// Invariant: each must be rejected by the schema.
	for (const [name, doc] of Object.entries(fixtures.invalid)) {
		it(`invalid: ${name}`, () => expect(validate(doc)).toBe(false));
	}
});
