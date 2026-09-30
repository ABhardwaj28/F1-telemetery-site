from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the project root to Python's import path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import fastf1

from backend.processors.telemetry import build_telemetry


OUTPUT_DIR = ROOT / "data" / "telemetry"


def clean_name(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_")


def build_driver_telemetry(
    year: int,
    event_name: str,
    driver: str,
    max_points: int = 1500,
):
    print()
    print("=" * 60)
    print(f"TELEMETRY: {year} {event_name} // {driver}")
    print("=" * 60)

    session = fastf1.get_session(
        year,
        event_name,
        "R",
    )

    session.load(
        laps=True,
        telemetry=True,
        weather=False,
        messages=False,
    )

    driver_laps = session.laps.pick_drivers(driver)

    if driver_laps.empty:
        raise ValueError(
            f"No laps found for driver {driver}"
        )

    driver_output_dir = (
        OUTPUT_DIR
        / str(year)
        / clean_name(event_name)
        / driver.upper()
    )

    driver_output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    valid_laps = driver_laps[
        driver_laps["LapTime"].notna()
    ]

    print(
        f"Valid timed laps: {len(valid_laps)}"
    )

    for _, lap in valid_laps.iterrows():

        lap_number = int(lap["LapNumber"])

        try:
            telemetry = lap.get_telemetry()

            if telemetry.empty:
                continue

            data = build_telemetry(
                telemetry,
                max_points=max_points,
            )

            output = {
                "year": year,
                "event": event_name,
                "session": "Race",
                "driver": driver.upper(),
                "lap": lap_number,
                "lap_time": (
                    lap["LapTime"].total_seconds()
                    if lap["LapTime"] is not None
                    else None
                ),
                "compound": (
                    str(lap["Compound"])
                    if lap["Compound"] is not None
                    else None
                ),
                "tyre_life": (
                    float(lap["TyreLife"])
                    if lap["TyreLife"] is not None
                    else None
                ),
                "telemetry": data,
            }

            output_file = (
                driver_output_dir
                / f"lap_{lap_number:03d}.json"
            )

            with open(
                output_file,
                "w",
                encoding="utf-8",
            ) as file:

                json.dump(
                    output,
                    file,
                    indent=2,
                    ensure_ascii=False,
                )

            print(
                f"Lap {lap_number:02d} → "
                f"{len(data['data'])} points"
            )

        except Exception as error:

            print(
                f"Lap {lap_number:02d} FAILED: "
                f"{error}"
            )

    print()
    print("Telemetry extraction complete.")


def main():

    if len(sys.argv) < 4:

        print(
            "Usage:\n"
            "python scripts/build_telemetry.py "
            "2025 Monaco NOR"
        )

        sys.exit(1)

    year = int(sys.argv[1])
    event_name = sys.argv[2]
    driver = sys.argv[3]

    build_driver_telemetry(
        year,
        event_name,
        driver,
    )


if __name__ == "__main__":
    main()