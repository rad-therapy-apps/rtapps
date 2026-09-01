"""Package for standalone background/maintenance tasks run outside the request cycle.

What this file does: nothing on its own — it reserves a slot for background tasks invoked
as one-off scripts (`python -m app.tasks.<name>`), not from any HTTP route.

Used here and why: plain Python package convention; no code, no dependencies.

How it fits the project: `purge_sessions.py` is the first (and so far only) occupant —
NFR-26's session purge job, run on a schedule from the VM's crontab (see
docs/06-operations.md, Task 17) rather than from inside the FastAPI app.

Depends on: nothing.
Used by: `python -m app.tasks.purge_sessions` (VM crontab entry, Task 17).
"""
