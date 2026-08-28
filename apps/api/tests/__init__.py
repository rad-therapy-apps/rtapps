# Empty on purpose: marks `tests/` as a regular package so `from tests.conftest import
# register, seed_lesson` (used across this suite) resolves, rather than relying on
# pytest's rootdir-relative test discovery alone.
