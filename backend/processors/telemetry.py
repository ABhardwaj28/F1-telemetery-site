from __future__ import annotations

from typing import Any

import pandas as pd


TELEMETRY_COLUMNS = [
    "Time",
    "Distance",
    "Speed",
    "Throttle",
    "Brake",
    "nGear",
    "RPM",
    "DRS",
    "X",
    "Y",
    "Z",
]


def clean_value(value: Any):
    """Convert pandas/numpy values into JSON-safe Python values."""

    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    return value


def telemetry_to_records(
    car_data: pd.DataFrame,
) -> list[dict]:
    """Convert FastF1 telemetry into compact records."""

    available = [
        column
        for column in TELEMETRY_COLUMNS
        if column in car_data.columns
    ]

    data = car_data[available].copy()

    records = []

    for _, row in data.iterrows():

        record = {}

        for column in available:

            value = row[column]

            if column == "Time" and value is not None:
                try:
                    value = value.total_seconds()
                except AttributeError:
                    pass

            record[column] = clean_value(value)

        records.append(record)

    return records


def downsample_records(
    records: list[dict],
    max_points: int = 1200,
) -> list[dict]:
    """
    Reduce telemetry size while preserving the overall shape.

    1200 points per lap is more than enough for a smooth
    browser-rendered telemetry graph.
    """

    if len(records) <= max_points:
        return records

    step = len(records) / max_points

    sampled = []

    index = 0.0

    while int(index) < len(records):

        sampled.append(
            records[int(index)]
        )

        index += step

    # Always retain the final telemetry point.
    if sampled[-1] != records[-1]:
        sampled.append(records[-1])

    return sampled


def build_telemetry(
    car_data: pd.DataFrame,
    max_points: int = 1200,
) -> dict:
    """Build website-ready telemetry."""

    records = telemetry_to_records(car_data)

    records = downsample_records(
        records,
        max_points,
    )

    return {
        "points": len(records),
        "data": records,
    }