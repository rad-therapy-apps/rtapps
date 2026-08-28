# @rtapps/api-client

Generated `openapi-fetch` client for the RTApps API. `openapi.json` and `src/schema.d.ts` are
generated artifacts — do not hand-edit them.

Regenerate with `make client` from the repo root (requires the api's Python deps synced via
`uv sync` in `apps/api`). The `contract` CI job fails if regenerating produces a diff, so run it
after any change to the API's routes or schemas and commit the result.
