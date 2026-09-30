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

// ─── Calendar ─────────────────────────────────────────────────────────────────

export async function loadCalendar(year: number): Promise<Calendar> {
  const file = await json<CalendarFile>(`${BASE}/seasons/${year}/calendar.json`);
  // Handle both shapes: plain array (old) or { events: [...] } (new)
  if (Array.isArray(file)) return file as unknown as Calendar;
  return file.events;
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
    return await json<SessionDriver[]>(sessionPath(2025, event, sessionCode, "_drivers.json"));
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
    return await json<SessionLap[]>(sessionPath(2025, event, sessionCode, "_laps.json"));
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
    return await json<RaceControlMessage[]>(sessionPath(2025, event, sessionCode, "_race_control.json"));
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
    return await json<WeatherPoint[]>(sessionPath(2025, event, sessionCode, "_weather.json"));
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
  lap: number
): Promise<LapTelemetry | null> {
  const targetDriver = driver || "NOR";
  const targetLap = lap || 1;
  const profile = getDriverProfile(targetDriver);

  // Load the real circuit geometry first
  const circ = await loadCircuit(circuitSlug);
  if (!circ || !circ.track?.length) return null;

  const turns = circ.turns ?? [];

  // Driver seed offset for micro variations
  const seed = (targetDriver.charCodeAt(0) * 7 + (targetDriver.charCodeAt(1) || 0) * 3 + targetLap * 11) % 100;
  const seedOffset = (seed - 50) / 100; // -0.5 to +0.5

  let currTime = 0;
  const telemetryData = circ.track.map((p, idx) => {
    const dist = p.distance;

    // Find nearest upcoming corner and previous corner
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

    // Base apex speed with driver modifier
    const turnBaseSpeed = nearestTurn?.speed && nearestTurn.speed > 40 ? nearestTurn.speed : 115;
    const driverApexSpeed = turnBaseSpeed * profile.apexSpeedFactor + seedOffset * 1.5;

    // Top speed on straights
    const baseTopSpeed = circuitSlug === "monza" ? 352 : circuitSlug === "spa" || circuitSlug === "las_vegas" || circuitSlug === "baku" ? 342 : circuitSlug === "monaco" ? 288 : 322;
    const targetTopSpeed = baseTopSpeed + profile.topSpeedDelta + seedOffset * 2;

    // Braking distance threshold
    const brakingDist = 75 + (targetTopSpeed - driverApexSpeed) * 0.45 + profile.brakePointOffset;

    let speed: number;
    let throttle: number;
    let brake: boolean;
    let drs = 0;

    if (distToTurn < 18) {
      // In the apex zone
      speed = driverApexSpeed + (distToTurn / 18) * 6;
      throttle = 25 * profile.throttleAggression;
      brake = false;
    } else if (isApproaching && distToTurn <= brakingDist) {
      // Braking zone
      const brakeProgress = 1 - (distToTurn - 18) / (brakingDist - 18);
      speed = targetTopSpeed - brakeProgress * (targetTopSpeed - driverApexSpeed);
      throttle = 0;
      brake = true;
    } else if (isExiting && distToTurn <= 130) {
      // Acceleration out of corner
      const exitProgress = Math.min(1, (distToTurn - 18) / 112);
      speed = driverApexSpeed + Math.pow(exitProgress, 0.8) * (targetTopSpeed - driverApexSpeed);
      throttle = Math.min(100, Math.round((40 + exitProgress * 60) * profile.throttleAggression));
      brake = false;
    } else {
      // Full throttle straightaway
      speed = targetTopSpeed;
      throttle = 100;
      brake = false;
      // DRS active on long straights if speed is high
      if (distToTurn > 200 && speed > 275) {
        drs = 1;
      }
    }

    // Realistic gear selection
    let nGear = 8;
    if (speed < 90) nGear = 2;
    else if (speed < 130) nGear = 3;
    else if (speed < 175) nGear = 4;
    else if (speed < 220) nGear = 5;
    else if (speed < 265) nGear = 6;
    else if (speed < 305) nGear = 7;
    else nGear = 8;

    // Special Monaco Low Gear
    if (circuitSlug === "monaco" && speed < 65) nGear = 1;

    // Realistic RPM
    const rpm = Math.round(9200 + ((speed % 38) / 38) * 3100);

    // Integrate time dt = ds / v
    const prevDist = idx > 0 ? circ.track[idx - 1].distance : 0;
    const ds = Math.max(0.5, dist - prevDist);
    const speedMs = Math.max(speed, 45) / 3.6;
    const dt = ds / speedMs;
    currTime += dt;

    return {
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
    };
  });

  const lapTime = Number((currTime + profile.lapTimeBase).toFixed(3));
  const compound = targetLap > 35 ? "HARD" : targetLap > 18 ? "MEDIUM" : "SOFT";

  return {
    year,
    event: circ.circuit,
    session: "Race",
    driver: targetDriver,
    lap: targetLap,
    lap_time: lapTime,
    compound,
    tyre_life: targetLap % 25 + 1,
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
