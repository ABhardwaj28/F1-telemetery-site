import json

import pytest

from f1_fastf1.exporter import require_rich_data_year, write_json_atomically


def test_atomic_export_writes_complete_json(tmp_path) -> None:
    destination = tmp_path / "telemetry" / "session.json"
    write_json_atomically(destination, {"status": "complete", "points": 12})

    assert json.loads(destination.read_text()) == {"status": "complete", "points": 12}


def test_rich_data_rejects_unsupported_years() -> None:
    with pytest.raises(ValueError):
        require_rich_data_year(2017)
