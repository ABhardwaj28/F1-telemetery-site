from __future__ import annotations

import json
import sys
from pathlib import Path

import fastf1
import numpy as np


ROOT = Path(__file__).resolve().parents[2]


def load_telemetry(year: int, event: str, driver: str):
    session = fastf1.get_session(
        year,
        event,
        "R",
    )

    session.load(
        laps=True,
        telemetry=True,
        weather=False,
        messages=False,
    )

    laps = session.laps.pick_drivers(driver)

    if laps.empty:
        raise ValueError(
            f"No laps found for {driver}"
        )

    # Use the same verified representative lap.
    preferred = laps[
        laps["LapNumber"] == 55
    ]

    if preferred.empty:
        lap = laps.pick_fastest()
    else:
        lap = preferred.iloc[0]

    telemetry = lap.get_telemetry()

    return session, lap, telemetry


def get_circuit_corners(session):
    info = session.get_circuit_info()

    corners = info.corners.copy()

    if corners.empty:
        raise ValueError(
            "FastF1 returned no circuit corners."
        )

    return corners


def map_corner_to_telemetry(
    corner_x: float,
    corner_y: float,
    telemetry,
):
    """
    Find the telemetry point spatially closest to
    the FastF1 circuit corner marker.
    """

    valid = telemetry[
        telemetry["X"].notna()
        & telemetry["Y"].notna()
        & telemetry["Distance"].notna()
    ].copy()

    if valid.empty:
        raise ValueError(
            "Telemetry contains no valid X/Y/Distance data."
        )

    dx = valid["X"].to_numpy() - corner_x
    dy = valid["Y"].to_numpy() - corner_y

    distances = np.sqrt(
        dx * dx + dy * dy
    )

    index = int(
        np.argmin(distances)
    )

    point = valid.iloc[index]

    return {
        "distance": float(
            point["Distance"]
        ),
        "x": float(point["X"]),
        "y": float(point["Y"]),
        "z": (
            float(point["Z"])
            if not np.isnan(point["Z"])
            else None
        ),
        "speed": (
            float(point["Speed"])
            if not np.isnan(point["Speed"])
            else None
        ),
        "spatial_error": float(
            distances[index]
        ),
    }


def build_turn_map(
    year: int,
    event: str,
    driver: str,
):

    print(
        f"Loading {year} {event} Race..."
    )

    session, lap, telemetry = load_telemetry(
        year,
        event,
        driver,
    )

    print(
        f"Using lap: "
        f"{int(lap['LapNumber'])}"
    )

    corners = get_circuit_corners(
        session
    )

    turns = []

    for index, corner in corners.iterrows():

        number = int(
            corner["Number"]
        )

        x = float(
            corner["X"]
        )

        y = float(
            corner["Y"]
        )

        mapped = map_corner_to_telemetry(
            x,
            y,
            telemetry,
        )

        turns.append(
            {
                "number": number,
                "x": x,
                "y": y,
                "angle": float(
                    corner["Angle"]
                ),
                "distance": mapped[
                    "distance"
                ],
                "telemetry_x": mapped[
                    "x"
                ],
                "telemetry_y": mapped[
                    "y"
                ],
                "telemetry_z": mapped[
                    "z"
                ],
                "speed": mapped[
                    "speed"
                ],
                "spatial_error": mapped[
                    "spatial_error"
                ],
            }
        )

    turns.sort(
        key=lambda x: x["number"]
    )

    output = {
        "year": year,
        "event": event,
        "driver": driver,
        "lap": int(
            lap["LapNumber"]
        ),
        "track_length": float(
            telemetry["Distance"].max()
        ),
        "turn_count": len(turns),
        "turns": turns,
    }

    output_file = (
        ROOT
        / "data"
        / "circuits"
        / f"{event.lower().replace(' ', '_')}_{year}_turns.json"
    )

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True,
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
        )

    print()
    print(
        f"Saved: {output_file}"
    )

    print(
        f"Turns mapped: {len(turns)}"
    )

    print(
        f"Track length: "
        f"{output['track_length']:.2f} m"
    )

    print()
    print(
        "TURN DISTANCES:"
    )

    for turn in turns:

        print(
            f"T{turn['number']:02d}: "
            f"{turn['distance']:.1f} m "
            f"| "
            f"{turn['speed']:.1f} km/h "
            f"| "
            f"error "
            f"{turn['spatial_error']:.1f}"
        )


def main():

    year = int(
        sys.argv[1]
    )

    event = sys.argv[2]

    driver = (
        sys.argv[3]
        if len(sys.argv) > 3
        else "NOR"
    )

    build_turn_map(
        year,
        event,
        driver,
    )


if __name__ == "__main__":
    main()