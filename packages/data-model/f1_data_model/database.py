"""SQLite persistence for core historical F1 records.

SQLite is the local-development store. Its schema uses provider-neutral IDs so it
can be migrated to Postgres without changing API contracts.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import EventRecord, ResultRecord


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS seasons (
                    year INTEGER PRIMARY KEY,
                    source TEXT NOT NULL,
                    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY,
                    year INTEGER NOT NULL REFERENCES seasons(year),
                    round_number INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    circuit_id TEXT,
                    circuit_name TEXT,
                    country TEXT,
                    location TEXT,
                    race_date TEXT,
                    race_time TEXT,
                    UNIQUE(year, round_number)
                );

                CREATE TABLE IF NOT EXISTS drivers (
                    driver_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    code TEXT
                );

                CREATE TABLE IF NOT EXISTS constructors (
                    constructor_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS race_results (
                    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    driver_id TEXT NOT NULL REFERENCES drivers(driver_id),
                    constructor_id TEXT REFERENCES constructors(constructor_id),
                    grid INTEGER,
                    position INTEGER,
                    position_text TEXT,
                    points REAL NOT NULL,
                    laps INTEGER,
                    status TEXT,
                    fastest_lap_rank INTEGER,
                    fastest_lap_time TEXT,
                    PRIMARY KEY(event_id, driver_id)
                );

                CREATE INDEX IF NOT EXISTS idx_events_year ON events(year, round_number);
                CREATE INDEX IF NOT EXISTS idx_results_event ON race_results(event_id);
                """
            )

    def upsert_season(self, year: int, source: str) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO seasons(year, source) VALUES (?, ?) "
                "ON CONFLICT(year) DO UPDATE SET source = excluded.source, "
                "imported_at = CURRENT_TIMESTAMP",
                (year, source),
            )

    def upsert_event(self, event: EventRecord) -> int:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO events(
                    year, round_number, name, circuit_id, circuit_name,
                    country, location, race_date, race_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(year, round_number) DO UPDATE SET
                    name = excluded.name,
                    circuit_id = excluded.circuit_id,
                    circuit_name = excluded.circuit_name,
                    country = excluded.country,
                    location = excluded.location,
                    race_date = excluded.race_date,
                    race_time = excluded.race_time
                """,
                (
                    event.year,
                    event.round_number,
                    event.name,
                    event.circuit_id,
                    event.circuit_name,
                    event.country,
                    event.location,
                    event.race_date,
                    event.race_time,
                ),
            )
            row = connection.execute(
                "SELECT id FROM events WHERE year = ? AND round_number = ?",
                (event.year, event.round_number),
            ).fetchone()
            assert row is not None
            return int(row["id"])

    def replace_results(self, event_id: int, results: list[ResultRecord]) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM race_results WHERE event_id = ?", (event_id,))
            for result in results:
                connection.execute(
                    "INSERT INTO drivers(driver_id, name, code) VALUES (?, ?, ?) "
                    "ON CONFLICT(driver_id) DO UPDATE SET name = excluded.name, code = excluded.code",
                    (result.driver_id, result.driver_name, result.driver_code),
                )
                if result.constructor_id and result.constructor_name:
                    connection.execute(
                        "INSERT INTO constructors(constructor_id, name) VALUES (?, ?) "
                        "ON CONFLICT(constructor_id) DO UPDATE SET name = excluded.name",
                        (result.constructor_id, result.constructor_name),
                    )
                connection.execute(
                    """
                    INSERT INTO race_results(
                        event_id, driver_id, constructor_id, grid, position,
                        position_text, points, laps, status, fastest_lap_rank,
                        fastest_lap_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event_id,
                        result.driver_id,
                        result.constructor_id,
                        result.grid,
                        result.position,
                        result.position_text,
                        result.points,
                        result.laps,
                        result.status,
                        result.fastest_lap_rank,
                        result.fastest_lap_time,
                    ),
                )

    def list_events(self, year: int) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT round_number, name, circuit_id, circuit_name, country, "
                "location, race_date, race_time FROM events WHERE year = ? "
                "ORDER BY round_number",
                (year,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_event_results(self, year: int, round_number: int) -> list[dict]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT r.position, r.position_text, r.points, r.grid, r.laps,
                       r.status, r.fastest_lap_rank, r.fastest_lap_time,
                       d.driver_id, d.name AS driver_name, d.code AS driver_code,
                       c.constructor_id, c.name AS constructor_name
                FROM race_results r
                JOIN events e ON e.id = r.event_id
                JOIN drivers d ON d.driver_id = r.driver_id
                LEFT JOIN constructors c ON c.constructor_id = r.constructor_id
                WHERE e.year = ? AND e.round_number = ?
                ORDER BY CASE WHEN r.position IS NULL THEN 1 ELSE 0 END, r.position
                """,
                (year, round_number),
            ).fetchall()
        return [dict(row) for row in rows]
