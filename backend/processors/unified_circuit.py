from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def build_unified_circuit():

    circuit_file = (
        ROOT
        / "data"
        / "circuits"
        / "monaco_2025.json"
    )

    turns_file = (
        ROOT
        / "data"
        / "circuits"
        / "monaco_2025_turns.json"
    )

    if not circuit_file.exists():
        raise FileNotFoundError(
            f"Missing: {circuit_file}"
        )

    if not turns_file.exists():
        raise FileNotFoundError(
            f"Missing: {turns_file}"
        )

    circuit = load_json(circuit_file)
    turn_data = load_json(turns_file)

    turns = turn_data["turns"]

    unified_turns = []

    for turn in turns:

        unified_turns.append(
            {
                "number": turn["number"],
                "x": turn["x"],
                "y": turn["y"],
                "angle": turn["angle"],
                "distance": turn["distance"],
                "telemetry_x": turn["telemetry_x"],
                "telemetry_y": turn["telemetry_y"],
                "telemetry_z": turn["telemetry_z"],
                "speed": turn["speed"],
                "spatial_error": turn["spatial_error"],
            }
        )

    result = {
        "year": 2025,
        "circuit": "Monaco",
        "length_m": circuit["length"],
        "point_count": circuit["point_count"],
        "track": circuit["points"],
        "turn_count": len(unified_turns),
        "turns": unified_turns,
        "source": {
            "geometry": "FastF1 spatial telemetry",
            "corners": "FastF1 CircuitInfo",
            "telemetry_driver": turn_data["driver"],
            "telemetry_lap": turn_data["lap"],
        },
    }

    output_file = (
        ROOT
        / "data"
        / "circuits"
        / "monaco_2025_unified.json"
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

    print("=" * 60)
    print("UNIFIED CIRCUIT CREATED")
    print("=" * 60)

    print(
        f"File: {output_file}"
    )

    print(
        f"Track points: {result['point_count']}"
    )

    print(
        f"Track length: "
        f"{result['length_m']:.2f} m"
    )

    print(
        f"Turns: {result['turn_count']}"
    )


if __name__ == "__main__":
    build_unified_circuit()