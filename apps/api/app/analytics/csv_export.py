"""CSV export utility for educator analytics views.

What this file does: `csv_response()` builds a UTF-8 CSV response with a
filename attachment header, handling None values as empty strings.

Used here and why: Single responsibility — encapsulate CSV formatting so
`app.analytics.router` routes stay thin.

How it fits the project: FR-E-08 — CSV export for educator views.

Depends on: `csv`, `io`, `fastapi.Response`.

Used by: `app.analytics.router`.
"""

import csv
import io
from collections.abc import Iterable, Sequence

from fastapi import Response


def csv_response(filename: str, header: list[str], rows: Iterable[Sequence[object]]) -> Response:
    """One CSV attachment: UTF-8, header row first, None rendered as empty string."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
