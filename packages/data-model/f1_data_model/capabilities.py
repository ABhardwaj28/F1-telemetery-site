"""One authoritative capability contract for every season shown by the site."""

from __future__ import annotations

HISTORICAL_START_YEAR = 2010
RICH_DATA_START_YEAR = 2018

CORE_FEATURES = (
    "calendar",
    "results",
    "qualifying",
    "drivers",
    "constructors",
    "championship",
    "historical",
    "laps",
    "pit_stops",
)

RICH_FEATURES = (
    "telemetry",
    "track_map",
    "weather",
    "race_control",
    "tyre_stints",
    "strategy_detail",
)


def feature_available(year: int, feature: str) -> bool:
    """Return whether a feature can be promised for a selected season."""

    if feature in CORE_FEATURES:
        return year >= HISTORICAL_START_YEAR
    if feature in RICH_FEATURES:
        return year >= RICH_DATA_START_YEAR
    raise ValueError(f"Unknown feature: {feature}")


def capabilities_for_year(year: int) -> dict[str, bool]:
    """Return a serialisable site capability map for a season."""

    return {
        feature: feature_available(year, feature)
        for feature in (*CORE_FEATURES, *RICH_FEATURES)
    }
