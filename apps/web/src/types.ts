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
    .replace(/[^a-z0-9_]/g, "");
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
  Haas: "#B6BABD",
  "Kick Sauber": "#52E252",
};

export const TYRE_COLOURS: Record<string, string> = {
  SOFT: "#e10600",
  MEDIUM: "#f5c518",
  HARD: "#e8e8e8",
  INTER: "#34d399",
  WET: "#3b82f6",
  UNKNOWN: "#666",
};

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

