"""Versioned, read-only public API.

External providers are intentionally not contacted from this service. A failed
or delayed importer therefore cannot take the website offline.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from f1_data_model.capabilities import capabilities_for_year
from f1_data_model.database import Database

DATABASE_PATH = Path(os.environ.get("F1_DATABASE_PATH", "var/f1-data-lab.sqlite3"))

app = FastAPI(title="F1 Data Lab API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("F1_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=[],
)


def database() -> Database:
    instance = Database(DATABASE_PATH)
    instance.initialize()
    return instance


@app.get("/health")
def health() -> dict[str, str]:
    database()
    return {"status": "ok"}


@app.get("/api/v1/seasons/{year}/capabilities")
def season_capabilities(year: int) -> dict:
    return {"year": year, "features": capabilities_for_year(year)}


@app.get("/api/v1/seasons/{year}/events")
def season_events(year: int) -> dict:
    events = database().list_events(year)
    if not events:
        raise HTTPException(status_code=404, detail="Season has not been imported yet")
    return {"year": year, "events": events}


@app.get("/api/v1/seasons/{year}/events/{round_number}/results")
def race_results(year: int, round_number: int) -> dict:
    results = database().get_event_results(year, round_number)
    if not results:
        raise HTTPException(status_code=404, detail="Race results have not been imported yet")
    return {"year": year, "round": round_number, "results": results}
