from __future__ import annotations

import json
from pathlib import Path


MONACO_METADATA = {
    "circuit": "Monaco",
    "length_km": 3.337,
    "turn_count": 19,

    "turns": [
        {"number": 1, "name": "Sainte Devote"},
        {"number": 2, "name": "Beau Rivage"},
        {"number": 3, "name": "Massenet"},
        {"number": 4, "name": "Casino"},
        {"number": 5, "name": "Mirabeau Haute"},
        {"number": 6, "name": "Fairmont"},
        {"number": 7, "name": "Mirabeau Bas"},
        {"number": 8, "name": "Portier"},
        {"number": 9, "name": "Tunnel"},
        {"number": 10, "name": "Nouvelle Chicane"},
        {"number": 11, "name": "Nouvelle Chicane"},
        {"number": 12, "name": "Tabac"},
        {"number": 13, "name": "Louis Chiron"},
        {"number": 14, "name": "Louis Chiron"},
        {"number": 15, "name": "Piscine"},
        {"number": 16, "name": "Piscine"},
        {"number": 17, "name": "Rascasse"},
        {"number": 18, "name": "Rascasse"},
        {"number": 19, "name": "Anthony Noghes"},
    ],
}


def save_metadata(output_file: Path):

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
            MONACO_METADATA,
            file,
            indent=2,
        )

    print(
        f"Metadata saved: {output_file}"
    )

    print(
        f"Turns: {MONACO_METADATA['turn_count']}"
    )


if __name__ == "__main__":

    root = Path(__file__).resolve().parents[2]

    output = (
        root
        / "data"
        / "circuits"
        / "monaco_2025_metadata.json"
    )

    save_metadata(output)