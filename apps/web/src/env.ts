import { defineEnvVars } from '@sveltejs/kit/env';

// Unset variables stay undefined, so the callers' `??` defaults still apply.
export const variables = defineEnvVars({
	SENTRY_DSN: { schema: (input) => input },
	API_INTERNAL_URL: { schema: (input) => input },
	ORIGIN: { schema: (input) => input }
});
