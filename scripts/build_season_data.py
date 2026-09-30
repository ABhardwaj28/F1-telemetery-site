from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


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


def load_calendar(year: int) -> dict:
    path = (
        ROOT
        / "data"
        / "seasons"
        / str(year)
        / "calendar.json"
    )

    if not path.exists():
        raise FileNotFoundError(
            f"Calendar not found: {path}\n"
            f"Run:\n"
            f"python scripts/build_season.py {year}"
        )

    with open(
        path,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def build_session(
    year: int,
    event: str,
    session_code: str,
):
    print()
    print("-" * 60)
    print(
        f"{year} | {event} | {session_code}"
    )
    print("-" * 60)

    command = [
        sys.executable,
        str(
            ROOT
            / "scripts"
            / "build_race.py"
        ),
        str(year),
        event,
        session_code,
    ]

    result = subprocess.run(
        command,
        cwd=ROOT,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to build "
            f"{year} {event} {session_code}"
        )


def build_season(year: int):

    calendar = load_calendar(year)

    events = calendar["events"]

    print("=" * 60)
    print(
        f"BUILDING COMPLETE SEASON DATA: {year}"
    )
    print("=" * 60)

    for event in events:

        event_name = event["event"]

        sessions = event.get(
            "sessions",
            [],
        )

        print()
        print(
            f"EVENT: {event_name}"
        )

        for session in sessions:

            code = session["code"]

            # Build the standard timing/session dataset.
            build_session(
                year,
                event_name,
                code,
            )

    print()
    print("=" * 60)
    print(
        f"SEASON {year} COMPLETE"
    )
    print("=" * 60)


def main():

    if len(sys.argv) != 2:

        print(
            "Usage:\n"
            "python scripts/build_season_data.py 2025"
        )

        sys.exit(1)

    year = int(sys.argv[1])

    build_season(year)


if __name__ == "__main__":
    main()