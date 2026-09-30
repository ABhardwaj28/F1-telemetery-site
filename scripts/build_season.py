from __future__ import annotations

import sys
from pathlib import Path

import fastf1


ROOT = Path(__file__).resolve().parents[1]


SESSION_CODES = {
    "Practice 1": "FP1",
    "Practice 2": "FP2",
    "Practice 3": "FP3",
    "Qualifying": "Q",
    "Sprint": "S",
    "Sprint Qualifying": "SQ",
    "Race": "R",
}


def get_sessions(event):
    """
    Return all sessions that actually exist for an event.
    """

    sessions = []

    for index in range(1, 6):

        name = getattr(
            event,
            f"Session{index}",
            None,
        )

        if not name:
            continue

        code = SESSION_CODES.get(name)

        if code:
            sessions.append(
                {
                    "name": name,
                    "code": code,
                }
            )

    return sessions


def build_season(year: int):

    print("=" * 60)
    print(f"BUILDING F1 SEASON {year}")
    print("=" * 60)

    schedule = fastf1.get_event_schedule(
        year,
        include_testing=False,
    )

    season_dir = (
        ROOT
        / "data"
        / "seasons"
        / str(year)
    )

    season_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    events = []

    for _, event in schedule.iterrows():

        # Skip non-race/testing entries.
        round_number = event.get("RoundNumber")

        if not round_number:
            continue

        sessions = get_sessions(event)

        event_data = {
            "round": int(round_number),
            "event": str(event["EventName"]),
            "country": str(event["Country"]),
            "location": str(event["Location"]),
            "official_name": str(
                event.get(
                    "OfficialEventName",
                    event["EventName"],
                )
            ),
            "date": (
                event["EventDate"].isoformat()
                if hasattr(
                    event["EventDate"],
                    "isoformat",
                )
                else str(event["EventDate"])
            ),
            "format": str(
                event.get(
                    "EventFormat",
                    "conventional",
                )
            ),
            "sessions": sessions,
        }

        events.append(event_data)

        print(
            f"{int(round_number):02d}  "
            f"{event['EventName']}"
        )

    output_file = season_dir / "calendar.json"

    import json

    with open(
        output_file,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            {
                "year": year,
                "race_count": len(events),
                "events": events,
            },
            file,
            indent=2,
        )

    print()
    print(f"Season calendar saved:")
    print(output_file)
    print(f"Races: {len(events)}")


def main():

    if len(sys.argv) != 2:

        print(
            "Usage:\n"
            "python scripts/build_season.py 2025"
        )

        sys.exit(1)

    year = int(sys.argv[1])

    build_season(year)


if __name__ == "__main__":
    main()