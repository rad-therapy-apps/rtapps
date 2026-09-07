"""external activity kind.

What this file does: widens the activity-kind CHECK constraint to admit the `external` kind
(plan 4a — legacy browser arcade games embedded as activities).

How it fits the project: eighth link in the chain; widens `ck_activity_kind` on `activity`
(0007). Used by Task 1's `external` snapshot branch and Tasks 2/5/7's score-submit path.

Depends on: `0007_authoring_media_calc.py`. Used by: `tests/test_migrations.py` (head
"0008"), Tasks 2/5/7 implementations.

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing', 'calculator',"
        " 'external')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_activity_kind", "activity", type_="check")
    op.create_check_constraint(
        "ck_activity_kind",
        "activity",
        "kind IN ('lesson', 'quiz', 'flashcards', 'matching', 'sequencing', 'calculator')",
    )
