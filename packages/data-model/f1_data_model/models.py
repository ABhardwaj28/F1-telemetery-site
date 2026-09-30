"""Provider-neutral records shared between importers and the public API.

All times are stored as strings to preserve source formatting exactly (e.g.
``"1:20.456"``).  The API layer is responsible for any further conversion.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


# ---------------------------------------------------------------------------
# Core / Jolpica records
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class EventRecord:
    year: int
    round_number: int
    name: str
    circuit_id: str | None
    circuit_name: str | None
    country: str | None
    location: str | None
    race_date: str | None
    race_time: str | None


@dataclass(frozen=True)
class ResultRecord:
    driver_id: str
    driver_name: str
    driver_code: str | None
    constructor_id: str | None
    constructor_name: str | None
    grid: int | None
    position: int | None
    position_text: str | None
    points: float
    laps: int | None
    status: str | None
    fastest_lap_rank: int | None
    fastest_lap_time: str | None


@dataclass(frozen=True)
class QualifyingRecord:
    driver_id: str
    driver_name: str
    driver_code: str | None
    constructor_id: str | None
    constructor_name: str | None
    position: int | None
    q1_time: str | None
    q2_time: str | None
    q3_time: str | None


@dataclass(frozen=True)
class LapRecord:
    driver_id: str
    lap_number: int
    position: int | None
    lap_time: str | None
    pit_in_time: str | None
    pit_out_time: str | None


@dataclass(frozen=True)
class PitStopRecord:
    driver_id: str
    stop_number: int
    lap: int
    local_time: str | None
    duration: str | None


@dataclass(frozen=True)
class DriverStandingRecord:
    driver_id: str
    driver_name: str
    driver_code: str | None
    constructor_id: str | None
    constructor_name: str | None
    position: int | None
    points: float
    wins: int


@dataclass(frozen=True)
class ConstructorStandingRecord:
    constructor_id: str
    constructor_name: str
    position: int | None
    points: float
    wins: int


# ---------------------------------------------------------------------------
# Rich / FastF1 records (2018+)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TyreStintRecord:
    driver_id: str
    stint_number: int
    compound: str | None
    start_lap: int
    end_lap: int
    tyre_life_laps: int | None
    fresh_tyre: bool | None


@dataclass(frozen=True)
class TelemetryPoint:
    driver_id: str
    lap_number: int
    distance: float
    speed: float | None
    throttle: float | None
    brake: bool | None
    gear: int | None
    rpm: float | None
    drs: int | None
    x: float | None
    y: float | None
    z: float | None


@dataclass(frozen=True)
class WeatherSample:
    time_offset: str  # ISO duration or seconds-string from session start
    air_temp: float | None
    track_temp: float | None
    humidity: float | None
    pressure: float | None
    wind_speed: float | None
    wind_direction: float | None
    rainfall: bool | None


@dataclass(frozen=True)
class RaceControlMessage:
    time_offset: str
    lap_number: int | None
    driver_id: str | None
    flag: str | None
    scope: str | None
    sector: int | None
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def as_api_dict(value: Any) -> dict[str, Any]:
    """Convert a dataclass record to a JSON-compatible dictionary."""
    return asdict(value)

