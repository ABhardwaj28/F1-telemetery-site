from __future__ import annotations

import json
import sys
from pathlib import Path

import fastf1


ROOT = Path(__file__).resolve().parents[1]


SESSION_CODES = {
    "FP1": "Practice 1",
    "FP2": "Practice 2",
    "FP3": "Practice 3",
    "Q": "Qualifying",
    "SQ": "Sprint Qualifying",
    "S": "Sprint",
    "R": "Race",
}


def safe_value(value):
    """Convert pandas/FastF1 values into JSON-safe values."""

    if value is None:
        return None

    try:
        import pandas as pd

        if pd.isna(value):
            return None

        if isinstance(value, pd.Timestamp):
            return value.isoformat()

        if isinstance(value, pd.Timedelta):
            return value.total_seconds()

    except (TypeError, ValueError):
        pass

    try:
        if hasattr(value, "item"):
            return value.item()
    except Exception:
        pass

    try:
        if hasattr(value, "total_seconds"):
            return value.total_seconds()
    except Exception:
        pass

    return value


def dataframe_to_records(dataframe):
    """Convert a pandas dataframe into JSON-safe records."""

    if dataframe is None:
        return []

    records = []

    for _, row in dataframe.iterrows():

        record = {}

        for column in dataframe.columns:
            record[str(column)] = safe_value(
                row[column]
            )

        records.append(record)

    return records


def build_session(year: int, event_name: str, session_code: str):

    if session_code not in SESSION_CODES:
        raise ValueError(
            f"Unknown session code: {session_code}\n"
            f"Valid codes: {', '.join(SESSION_CODES)}"
        )

    session_name = SESSION_CODES[session_code]

    print("=" * 60)
    print(
        f"BUILDING {year} {event_name} - {session_name}"
    )
    print("=" * 60)

    session = fastf1.get_session(
        year,
        event_name,
        session_code,
    )

    # Load the timing/lap data needed for the dashboard.
    session.load(
        laps=True,
        telemetry=False,
        weather=True,
        messages=True,
    )

    print("Session loaded.")

    event_folder = (
        event_name
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )

    session_folder = (
        ROOT
        / "data"
        / "sessions"
        / str(year)
        / event_folder
    )

    session_folder.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------
    # SESSION METADATA
    # ---------------------------------------------------------

    event = session.event

    session_info = {
        "year": year,
        "event": event_name,
        "session": session_name,
        "session_code": session_code,
        "country": safe_value(
            event.get("Country")
        ),
        "location": safe_value(
            event.get("Location")
        ),
        "round": safe_value(
            event.get("RoundNumber")
        ),
        "date": safe_value(
            event.get("EventDate")
        ),
        "official_name": safe_value(
            event.get("OfficialEventName")
        ),
    }

    output_file = (
        session_folder
        / f"{session_code.lower()}.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            session_info,
            file,
            indent=2,
        )

    print(f"Saved: {output_file}")

    # ---------------------------------------------------------
    # LAPS
    # ---------------------------------------------------------

    laps = dataframe_to_records(
        session.laps
    )

    laps_file = (
        session_folder
        / f"{session_code.lower()}_laps.json"
    )

    with open(
        laps_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            laps,
            file,
            indent=2,
        )

    print(
        f"Laps available: {len(laps)}"
    )

    print(f"Saved: {laps_file}")

    # ---------------------------------------------------------
    # WEATHER
    # ---------------------------------------------------------

    weather = dataframe_to_records(
        session.weather_data
    )

    weather_file = (
        session_folder
        / f"{session_code.lower()}_weather.json"
    )

    with open(
        weather_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            weather,
            file,
            indent=2,
        )

    print(
        f"Weather records: {len(weather)}"
    )

    print(f"Saved: {weather_file}")

    # ---------------------------------------------------------
    # RACE CONTROL / SESSION MESSAGES
    # ---------------------------------------------------------

    messages = []

    try:

        race_control = (
            session.race_control_messages
        )

        messages = dataframe_to_records(
            race_control
        )

    except Exception:

        messages = []

    messages_file = (
        session_folder
        / f"{session_code.lower()}_race_control.json"
    )

    with open(
        messages_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            messages,
            file,
            indent=2,
        )

    print(
        f"Race control messages: {len(messages)}"
    )

    print(
        f"Saved: {messages_file}"
    )

    # ---------------------------------------------------------
    # DRIVERS
    # ---------------------------------------------------------

    drivers = []

    try:

        for number, info in session.results.iterrows():

            drivers.append(
                {
                    "driver_number": safe_value(
                        number
                    ),
                    "abbreviation": safe_value(
                        info.get("Abbreviation")
                    ),
                    "full_name": safe_value(
                        info.get("FullName")
                    ),
                    "team": safe_value(
                        info.get("TeamName")
                    ),
                    "position": safe_value(
                        info.get("Position")
                    ),
                    "points": safe_value(
                        info.get("Points")
                    ),
                }
            )

    except Exception:

        drivers = []

    drivers_file = (
        session_folder
        / f"{session_code.lower()}_drivers.json"
    )

    with open(
        drivers_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            drivers,
            file,
            indent=2,
        )

    print(
        f"Drivers: {len(drivers)}"
    )

    print(
        f"Saved: {drivers_file}"
    )

    print()
    print("SESSION BUILD COMPLETE.")


def main():

    if len(sys.argv) != 4:

        print(
            "Usage:\n"
            "python scripts/build_race.py "
            "2025 Monaco R"
        )

        print()
        print(
            "Session codes:"
        )

        for code, name in SESSION_CODES.items():
            print(
                f"  {code:3} = {name}"
            )

        sys.exit(1)

    year = int(sys.argv[1])
    event_name = sys.argv[2]
    session_code = sys.argv[3].upper()

    build_session(
        year,
        event_name,
        session_code,
    )


if __name__ == "__main__":
    main()