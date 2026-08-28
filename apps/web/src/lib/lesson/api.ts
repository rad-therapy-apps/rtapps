import { createApi } from '@rtapps/api-client';

/** Browser-side API client. Import only from `.svelte` components — never from `+page.server.ts`. */
export const api = createApi();
