from __future__ import annotations

import json
from pathlib import Path


MONACO_TURNS = [
    {"number": 1, "name": "Sainte Devote"},
    {"number": 2, "name": "Beau Rivage"},
    {"number": 3, "name": "Massenet"},
    {"number": 4, "name": "Casino"},
    {"number": 5, "name": "Mirabeau Haute"},
    {"number": 6, "name": "Fairmont Hairpin"},
    {"number": 7, "name": "Mirabeau Bas"},
    {"number": 8, "name": "Portier"},
    {"number": 9, "name": "Tunnel"},
    {"number": 10, "name": "Nouvelle Chicane"},
    {"number": 11, "name": "Tabac"},
    {"number": 12, "name": "Louis Chiron"},
    {"number": 13, "name": "Piscine"},
    {"number": 14, "name": "Piscine"},
    {"number": 15, "name": "La Rascasse"},
    {"number": 16, "name": "Anthony Noghes"},
    {"number": 17, "name": "Anthony Noghes"},
    {"number": 18, "name": "Anthony Noghes"},
    {"number": 19, "name": "Anthony Noghes"},
]


def load_telemetry(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    return data["telemetry"]["data"]


def clean_points(telemetry: list[dict]) -> list[dict]:
    points = []

    for point in telemetry:

        distance = point.get("Distance")
        speed = point.get("Speed")

        if distance is None or speed is None:
            continue

        points.append(
            {
                "distance": float(distance),
                "speed": float(speed),
                "brake": bool(point.get("Brake", False)),
                "x": float(point["X"]) if point.get("X") is not None else None,
                "y": float(point["Y"]) if point.get("Y") is not None else None,
                "z": float(point["Z"]) if point.get("Z") is not None else None,
            }
        )

    points.sort(key=lambda x: x["distance"])

    return points


def find_braking_zones(points: list[dict]) -> list[dict]:
    """
    Find contiguous braking regions from real telemetry.

    These are telemetry-derived zones, not guessed corner positions.
    """

    zones = []
    current = []

    for point in points:

        if point["brake"]:

            if not current:
                current = [point]

            else:
                previous = current[-1]

                # Keep points that are reasonably close together.
                if point["distance"] - previous["distance"] < 100:
                    current.append(point)

                else:
                    if len(current) >= 2:
                        zones.append(current)

                    current = [point]

        else:

            if current:

                if len(current) >= 2:
                    zones.append(current)

                current = []

    if len(current) >= 2:
        zones.append(current)

    result = []

    for zone in zones:

        start = zone[0]
        end = zone[-1]

        result.append(
            {
                "start_distance": start["distance"],
                "end_distance": end["distance"],
                "minimum_speed": min(
                    point["speed"]
                    for point in zone
                ),
            }
        )

    return result


def find_speed_minima(
    points: list[dict],
    minimum_separation: float = 80,
) -> list[dict]:
    """
    Find significant local speed minima.

    These provide candidate apex regions.
    """

    candidates = []

    for i in range(1, len(points) - 1):

        previous = points[i - 1]
        current = points[i]
        following = points[i + 1]

        if (
            current["speed"] <= previous["speed"]
            and current["speed"] <= following["speed"]
        ):

            if not candidates:

                candidates.append(current)

            elif (
                current["distance"]
                - candidates[-1]["distance"]
                >= minimum_separation
            ):

                candidates.append(current)

            elif current["speed"] < candidates[-1]["speed"]:

                candidates[-1] = current

    return candidates


def build_turn_candidates(
    telemetry_file: Path,
    output_file: Path,
):

    telemetry = load_telemetry(
        telemetry_file
    )

    points = clean_points(
        telemetry
    )

    if not points:
        raise ValueError(
            "No usable telemetry points found."
        )

    braking_zones = find_braking_zones(
        points
    )

    minima = find_speed_minima(
        points
    )

    candidates = []

    for minimum in minima:

        distance = minimum["distance"]

        matching_zone = None

        for zone in braking_zones:

            if (
                zone["start_distance"]
                <= distance
                <= zone["end_distance"] + 150
            ):
                matching_zone = zone
                break

        candidates.append(
            {
                "distance": distance,
                "speed": minimum["speed"],
                "x": minimum["x"],
                "y": minimum["y"],
                "z": minimum["z"],
                "braking_start": (
                    matching_zone["start_distance"]
                    if matching_zone
                    else None
                ),
                "braking_end": (
                    matching_zone["end_distance"]
                    if matching_zone
                    else None
                ),
            }
        )

    result = {
        "circuit": "Monaco",
        "source": str(telemetry_file),
        "telemetry_points": len(points),
        "braking_zones": braking_zones,
        "candidate_apexes": candidates,
        "official_turns": MONACO_TURNS,
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
            result,
            file,
            indent=2,
        )

    print(
        f"Turn analysis saved: {output_file}"
    )

    print(
        f"Telemetry points: {len(points)}"
    )

    print(
        f"Braking zones: {len(braking_zones)}"
    )

    print(
        f"Candidate apexes: {len(candidates)}"
    )


def main():

    root = Path(__file__).resolve().parents[2]

    telemetry_file = (
        root
        / "data"
        / "telemetry"
        / "2025"
        / "monaco"
        / "NOR"
        / "lap_055.json"
    )

    output_file = (
        root
        / "data"
        / "circuits"
        / "monaco_2025_turn_analysis.json"
    )

    build_turn_candidates(
        telemetry_file,
        output_file,
    )


if __name__ == "__main__":
    main()