"""What this file tests: the arcade apps the seeded simulator activities point at
(`arcade_slug` in `app.seed`) are present in the repo checkout, so a seeded row never
names a missing app.

Used here and why: plain `pathlib` file checks, no database or fixtures. Kept apart from
`test_seed.py` because every test there shares one module-scoped event loop
(`pytestmark = pytest.mark.asyncio(loop_scope="module")`), and pytest-asyncio warns when
that mark lands on a non-async test.

How it fits the project: protects the plan 4c/4d simulator activities that `make seed`
creates (see `test_seed.py`).

Works with: pytest.
Depends on: `apps/web/arcade-src/` and `apps/web/arcade/` in the repo checkout.
Used by: CI `api` job in `.github/workflows/pr.yml`; `make test-api`.
"""

from pathlib import Path


def test_seed_simulator_arcade_directories_exist_on_disk() -> None:
    """The sim-hub and linac-ct arcade apps referenced by the three plan 4c simulator
    activities' `arcade_slug`, plus the four plan 4d shim/console arcade apps, must
    actually be built and present on disk, not just referenced by a seed row. A plain
    repo-relative file check, not seed data, so no `db`/`settings` fixtures are needed."""
    repo_root = Path(__file__).resolve().parents[3]
    # sim-hub is Vite-built from arcade-src/ (#77): apps/web/arcade/sim-hub/ is gitignored
    # build output produced by `pnpm --filter web build`, so a fresh checkout only carries
    # the source tree — that source is what guarantees the served app exists.
    assert (repo_root / "apps/web/arcade-src/sim-hub/index.html").is_file()
    assert (repo_root / "apps/web/arcade-src/linac-ct/index.html").is_file()
    assert (repo_root / "apps/web/arcade/three-point-setup/index.html").is_file()
    assert (repo_root / "apps/web/arcade/linac-training-beginner/index.html").is_file()
    assert (repo_root / "apps/web/arcade/linac-training-intermediate/index.html").is_file()
    assert (repo_root / "apps/web/arcade/linac-console/index.html").is_file()
