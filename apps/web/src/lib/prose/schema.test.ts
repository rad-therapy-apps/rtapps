import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from '@rtapps/schemas/prose-doc.schema.json';
import fixtures from '@rtapps/schemas/fixtures/prose-doc.json';

const ajv = new Ajv2020({ allErrors: false, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('prose-doc schema fixtures', () => {
	for (const [name, doc] of Object.entries(fixtures.valid)) {
		it(`valid: ${name}`, () => expect(validate(doc), JSON.stringify(validate.errors)).toBe(true));
	}
	for (const [name, doc] of Object.entries(fixtures.invalid)) {
		it(`invalid: ${name}`, () => expect(validate(doc)).toBe(false));
	}
});
