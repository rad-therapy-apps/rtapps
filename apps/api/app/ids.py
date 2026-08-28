"""Primary-key generator: UUID version 7 (time-ordered UUIDs).

What this file does: wraps the `uuid-utils` library's UUIDv7 generator behind a small
`new_id()` helper that returns a standard-library `uuid.UUID`.

Used here and why: `uuid_utils` because Python's standard `uuid` module has no UUIDv7
generator; UUIDv7 embeds a timestamp so primary keys sort roughly by creation order, which
keeps b-tree indexes on `id` from fragmenting the way random UUIDv4 keys would.

How it fits the project: per `docs/03-architecture.md` §6.2 ("UUID v7 primary keys"),
every table's `id` column defaults to this function.

Depends on: `uuid_utils` (third-party).
Used by: `app/auth/models.py`, `app/content/models.py`, `app/attempts/models.py` as the
`default=new_id` for every model's primary key.
"""

import uuid

import uuid_utils


def new_id() -> uuid.UUID:
    # uuid_utils.uuid7() returns its own UUID type; converting via .bytes gives back the
    # standard-library uuid.UUID that SQLAlchemy's UUID column type expects.
    return uuid.UUID(bytes=uuid_utils.uuid7().bytes)
