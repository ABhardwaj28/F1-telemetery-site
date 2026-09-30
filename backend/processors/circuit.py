from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def clean_value(value: Any):
    """Convert values into JSON-safe Python values."""

    if value is None:
        return None

    try:
        if hasattr(value, "item"):
            return value.item()
    except Exception:
        pass

    return value


def build_circuit_from_telemetry(
    telemetry: list[dict],
    output_file: Path,
):
    """
    Build a circuit representation from real FastF1
    spatial telemetry.

    The telemetry must contain:
        X
        Y
        Z
        Distance
    """

    points = []

    for item in telemetry:

        x = item.get("X")
        y = item.get("Y")
        z = item.get("Z")
        distance = item.get("Distance")

        if x is None or y is None or distance is None:
            continue

        points.append(
            {
                "distance": float(distance),
                "x": float(x),
                "y": float(y),
                "z": float(z or 0),
            }
        )

    if not points:
        raise ValueError(
            "No valid spatial telemetry found."
        )

    # Telemetry is ordered by distance around the lap.
    points.sort(key=lambda point: point["distance"])

    # Remove duplicate distances.
    cleaned = []

    previous_distance = None

    for point in points:

        distance = point["distance"]

        if (
            previous_distance is not None
            and abs(distance - previous_distance) < 1e-6
        ):
            continue

        cleaned.append(point)
        previous_distance = distance

    circuit = {
        "points": cleaned,
        "length": cleaned[-1]["distance"],
        "point_count": len(cleaned),
    }

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
            circuit,
            file,
            indent=2,
        )

    print(f"Circuit saved: {output_file}")
    print(f"Track points: {len(cleaned)}")
    print(
        f"Track length: "
        f"{cleaned[-1]['distance']:.2f}"
    )