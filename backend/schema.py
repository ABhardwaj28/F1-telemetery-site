from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class SessionInfo:
    year: int
    event: str
    session: str
    country: str
    location: str
    date: Optional[str]


@dataclass
class DriverInfo:
    driver_number: str
    abbreviation: str
    full_name: str
    team: str
    team_color: Optional[str] = None


@dataclass
class LapInfo:
    driver: str
    lap_number: int
    lap_time: Optional[float]
    sector1_time: Optional[float]
    sector2_time: Optional[float]
    sector3_time: Optional[float]
    compound: Optional[str]
    tyre_life: Optional[int]
    pit_in: bool
    pit_out: bool


@dataclass
class TelemetryPoint:
    distance: float
    speed: Optional[float]
    throttle: Optional[float]
    brake: Optional[bool]
    gear: Optional[int]
    rpm: Optional[float]
    drs: Optional[int]
    x: Optional[float]
    y: Optional[float]
    z: Optional[float]


@dataclass
class TurnInfo:
    number: int
    name: str
    distance: float
    x: float
    y: float
    z: float
    braking_start: Optional[float] = None
    apex: Optional[float] = None
    exit: Optional[float] = None


def to_dict(obj):
    """Convert a schema object into a JSON-compatible dictionary."""
    return asdict(obj)