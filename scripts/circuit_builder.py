from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the project root to Python's import path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.processors.circuit import build_circuit_from_telemetry


def load_telemetry(path: Path):
    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    return data["telemetry"]["data"]


def main():

    if len(sys.argv) < 3:
        print(
            "Usage:\n"
            "python scripts/circuit_builder.py 2025 Monaco"
        )
        sys.exit(1)

    year = int(sys.argv[1])
    event = " ".join(sys.argv[2:])

    event_folder = event.lower().replace(" ", "_")

    telemetry_root = (
        ROOT
        / "data"
        / "telemetry"
        / str(year)
        / event_folder
        / "NOR"
    )

    files = sorted(telemetry_root.glob("lap_*.json"))

    if not files:
        raise FileNotFoundError(
            f"No telemetry found in {telemetry_root}"
        )

    # Use the verified Monaco lap if available.
    preferred = telemetry_root / "lap_055.json"

    telemetry_file = (
        preferred
        if preferred.exists()
        else files[len(files) // 2]
    )

    print(f"Using telemetry: {telemetry_file}")

    telemetry = load_telemetry(telemetry_file)

    output_file = (
        ROOT
        / "data"
        / "circuits"
        / f"{event_folder}_{year}.json"
    )

    build_circuit_from_telemetry(
        telemetry,
        output_file,
    )


if __name__ == "__main__":
    main()