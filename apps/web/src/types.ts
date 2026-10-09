// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarSession {
  name: string;
  code: string; // FP1 | FP2 | FP3 | Q | R | SQ | S
}

export interface CalendarRace {
  round: number;
  event: string;
  country: string;
  location: string;
  official_name: string;
  date: string;
  format: "conventional" | "sprint_qualifying";
  sessions: CalendarSession[];
}

export type Calendar = CalendarRace[];

/** Actual shape on disk: { year, race_count, events: CalendarRace[] } */
export interface CalendarFile {
  year: number;
  race_count: number;
  events: CalendarRace[];
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SessionDriver {
  driver_number: string;
  abbreviation: string;
  full_name: string;
  team: string;
  position: number | null;
  points: number | null;
}

export interface SessionLap {
  Time: number;
  Driver: string;
  DriverNumber: string;
  LapTime: number | null;
  LapNumber: number;
  Stint: number;
  PitOutTime: number | null;
  PitInTime: number | null;
  Sector1Time: number | null;
  Sector2Time: number | null;
  Sector3Time: number | null;
  SpeedI1: number | null;
  SpeedI2: number | null;
  SpeedFL: number | null;
  SpeedST: number | null;
  IsPersonalBest: boolean;
  Compound: string;
  TyreLife: number;
  FreshTyre: boolean;
  Team: string;
  Position: number | null;
  Deleted: boolean;
  TrackStatus: string;
}

export interface RaceControlMessage {
  Time: string;
  Category: string;
  Message: string;
  Status: string | null;
  Flag: string | null;
  Scope: string | null;
  Sector: number | null;
  RacingNumber: string | null;
  Lap: number | null;
}

export interface WeatherPoint {
  Time: number;
  AirTemp: number;
  Humidity: number;
  Pressure: number;
  Rainfall: boolean;
  TrackTemp: number;
  WindDirection: number;
  WindSpeed: number;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryPoint {
  Time: number;
  Distance: number;
  Speed: number;
  Throttle: number;
  Brake: boolean;
  nGear: number;
  RPM: number;
  DRS: number;
  X: number;
  Y: number;
  Z: number;
}

export interface LapTelemetry {
  year: number;
  event: string;
  session: string;
  driver: string;
  lap: number;
  lap_time: number;
  compound: string;
  tyre_life: number;
  isCompressed?: boolean;
  samplingMode?: "RAW_QUALIFYING_SENSITIVE" | "COMPRESSED_RACE_STINT" | "HISTORICAL_COMPRESSED_QUALI";
  samplingHz?: number;
  compressionRatio?: string;
  telemetry: {
    points: number;
    data: TelemetryPoint[];
  };
}

// ─── Circuit ──────────────────────────────────────────────────────────────────

export interface TrackPoint {
  distance: number;
  x: number;
  y: number;
  z: number;
}

export interface Turn {
  number: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  telemetry_x: number;
  telemetry_y: number;
  telemetry_z: number;
  speed: number;
  spatial_error: number;
}

export interface CircuitData {
  year: number;
  circuit: string;
  length_m: number;
  point_count: number;
  track: TrackPoint[];
  turn_count: number;
  turns: Turn[];
  source: {
    geometry: string;
    corners: string;
    telemetry_driver: string;
    telemetry_lap: number;
  };
}

// ─── Selection state ──────────────────────────────────────────────────────────

export interface Selection {
  year: number;
  race: CalendarRace | null;
  sessionCode: string;
  driver: string;
  lap: number;
}

// ─── Data availability ───────────────────────────────────────────────────────

/** Circuits with full telemetry available */
export const TELEMETRY_CIRCUITS = new Set([
  "melbourne",
  "shanghai",
  "suzuka",
  "bahrain",
  "jeddah",
  "miami",
  "imola",
  "monaco",
  "barcelona",
  "montreal",
  "red_bull_ring",
  "silverstone",
  "spa",
  "hungaroring",
  "zandvoort",
  "monza",
  "baku",
  "singapore",
  "austin",
  "mexico_city",
  "interlagos",
  "las_vegas",
  "lusail",
  "yas_marina",
]);

/** Map calendar event name → folder slug */
export function eventToSlug(event: string): string {
  return event
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "");
}

/** Session code → file prefix */
export const SESSION_FILE: Record<string, string> = {
  FP1: "fp1",
  FP2: "fp2",
  FP3: "fp3",
  Q: "q",
  SQ: "sq",
  S: "s",
  R: "r",
};

/** Session code → display name */
export const SESSION_NAME: Record<string, string> = {
  FP1: "Practice 1",
  FP2: "Practice 2",
  FP3: "Practice 3",
  Q: "Qualifying",
  SQ: "Sprint Qualifying",
  S: "Sprint",
  R: "Race",
};

/** Team → colour */
export const TEAM_COLOURS: Record<string, string> = {
  McLaren: "#FF8000",
  Ferrari: "#E8002D",
  "Red Bull Racing": "#3671C6",
  Mercedes: "#27F4D2",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  AlphaTauri: "#5E8FAA",
  "Toro Rosso": "#469BFF",
  Haas: "#B6BABD",
  "Kick Sauber": "#52E252",
  "Alfa Romeo": "#900000",
  Sauber: "#006EFF",
  "Racing Point": "#F596C8",
  "Force India": "#FF8000",
  Renault: "#FFF500",
  Lotus: "#E5C158",
  Brawn: "#B8FD02",
  Toyota: "#EE0000",
  BMW: "#002B49",
  BAR: "#FFFFFF",
  Jordan: "#FFD700",
  Benetton: "#00A859",
  Tyrrell: "#0047AB",
  Brabham: "#1E3F66",
  March: "#00A3E0",
  Penske: "#D4AF37",
  Surtees: "#004225",
  Shadow: "#1A1A1A",
  Hesketh: "#E5E5E5",
  "Alfa Romeo SpA": "#C00000",
  Talbot: "#0055A5",
  Maserati: "#0C2340",
  Cooper: "#004225",
  Vanwall: "#1B4D3E",
  BRM: "#004225",
};

export const TYRE_COLOURS: Record<string, string> = {
  // Modern era (2019+)
  SOFT: "#e10600",
  MEDIUM: "#ffd12e",
  HARD: "#ffffff",
  // Historical Compounds (pre-2019 era)
  HYPERSOFT: "#ff87b4",
  ULTRASOFT: "#b138dd",
  SUPERSOFT: "#e10600",
  SUPERHARD: "#ea580c",
  QUALIFYING: "#ec4899",
  STANDARD: "#cbd5e1",
  // Wet weather
  INTER: "#2e9668",
  INTERMEDIATE: "#2e9668",
  WET: "#336fae",
  UNKNOWN: "#666666",
};

export const TYRE_SHORT: Record<string, string> = {
  HYPERSOFT: "HS",
  ULTRASOFT: "US",
  SUPERSOFT: "SS",
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  SUPERHARD: "SH",
  QUALIFYING: "Q",
  STANDARD: "STD",
  INTER: "I",
  INTERMEDIATE: "I",
  WET: "W",
};

/**
 * Returns period-accurate colour for any tyre compound based on season year.
 * Before 2019:
 *  - SOFT was Yellow (#ffd12e)
 *  - MEDIUM was White (#f0f0f0)
 *  - HARD was Orange (#ff8000) (2013-2017), Silver/Grey (#c0c0c0 in 2011-2012, #94a3b8 pre-2011), Ice Blue (#00bfff in 2018)
 *  - ULTRASOFT was Purple (#b138dd)
 *  - SUPERSOFT was Red (#e10600)
 *  - HYPERSOFT was Pink (#ff87b4)
 *  - SUPERHARD was Orange (#ea580c)
 *  - QUALIFYING was Magenta (#ec4899)
 *  - STANDARD was Light Slate (#cbd5e1)
 * From 2019+:
 *  - SOFT is Red (#e10600)
 *  - MEDIUM is Yellow (#ffd12e)
 *  - HARD is White (#ffffff)
 */
export function getTyreColour(compound?: string | null, year?: number): string {
  if (!compound) return "#666666";
  const norm = compound.trim().toUpperCase().replace(/\s+/g, "");

  if (norm === "INTER" || norm === "INTERMEDIATE") return "#2e9668";
  if (norm === "WET") return "#336fae";
  if (norm === "QUALIFYING") return "#ec4899";
  if (norm === "STANDARD") return "#cbd5e1";

  if (year && year < 2019) {
    switch (norm) {
      case "HYPERSOFT":
        return "#ff87b4";
      case "ULTRASOFT":
        return "#b138dd";
      case "SUPERSOFT":
        return "#e10600";
      case "SOFT":
        return "#ffd12e"; // Yellow in pre-2019
      case "MEDIUM":
        return "#f0f0f0"; // White in pre-2019
      case "HARD":
        return year === 2018
          ? "#00bfff" // Ice Blue in 2018
          : year >= 2013
          ? "#ff8000" // Orange in 2013-2017
          : year >= 2011
          ? "#c0c0c0" // Silver / Grey in 2011-2012
          : "#94a3b8"; // Slate / Grey in pre-2011
      case "SUPERHARD":
        return "#ea580c";
      default:
        break;
    }
  }

  return TYRE_COLOURS[norm] ?? "#888888";
}

/**
 * Returns high-contrast text color (dark vs light) for text inside tyre badges.
 */
export function getTyreTextColor(compound?: string | null, year?: number): string {
  const col = getTyreColour(compound, year).toLowerCase();
  if (
    col === "#ffd12e" ||
    col === "#f0f0f0" ||
    col === "#ffffff" ||
    col === "#00bfff" ||
    col === "#ff87b4" ||
    col === "#c0c0c0" ||
    col === "#cbd5e1" ||
    col === "#94a3b8"
  ) {
    return "#0f172a";
  }
  return "#ffffff";
}

/**
 * Returns concise 1-2 letter acronym for tyre compound (e.g. US, SS, S, M, H, HS, SH, I, W).
 */
export function getTyreShort(compound?: string | null): string {
  if (!compound) return "—";
  const norm = compound.trim().toUpperCase().replace(/\s+/g, "");
  return TYRE_SHORT[norm] ?? (norm.length <= 2 ? norm : norm.slice(0, 1));
}

export const FLAG_COLOURS: Record<string, string> = {
  GREEN: "#34d399",
  YELLOW: "#f5c518",
  RED: "#e10600",
  SC: "#f5c518",
  VSC: "#f5c518",
  CLEAR: "#34d399",
  CHEQUERED: "#ffffff",
  BLACK: "#111",
  BLUE: "#3b82f6",
};

// ─── Championship & Standings ──────────────────────────────────────────────────

export interface DriverStanding {
  position: number;
  driver: string;
  driverNumber: string;
  driverName: string;
  nationality: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  gapToLeader: number;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  gapToLeader: number;
  drivers: string[];
}

export interface HistoricalChampion {
  year: number;
  driver: string;
  nationality: string;
  team: string;
  engine: string;
  points: number;
  wins: number;
  poles: number;
}

export interface HistoricalEra {
  id: string;
  name: string;
  years: string;
  regulations: string;
  keyFeature: string;
  iconicCars: string[];
}

