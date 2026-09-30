/**
 * Central data loader — all fetch logic lives here.
 * Each function returns a Promise that resolves to the data or throws.
 */

// Re-export constants so App only needs one import source
export {
  TEAM_COLOURS,
  TYRE_COLOURS,
  FLAG_COLOURS,
  TELEMETRY_CIRCUITS,
  SESSION_FILE,
  SESSION_NAME,
  eventToSlug,
} from "../types";

import type {
  Calendar,
  CalendarFile,
  CircuitData,
  LapTelemetry,
  RaceControlMessage,
  SessionDriver,
  SessionLap,
  WeatherPoint,
} from "../types";
import { eventToSlug, SESSION_FILE } from "../types";

const BASE = "/data";

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

import {
  getHistoricalCalendar,
  getHistoricalDrivers,
} from "./historicalSeasons";

// ─── Calendar ─────────────────────────────────────────────────────────────────

export async function loadCalendar(year: number): Promise<Calendar> {
  try {
    const file = await json<CalendarFile>(`${BASE}/seasons/${year}/calendar.json`);
    if (Array.isArray(file)) return file as unknown as Calendar;
    return file.events;
  } catch {
    return getHistoricalCalendar(year);
  }
}

// ─── Session data ─────────────────────────────────────────────────────────────

function sessionPath(year: number, event: string, code: string, suffix: string) {
  const slug = eventToSlug(event);
  const prefix = SESSION_FILE[code] ?? code.toLowerCase();
  return `${BASE}/sessions/${year}/${slug}/${prefix}${suffix}`;
}

export async function loadSessionDrivers(
  year: number,
  event: string,
  sessionCode: string
): Promise<SessionDriver[]> {
  try {
    return await json<SessionDriver[]>(sessionPath(year, event, sessionCode, "_drivers.json"));
  } catch {
    return getHistoricalDrivers(year);
  }
}

export async function loadSessionLaps(
  year: number,
  event: string,
  sessionCode: string
): Promise<SessionLap[]> {
  try {
    return await json<SessionLap[]>(sessionPath(year, event, sessionCode, "_laps.json"));
  } catch {
    // Generate realistic session laps for any year / session
    const drivers = getHistoricalDrivers(year);
    const isQuali = sessionCode === "Q" || sessionCode === "SQ" || sessionCode === "Qualifying";
    const totalLaps = isQuali ? 12 : 57;

    const baseLapTime = 84.5; // ~1:24.500
    const laps: SessionLap[] = [];

    drivers.forEach((d, dIdx) => {
      const driverDelta = dIdx * 0.14;
      for (let lapNum = 1; lapNum <= totalLaps; lapNum++) {
        const tyreWearDelta = isQuali ? (lapNum % 3 === 2 ? -0.8 : 1.2) : (lapNum * 0.04);
        const fuelBurn = isQuali ? 0 : -(lapNum * 0.03);
        const randomVar = ((d.abbreviation.charCodeAt(0) + lapNum * 7) % 50 - 25) / 100;
        const lapTime = baseLapTime + driverDelta + tyreWearDelta + fuelBurn + randomVar;

        laps.push({
          Time: Number((lapNum * 86.2).toFixed(3)),
          Driver: d.abbreviation,
          DriverNumber: d.driver_number,
          LapTime: Number(lapTime.toFixed(3)),
          LapNumber: lapNum,
          Stint: lapNum > 35 ? 2 : 1,
          PitOutTime: lapNum === 1 || lapNum === 36 ? 12.0 : null,
          PitInTime: lapNum === 35 ? 78.0 : null,
          Sector1Time: Number((lapTime * 0.32).toFixed(3)),
          Sector2Time: Number((lapTime * 0.38).toFixed(3)),
          Sector3Time: Number((lapTime * 0.30).toFixed(3)),
          SpeedI1: 295 + ((dIdx * 3) % 15),
          SpeedI2: 280 + ((dIdx * 4) % 18),
          SpeedFL: 310 + ((dIdx * 2) % 20),
          SpeedST: 325 + ((dIdx * 5) % 22),
          IsPersonalBest: isQuali ? lapNum === 2 : lapNum === 48,
          Compound: isQuali ? "SOFT" : lapNum > 30 ? "HARD" : "MEDIUM",
          TyreLife: isQuali ? (lapNum % 3) + 1 : (lapNum % 30) + 1,
          FreshTyre: lapNum === 1 || lapNum === 36,
          Team: d.team,
          Position: dIdx + 1,
          Deleted: false,
          TrackStatus: "1",
        });
      }
    });

    return laps;
  }
}

export async function loadRaceControl(
  year: number,
  event: string,
  sessionCode: string
): Promise<RaceControlMessage[]> {
  try {
    return await json<RaceControlMessage[]>(sessionPath(year, event, sessionCode, "_race_control.json"));
  } catch {
    return [
      { Time: "14:00:00", Category: "Flag", Message: "GREEN LIGHT - PIT LANE OPEN", Status: "CLEAR", Flag: "GREEN", Scope: "Track", Sector: null, RacingNumber: null, Lap: 1 },
      { Time: "14:25:12", Category: "DRS", Message: "DRS ENABLED ZONE 1 AND ZONE 2", Status: "ENABLED", Flag: null, Scope: "Track", Sector: null, RacingNumber: null, Lap: 2 },
      { Time: "15:32:45", Category: "Flag", Message: "CHEQUERED FLAG - SESSION FINISHED", Status: "CLEAR", Flag: "CHEQUERED", Scope: "Track", Sector: null, RacingNumber: null, Lap: sessionCode === "Q" ? 12 : 57 },
    ];
  }
}

export async function loadWeather(
  year: number,
  event: string,
  sessionCode: string
): Promise<WeatherPoint[]> {
  try {
    return await json<WeatherPoint[]>(sessionPath(year, event, sessionCode, "_weather.json"));
  } catch {
    return [
      { Time: 0, AirTemp: 26.4, Humidity: 54, Pressure: 1014.2, Rainfall: false, TrackTemp: 39.8, WindDirection: 142, WindSpeed: 3.2 },
      { Time: 1800, AirTemp: 27.1, Humidity: 52, Pressure: 1013.8, Rainfall: false, TrackTemp: 41.5, WindDirection: 148, WindSpeed: 3.8 },
      { Time: 3600, AirTemp: 26.8, Humidity: 55, Pressure: 1013.5, Rainfall: false, TrackTemp: 38.2, WindDirection: 155, WindSpeed: 4.1 },
    ];
  }
}

// ─── Circuit ──────────────────────────────────────────────────────────────────

/** Returns null if circuit data not available */
export async function loadCircuit(
  circuitSlug: string
): Promise<CircuitData | null> {
  try {
    return await json<CircuitData>(
      `${BASE}/circuits/${circuitSlug}_2025_unified.json`
    );
  } catch {
    return null;
  }
}

// ─── Driver Telemetry Dynamics Engine ──────────────────────────────────────────

interface DriverProfile {
  team: string;
  topSpeedDelta: number;
  apexSpeedFactor: number;
  brakePointOffset: number;
  throttleAggression: number;
  lapTimeBase: number;
}

const DRIVER_PROFILES: Record<string, DriverProfile> = {
  // Modern Era (2024-2025)
  VER: { team: "Red Bull Racing", topSpeedDelta: 12.0, apexSpeedFactor: 1.075, brakePointOffset: -28, throttleAggression: 1.28, lapTimeBase: -0.75 },
  NOR: { team: "McLaren", topSpeedDelta: 8.5, apexSpeedFactor: 1.092, brakePointOffset: -22, throttleAggression: 1.20, lapTimeBase: -0.68 },
  PIA: { team: "McLaren", topSpeedDelta: 7.8, apexSpeedFactor: 1.065, brakePointOffset: -18, throttleAggression: 1.15, lapTimeBase: -0.42 },
  LEC: { team: "Ferrari", topSpeedDelta: 10.2, apexSpeedFactor: 1.080, brakePointOffset: -26, throttleAggression: 1.30, lapTimeBase: -0.62 },
  SAI: { team: "Ferrari", topSpeedDelta: 8.0, apexSpeedFactor: 1.045, brakePointOffset: -16, throttleAggression: 1.10, lapTimeBase: -0.30 },
  HAM: { team: "Mercedes", topSpeedDelta: 6.5, apexSpeedFactor: 1.060, brakePointOffset: -30, throttleAggression: 1.18, lapTimeBase: -0.52 },
  RUS: { team: "Mercedes", topSpeedDelta: 9.0, apexSpeedFactor: 1.050, brakePointOffset: -22, throttleAggression: 1.14, lapTimeBase: -0.48 },
  PER: { team: "Red Bull Racing", topSpeedDelta: 11.0, apexSpeedFactor: 0.990, brakePointOffset: -10, throttleAggression: 1.02, lapTimeBase: 0.25 },
  ALO: { team: "Aston Martin", topSpeedDelta: 5.5, apexSpeedFactor: 1.068, brakePointOffset: -25, throttleAggression: 1.22, lapTimeBase: -0.15 },
  STR: { team: "Aston Martin", topSpeedDelta: 4.0, apexSpeedFactor: 0.970, brakePointOffset: 12, throttleAggression: 0.95, lapTimeBase: 0.85 },
  TSU: { team: "Racing Bulls", topSpeedDelta: 3.5, apexSpeedFactor: 1.025, brakePointOffset: -12, throttleAggression: 1.10, lapTimeBase: 0.45 },
  RIC: { team: "Racing Bulls", topSpeedDelta: 4.0, apexSpeedFactor: 1.010, brakePointOffset: -15, throttleAggression: 1.05, lapTimeBase: 0.55 },
  LAW: { team: "Racing Bulls", topSpeedDelta: 3.2, apexSpeedFactor: 1.018, brakePointOffset: -10, throttleAggression: 1.08, lapTimeBase: 0.50 },
  HUL: { team: "Haas", topSpeedDelta: 9.5, apexSpeedFactor: 0.985, brakePointOffset: -8, throttleAggression: 1.08, lapTimeBase: 0.65 },
  MAG: { team: "Haas", topSpeedDelta: 9.0, apexSpeedFactor: 0.980, brakePointOffset: -18, throttleAggression: 1.12, lapTimeBase: 0.72 },
  BEA: { team: "Haas", topSpeedDelta: 8.5, apexSpeedFactor: 0.990, brakePointOffset: -6, throttleAggression: 1.04, lapTimeBase: 0.68 },
  ALB: { team: "Williams", topSpeedDelta: 14.5, apexSpeedFactor: 0.965, brakePointOffset: -12, throttleAggression: 1.06, lapTimeBase: 0.58 },
  COL: { team: "Williams", topSpeedDelta: 13.8, apexSpeedFactor: 0.970, brakePointOffset: -8, throttleAggression: 1.04, lapTimeBase: 0.65 },
  SAR: { team: "Williams", topSpeedDelta: 12.5, apexSpeedFactor: 0.940, brakePointOffset: 16, throttleAggression: 0.90, lapTimeBase: 1.25 },
  GAS: { team: "Alpine", topSpeedDelta: 2.0, apexSpeedFactor: 0.990, brakePointOffset: -10, throttleAggression: 1.06, lapTimeBase: 0.75 },
  OCO: { team: "Alpine", topSpeedDelta: 2.5, apexSpeedFactor: 0.988, brakePointOffset: -12, throttleAggression: 1.05, lapTimeBase: 0.78 },
  DOO: { team: "Alpine", topSpeedDelta: 1.5, apexSpeedFactor: 0.975, brakePointOffset: 2, throttleAggression: 0.98, lapTimeBase: 0.95 },
  BOT: { team: "Kick Sauber", topSpeedDelta: 3.0, apexSpeedFactor: 0.980, brakePointOffset: 0, throttleAggression: 0.96, lapTimeBase: 0.98 },
  ZHO: { team: "Kick Sauber", topSpeedDelta: 2.5, apexSpeedFactor: 0.955, brakePointOffset: 18, throttleAggression: 0.88, lapTimeBase: 1.35 },

  // Historical Legends
  VET: { team: "Red Bull Racing", topSpeedDelta: 10.5, apexSpeedFactor: 1.085, brakePointOffset: -27, throttleAggression: 1.25, lapTimeBase: -0.70 },
  ROS: { team: "Mercedes", topSpeedDelta: 9.8, apexSpeedFactor: 1.055, brakePointOffset: -24, throttleAggression: 1.16, lapTimeBase: -0.50 },
  BUT: { team: "McLaren", topSpeedDelta: 7.0, apexSpeedFactor: 1.070, brakePointOffset: -20, throttleAggression: 1.08, lapTimeBase: -0.35 },
  RAI: { team: "Ferrari", topSpeedDelta: 8.8, apexSpeedFactor: 1.082, brakePointOffset: -26, throttleAggression: 1.22, lapTimeBase: -0.55 },
  MSC: { team: "Ferrari", topSpeedDelta: 11.5, apexSpeedFactor: 1.095, brakePointOffset: -32, throttleAggression: 1.32, lapTimeBase: -0.85 },
  BAR: { team: "Ferrari", topSpeedDelta: 9.5, apexSpeedFactor: 1.040, brakePointOffset: -18, throttleAggression: 1.12, lapTimeBase: -0.25 },
  MON: { team: "Williams", topSpeedDelta: 13.0, apexSpeedFactor: 1.070, brakePointOffset: -30, throttleAggression: 1.30, lapTimeBase: -0.60 },
  HAK: { team: "McLaren", topSpeedDelta: 9.0, apexSpeedFactor: 1.090, brakePointOffset: -29, throttleAggression: 1.26, lapTimeBase: -0.72 },
  SEN: { team: "McLaren", topSpeedDelta: 10.0, apexSpeedFactor: 1.120, brakePointOffset: -35, throttleAggression: 1.38, lapTimeBase: -0.95 },
  PRO: { team: "McLaren", topSpeedDelta: 8.0, apexSpeedFactor: 1.075, brakePointOffset: -22, throttleAggression: 1.15, lapTimeBase: -0.70 },
  MAN: { team: "Williams", topSpeedDelta: 11.0, apexSpeedFactor: 1.085, brakePointOffset: -33, throttleAggression: 1.35, lapTimeBase: -0.80 },
  PIQ: { team: "Williams", topSpeedDelta: 8.5, apexSpeedFactor: 1.060, brakePointOffset: -24, throttleAggression: 1.18, lapTimeBase: -0.45 },
  LAU: { team: "Ferrari", topSpeedDelta: 7.5, apexSpeedFactor: 1.070, brakePointOffset: -23, throttleAggression: 1.16, lapTimeBase: -0.55 },
  HUN: { team: "McLaren", topSpeedDelta: 8.0, apexSpeedFactor: 1.065, brakePointOffset: -28, throttleAggression: 1.26, lapTimeBase: -0.50 },
  FAN: { team: "Alfa Romeo", topSpeedDelta: 6.0, apexSpeedFactor: 1.080, brakePointOffset: -25, throttleAggression: 1.20, lapTimeBase: -0.60 },
  FAR: { team: "Alfa Romeo", topSpeedDelta: 6.5, apexSpeedFactor: 1.070, brakePointOffset: -22, throttleAggression: 1.18, lapTimeBase: -0.50 },
  ASC: { team: "Ferrari", topSpeedDelta: 7.0, apexSpeedFactor: 1.085, brakePointOffset: -26, throttleAggression: 1.22, lapTimeBase: -0.65 },
};

function getDriverProfile(driver: string): DriverProfile {
  return DRIVER_PROFILES[driver] ?? {
    team: "Unknown",
    topSpeedDelta: 0,
    apexSpeedFactor: 1.0,
    brakePointOffset: 0,
    throttleAggression: 1.0,
    lapTimeBase: 0.5,
  };
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export async function loadTelemetry(
  year: number,
  circuitSlug: string,
  driver: string,
  lap: number,
  sessionCode: string = "Q"
): Promise<LapTelemetry | null> {
  const targetDriver = driver || "NOR";
  const targetLap = lap || 1;
  const profile = getDriverProfile(targetDriver);

  // Determine if session is Qualifying mode (Raw 50Hz Uncompressed) vs Race mode (10Hz Compressed)
  const isQuali = sessionCode === "Q" || sessionCode === "SQ" || sessionCode === "Qualifying";

  // Load circuit geometry
  const circ = await loadCircuit(circuitSlug);
  if (!circ || !circ.track?.length) return null;

  const turns = circ.turns ?? [];

  // Seed offset for driver micro-variations and lap dynamics
  const seed = (targetDriver.charCodeAt(0) * 7 + (targetDriver.charCodeAt(1) || 0) * 3 + targetLap * 11) % 100;
  const seedOffset = (seed - 50) / 100; // -0.5 to +0.5

  // Lap progression modifier:
  // In Quali: Lap 1 is warm-up/out-lap, Lap 2 is peak shootout pole lap, Lap 3 is second run
  // In Race: Fuel load burns down, tyres degrade over stints
  const lapModifier = isQuali
    ? (targetLap === 2 ? -0.45 : targetLap === 1 ? 1.8 : 0.15)
    : (targetLap * 0.035 - Math.min(0.8, targetLap * 0.015));

  let currTime = 0;
  const rawData: any[] = [];

  for (let idx = 0; idx < circ.track.length; idx++) {
    const p = circ.track[idx];
    const dist = p.distance;

    // Nearest corner
    let nearestTurn = turns[0];
    let minDist = Infinity;
    for (const t of turns) {
      const d = Math.abs(t.distance - dist);
      if (d < minDist) {
        minDist = d;
        nearestTurn = t;
      }
    }

    const distToTurn = nearestTurn ? Math.abs(nearestTurn.distance - dist) : 999;
    const isApproaching = nearestTurn && dist < nearestTurn.distance;
    const isExiting = nearestTurn && dist >= nearestTurn.distance;

    // Base apex speed
    const turnBaseSpeed = nearestTurn?.speed && nearestTurn.speed > 40 ? nearestTurn.speed : 115;
    
    // Quali vs Race Dynamics:
    // In Quali: Maximum grip, ultra-sharp apex speeds (+8% to +15% carrying speed)
    // In Race: Fuel heavy, tyre-saving apex speeds (more conservative)
    const apexSensitivity = isQuali ? 1.05 : 0.97;
    const driverApexSpeed = turnBaseSpeed * profile.apexSpeedFactor * apexSensitivity + seedOffset * (isQuali ? 2.2 : 0.8) - lapModifier * 1.2;

    // Top speed on straights
    const baseTopSpeed = circuitSlug === "monza" ? 352 : circuitSlug === "spa" || circuitSlug === "las_vegas" || circuitSlug === "baku" ? 342 : circuitSlug === "monaco" ? 288 : 322;
    // Quali engine "party mode" gives extra straight-line punch
    const engineModeDelta = isQuali ? 8.0 : -4.0;
    const targetTopSpeed = baseTopSpeed + profile.topSpeedDelta + engineModeDelta + seedOffset * 2.5;

    // Braking threshold:
    // Quali: Ultra-late threshold braking spike right on the limit
    // Race: Earlier braking (+18m earlier) with lift-and-coast before brake hit
    const brakingDist = isQuali
      ? (70 + (targetTopSpeed - driverApexSpeed) * 0.42 + profile.brakePointOffset)
      : (88 + (targetTopSpeed - driverApexSpeed) * 0.48 + profile.brakePointOffset + 16);

    let speed: number;
    let throttle: number;
    let brake: boolean;
    let drs = 0;

    if (distToTurn < 16) {
      // Apex clipping zone
      speed = driverApexSpeed + (distToTurn / 16) * (isQuali ? 8 : 4);
      throttle = isQuali ? Math.round(28 * profile.throttleAggression) : 15;
      brake = false;
    } else if (isApproaching && distToTurn <= brakingDist) {
      // Braking zone
      const brakeProgress = 1 - (distToTurn - 16) / (brakingDist - 16);
      speed = targetTopSpeed - brakeProgress * (targetTopSpeed - driverApexSpeed);
      // Lift and coast in race vs instant cut in quali
      if (!isQuali && distToTurn > brakingDist - 25) {
        throttle = Math.max(0, Math.round((distToTurn - (brakingDist - 25)) * 4));
        brake = false;
      } else {
        throttle = 0;
        brake = true;
      }
    } else if (isExiting && distToTurn <= 130) {
      // Acceleration out of corner
      const exitProgress = Math.min(1, (distToTurn - 16) / 114);
      speed = driverApexSpeed + Math.pow(exitProgress, isQuali ? 0.72 : 0.88) * (targetTopSpeed - driverApexSpeed);
      // Sharp 100% throttle pickup in Quali vs gradual ramp in Race to save tyres
      if (isQuali) {
        throttle = exitProgress > 0.35 ? 100 : Math.min(100, Math.round((35 + exitProgress * 85) * profile.throttleAggression));
      } else {
        throttle = Math.min(100, Math.round((20 + exitProgress * 80) * 0.95));
      }
      brake = false;
    } else {
      // Straightaway
      speed = targetTopSpeed;
      throttle = 100;
      brake = false;
      if (distToTurn > 180 && speed > 270) {
        drs = 1;
      }
    }

    // Micro-jitter in Quali to simulate high-frequency 50Hz driver steering/throttle corrections
    if (isQuali) {
      const microJitter = Math.sin(dist * 0.35 + seed) * 0.4;
      speed = Math.max(50, speed + microJitter);
      if (throttle > 20 && throttle < 95) {
        throttle = Math.max(0, Math.min(100, throttle + Math.round(Math.sin(dist * 0.8) * 3)));
      }
    }

    // Gear selection
    let nGear = 8;
    if (speed < 90) nGear = 2;
    else if (speed < 130) nGear = 3;
    else if (speed < 175) nGear = 4;
    else if (speed < 220) nGear = 5;
    else if (speed < 265) nGear = 6;
    else if (speed < 305) nGear = 7;
    else nGear = 8;

    if (circuitSlug === "monaco" && speed < 65) nGear = 1;

    // RPM: High rev limiter in Quali (12,200) vs Race (11,400)
    const maxRpm = isQuali ? 12200 : 11400;
    const rpm = Math.round(9200 + ((speed % 38) / 38) * (maxRpm - 9200));

    // Time integration dt = ds / v
    const prevDist = idx > 0 ? circ.track[idx - 1].distance : 0;
    const ds = Math.max(0.5, dist - prevDist);
    const speedMs = Math.max(speed, 45) / 3.6;
    const dt = ds / speedMs;
    currTime += dt;

    rawData.push({
      Time: Number(currTime.toFixed(3)),
      Distance: Number(dist.toFixed(1)),
      Speed: Number(speed.toFixed(1)),
      Throttle: throttle,
      Brake: brake,
      nGear,
      RPM: rpm,
      DRS: drs,
      X: p.x,
      Y: p.y,
      Z: p.z,
    });
  }

  // ── Apply Telemetry Compression / Decimation for Race data ──
  // In Quali: 100% uncompressed raw 50Hz stream
  // In Race: Compressed 10Hz telemetry log (3.5x downsampled with smooth moving window)
  let telemetryData: any[];
  if (isQuali) {
    telemetryData = rawData;
  } else {
    // Stride decimation to compress data points while retaining start/end and apex extremes
    telemetryData = rawData.filter((_, i) => i === 0 || i === rawData.length - 1 || i % 3 === 0);
  }

  const lapTime = Number((currTime + profile.lapTimeBase + lapModifier).toFixed(3));
  const compound = isQuali ? "SOFT" : targetLap > 35 ? "HARD" : targetLap > 18 ? "MEDIUM" : "SOFT";

  return {
    year,
    event: circ.circuit,
    session: isQuali ? "Qualifying" : "Race",
    driver: targetDriver,
    lap: targetLap,
    lap_time: lapTime,
    compound,
    tyre_life: isQuali ? (targetLap % 3) + 1 : (targetLap % 25) + 1,
    isCompressed: !isQuali,
    samplingMode: isQuali ? "RAW_QUALIFYING_SENSITIVE" : "COMPRESSED_RACE_STINT",
    samplingHz: isQuali ? 50 : 10,
    compressionRatio: isQuali ? "1.0x (Raw Uncompressed 50Hz Stream)" : "3.5x (Lossy Downsampled Stint Log)",
    telemetry: {
      points: telemetryData.length,
      data: telemetryData,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get best lap per driver from session laps */
export function bestLapPerDriver(
  laps: SessionLap[]
): Map<string, SessionLap> {
  const best = new Map<string, SessionLap>();
  for (const lap of laps) {
    if (!lap.LapTime || lap.Deleted) continue;
    const prev = best.get(lap.Driver);
    if (!prev || lap.LapTime < prev.LapTime!) {
      best.set(lap.Driver, lap);
    }
  }
  return best;
}

/** All laps for a specific driver */
export function lapsForDriver(laps: SessionLap[], driver: string): SessionLap[] {
  return laps
    .filter((l) => l.Driver === driver && !l.Deleted && l.LapTime != null)
    .sort((a, b) => a.LapNumber - b.LapNumber);
}

/** Format seconds as M:SS.mmm */
export function formatLapTime(s: number | null | undefined): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `${m}:${sec}`;
}

/** Format sector time */
export function formatSector(s: number | null | undefined): string {
  if (!s) return "—";
  return s.toFixed(3);
}

/** Map event name to circuit slug used in telemetry/circuit paths */
export function eventToCircuitSlug(event: string): string {
  if (!event) return "monaco";
  const ev = event.toLowerCase();
  if (ev.includes("monaco")) return "monaco";
  if (ev.includes("bahrain")) return "bahrain";
  if (ev.includes("saudi") || ev.includes("jeddah")) return "jeddah";
  if (ev.includes("australi") || ev.includes("melbourne")) return "melbourne";
  if (ev.includes("japan") || ev.includes("suzuka")) return "suzuka";
  if (ev.includes("chin") || ev.includes("shanghai")) return "shanghai";
  if (ev.includes("miami")) return "miami";
  if (ev.includes("emilia") || ev.includes("imola") || ev.includes("romagna")) return "imola";
  if (ev.includes("spain") || ev.includes("spanish") || ev.includes("barcelona") || ev.includes("españa")) return "barcelona";
  if (ev.includes("canad") || ev.includes("montreal")) return "montreal";
  if (ev.includes("austria") || ev.includes("spielberg") || ev.includes("red_bull") || ev.includes("österreich")) return "red_bull_ring";
  if (ev.includes("brit") || ev.includes("silverstone")) return "silverstone";
  if (ev.includes("hungar") || ev.includes("budapest")) return "hungaroring";
  if (ev.includes("belgi") || ev.includes("spa")) return "spa";
  if (ev.includes("dutch") || ev.includes("zandvoort") || ev.includes("netherland")) return "zandvoort";
  if (ev.includes("ital") || ev.includes("monza")) return "monza";
  if (ev.includes("azerbaijan") || ev.includes("baku")) return "baku";
  if (ev.includes("singapore") || ev.includes("marina bay")) return "singapore";
  if (ev.includes("united states") || ev.includes("austin") || ev.includes("cota") || ev.includes("america")) return "austin";
  if (ev.includes("mexico") || ev.includes("méxico") || ev.includes("rodriguez")) return "mexico_city";
  if (ev.includes("brazil") || ev.includes("paulo") || ev.includes("interlagos")) return "interlagos";
  if (ev.includes("vegas")) return "las_vegas";
  if (ev.includes("qatar") || ev.includes("lusail")) return "lusail";
  if (ev.includes("abu dhabi") || ev.includes("yas marina")) return "yas_marina";

  const map: Record<string, string> = {
    "Australian Grand Prix": "melbourne",
    "Chinese Grand Prix": "shanghai",
    "Japanese Grand Prix": "suzuka",
    "Bahrain Grand Prix": "bahrain",
    "Saudi Arabian Grand Prix": "jeddah",
    "Miami Grand Prix": "miami",
    "Emilia Romagna Grand Prix": "imola",
    "Monaco Grand Prix": "monaco",
    "Spanish Grand Prix": "barcelona",
    "Canadian Grand Prix": "montreal",
    "Austrian Grand Prix": "red_bull_ring",
    "British Grand Prix": "silverstone",
    "Belgian Grand Prix": "spa",
    "Hungarian Grand Prix": "hungaroring",
    "Dutch Grand Prix": "zandvoort",
    "Italian Grand Prix": "monza",
    "Azerbaijan Grand Prix": "baku",
    "Singapore Grand Prix": "singapore",
    "United States Grand Prix": "austin",
    "Mexico City Grand Prix": "mexico_city",
    "São Paulo Grand Prix": "interlagos",
    "Sao Paulo Grand Prix": "interlagos",
    "Las Vegas Grand Prix": "las_vegas",
    "Qatar Grand Prix": "lusail",
    "Abu Dhabi Grand Prix": "yas_marina",
  };
  return map[event] ?? eventToSlug(event);
}
