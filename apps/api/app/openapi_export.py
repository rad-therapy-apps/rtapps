"""CLI script: prints the API's OpenAPI document to stdout as JSON.

What this file does: builds the app with a minimal `test`-env `Settings` (no real database
needed, since the app is only introspected, never started) and dumps `app.openapi()`.

Used here and why: plain standard-library `json`/`sys` — this only needs to serialize a
dict FastAPI already builds; kept as a standalone script (not a route) so it can run in CI
without a running server or database.

How it fits the project: per `docs/03-architecture.md` §7 and §11 (the "contract" CI job),
this is how `openapi.json` is regenerated to check the committed `packages/api-client`
isn't stale — the front end's typed client is generated from this file's output.

Depends on: `app.config.Settings`, `app.main.create_app`.
Used by: `tests/test_openapi_export.py` (`main`); run directly as a script in CI/Makefile
tooling to produce `openapi.json`.
"""

import json
import sys

from app.config import Settings
from app.main import create_app


def main() -> None:
    # database_url is a placeholder: FastAPI's .openapi() only introspects routes/schemas,
    # it never opens a connection, so no real database needs to be reachable here.
    settings = Settings(env="test", database_url="postgresql+asyncpg://x:x@localhost/x")
    json.dump(create_app(settings).openapi(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
