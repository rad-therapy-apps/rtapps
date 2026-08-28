import json

import pytest

from app.openapi_export import main


def test_main_prints_sorted_openapi_json_with_trailing_newline(
    capsys: pytest.CaptureFixture[str],
) -> None:
    main()
    captured = capsys.readouterr()

    assert captured.out.endswith("\n")
    schema = json.loads(captured.out)

    assert "/api/v1/lessons/{slug}" in schema["paths"]
    assert "/api/v1/attempts/{attempt_id}/submit" in schema["paths"]
