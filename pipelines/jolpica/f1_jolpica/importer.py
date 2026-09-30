"""Import 2010-to-current calendars and race results from Jolpica.

This module is an offline ingestion command. It must never be called from the
public API request path.
"""

from __future__ import annotations

import argparse
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

import requests

from f1_data_model.database import Database
from f1_data_model.models import EventRecord, ResultRecord

BASE_URL = "https://api.jolpi.ca/ergast/f1"
DEFAULT_DATABASE = Path("var/f1-data-lab.sqlite3")
USER_AGENT = "F1DataLab/0.1 (offline historical importer)"


def _integer(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


class JolpicaClient:
    def __init__(self, base_url: str = BASE_URL, delay_seconds: float = 0.25):
        self.base_url = base_url.rstrip("/")
        self.delay_seconds = delay_seconds
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT

    def get_races(self, path: str) -> list[dict[str, Any]]:
        response = self.session.get(f"{self.base_url}/{path.lstrip('/')}", timeout=30)
        response.raise_for_status()
        payload = response.json()
        races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if not isinstance(races, list):
            raise ValueError("Jolpica response did not contain a race list")
        time.sleep(self.delay_seconds)
        return races

    def get_calendar(self, year: int) -> list[dict[str, Any]]:
        return self.get_races(f"{year}.json")

    def get_results(self, year: int, round_number: int) -> list[dict[str, Any]]:
        return self.get_races(f"{year}/{round_number}/results.json")


def normalise_event(year: int, payload: dict[str, Any]) -> EventRecord:
    circuit = payload.get("Circuit", {})
    location = circuit.get("Location", {})
    return EventRecord(
        year=year,
        round_number=_integer(payload.get("round")) or 0,
        name=str(payload.get("raceName", "Unknown Grand Prix")),
        circuit_id=circuit.get("circuitId"),
        circuit_name=circuit.get("circuitName"),
        country=location.get("country"),
        location=location.get("locality"),
        race_date=payload.get("date"),
        race_time=payload.get("time"),
    )


def normalise_results(race: dict[str, Any]) -> list[ResultRecord]:
    records: list[ResultRecord] = []
    for item in race.get("Results", []):
        driver = item.get("Driver", {})
        constructor = item.get("Constructor", {})
        fastest_lap = item.get("FastestLap", {})
        fastest_lap_time = fastest_lap.get("Time", {}).get("time")
        records.append(
            ResultRecord(
                driver_id=str(driver.get("driverId", "unknown")),
                driver_name=" ".join(
                    part for part in (driver.get("givenName"), driver.get("familyName")) if part
                )
                or str(driver.get("driverId", "Unknown Driver")),
                driver_code=driver.get("code"),
                constructor_id=constructor.get("constructorId"),
                constructor_name=constructor.get("name"),
                grid=_integer(item.get("grid")),
                position=_integer(item.get("position")),
                position_text=item.get("positionText"),
                points=_number(item.get("points")),
                laps=_integer(item.get("laps")),
                status=item.get("status"),
                fastest_lap_rank=_integer(fastest_lap.get("rank")),
                fastest_lap_time=fastest_lap_time,
            )
        )
    return records


def import_season(year: int, database_path: Path = DEFAULT_DATABASE) -> None:
    if year < 2010:
        raise ValueError("F1 Data Lab historical coverage begins at 2010")

    database_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=database_path.parent) as temporary_directory:
        staging_path = Path(temporary_directory) / database_path.name
        if database_path.exists():
            # Keep all already-published seasons while the replacement season is built.
            shutil.copy2(database_path, staging_path)

        database = Database(staging_path)
        database.initialize()
        database.upsert_season(year, source="jolpica")

        client = JolpicaClient()
        calendar = client.get_calendar(year)
        for raw_event in calendar:
            event = normalise_event(year, raw_event)
            if event.round_number <= 0:
                continue
            event_id = database.upsert_event(event)
            result_races = client.get_results(year, event.round_number)
            if result_races:
                database.replace_results(event_id, normalise_results(result_races[0]))
            print(f"Imported {year} round {event.round_number}: {event.name}")

        # The live API opens a fresh read-only connection for each request. Replacing
        # the completed SQLite file is atomic, so it sees either the old release or
        # the fully validated new release—never an import in progress.
        os.replace(staging_path, database_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import one historical F1 season from Jolpica")
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument(
        "--database",
        type=Path,
        default=Path(os.environ.get("F1_DATABASE_PATH", DEFAULT_DATABASE)),
    )
    args = parser.parse_args()
    import_season(args.year, args.database)


if __name__ == "__main__":
    main()
