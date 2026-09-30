"""Safe FastF1 export entry points.

The public application never imports this module. Rich data is built offline
then promoted as a versioned asset after validation.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from f1_data_model.capabilities import RICH_DATA_START_YEAR


def require_rich_data_year(year: int) -> None:
    if year < RICH_DATA_START_YEAR:
        raise ValueError(
            f"Rich FastF1 session data is not supported before {RICH_DATA_START_YEAR}."
        )


def write_json_atomically(destination: Path, payload: dict[str, Any]) -> None:
    """Publish an asset only after its complete JSON payload has been written."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=destination.parent, delete=False
    ) as temporary_file:
        json.dump(payload, temporary_file, separators=(",", ":"), ensure_ascii=False)
        temporary_file.write("\n")
        temporary_path = Path(temporary_file.name)
    os.replace(temporary_path, destination)


def export_session_summary(year: int, event: str, session_code: str, destination: Path) -> None:
    """Export verified session metadata as a small, immutable rich-data asset."""

    require_rich_data_year(year)
    import fastf1

    session = fastf1.get_session(year, event, session_code)
    session.load(laps=True, telemetry=False, weather=True, messages=True)
    event_data = session.event
    payload = {
        "year": year,
        "event": str(event_data.get("EventName", event)),
        "session_code": session_code,
        "country": event_data.get("Country"),
        "location": event_data.get("Location"),
        "lap_count": len(session.laps),
        "weather_samples": len(session.weather_data),
        "race_control_messages": len(session.race_control_messages),
        "source": "fastf1",
    }
    write_json_atomically(destination, payload)
