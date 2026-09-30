import { useMemo } from "react";
import type { WeatherPoint } from "../types";
import { SESSION_NAME } from "../types";

interface Props {
  weather: WeatherPoint[];
  year?: number;
  event?: string;
  sessionCode?: string;
}

const W = 800;
const H = 180;
const PAD_L = 48;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 32;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

function line(points: [number, number][]) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export default function WeatherPanel({ weather, year = 2025, event = "Monaco Grand Prix", sessionCode = "R" }: Props) {
  const isPreDigitalEra = year < 1994;

  const eraTag = year >= 2010
    ? "LIVE FIA DIGITAL WEATHER SENSORS · 1Hz ACCURACY"
    : year >= 1994
    ? "FIA ARCHIVAL WEATHER LOGS · METEOROLOGICAL STATIONS"
    : "HISTORICAL METEOROLOGICAL RECONSTRUCTION · RACE REPORTS";

  if (!weather || weather.length === 0) {
    return (
      <div className="panel" style={{ marginTop: 12, padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🌡️</span>
          <div>
            <h2 style={{ fontSize: 18, color: "#ffffff", margin: 0 }}>WEATHER DATA UNAVAILABLE</h2>
            <span style={{ color: "#888892", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
              {year} · {event} · {SESSION_NAME[sessionCode] ?? sessionCode}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(225, 6, 0, 0.05)",
            border: "1px solid rgba(225, 6, 0, 0.2)",
            borderRadius: 6,
            padding: "16px 20px",
            color: "#dedee8",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: "#ff6b6b", fontWeight: 700, marginBottom: 6 }}>
            {isPreDigitalEra ? "PRE-TELEMETRY ERA RECORD" : "ARCHIVAL SENSOR GAP"}
          </div>
          <p style={{ margin: 0, color: "#b0b0be" }}>
            {isPreDigitalEra
              ? `Electronic trackside weather stations, continuous ambient/track thermistors, and digital barometric loggers were introduced into Formula 1 timing during the 1990s. Continuous time-series weather telemetry was not digitally captured for the ${year} season.`
              : `Continuous sensor streams for this specific historical session (${year} ${event}) are not available in the digital telemetry repository.`}
          </p>
        </div>
      </div>
    );
  }

  const maxTime = weather[weather.length - 1]?.Time ?? 1;
  const toX = (t: number) => PAD_L + (t / maxTime) * PW;

  const minTrack = Math.min(...weather.map((w) => w.TrackTemp));
  const maxTrack = Math.max(...weather.map((w) => w.TrackTemp));
  const minAir = Math.min(...weather.map((w) => w.AirTemp));
  const maxAir = Math.max(...weather.map((w) => w.AirTemp));

  const minTemp = Math.floor(Math.min(minTrack, minAir) - 2);
  const maxTemp = Math.ceil(Math.max(maxTrack, maxAir) + 2);
  const tempRange = maxTemp - minTemp || 1;

  const trackTemps = useMemo(() => {
    return weather.map((w): [number, number] => [
      toX(w.Time),
      PAD_T + PH - ((w.TrackTemp - minTemp) / tempRange) * PH,
    ]);
  }, [weather, minTemp, tempRange, maxTime]);

  const airTemps = useMemo(() => {
    return weather.map((w): [number, number] => [
      toX(w.Time),
      PAD_T + PH - ((w.AirTemp - minTemp) / tempRange) * PH,
    ]);
  }, [weather, minTemp, tempRange, maxTime]);

  // Rain intervals
  const rainSegments: { x1: number; x2: number }[] = [];
  let rStart: number | null = null;
  for (const w of weather) {
    if (w.Rainfall && rStart === null) rStart = w.Time;
    else if (!w.Rainfall && rStart !== null) {
      rainSegments.push({ x1: toX(rStart), x2: toX(w.Time) });
      rStart = null;
    }
  }
  if (rStart !== null) rainSegments.push({ x1: toX(rStart), x2: toX(maxTime) });

  const hasRain = weather.some((w) => w.Rainfall);
  const avgWind = (weather.reduce((a, w) => a + w.WindSpeed, 0) / weather.length).toFixed(1);
  const avgHumidity = (weather.reduce((a, w) => a + w.Humidity, 0) / weather.length).toFixed(0);
  const avgPressure = (weather.reduce((a, w) => a + w.Pressure, 0) / weather.length).toFixed(1);
  const windDir = weather[0]?.WindDirection ?? 180;

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-title" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2>WEATHER & TRACK CONDITIONS</h2>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid #333",
                borderRadius: 3,
                color: "#00E5FF",
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
              }}
            >
              {eraTag}
            </span>
          </div>
          <span style={{ color: "#a0a0ab", fontSize: 10 }}>
            {year} · {event} · {SESSION_NAME[sessionCode] ?? sessionCode}
          </span>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            ["TRACK TEMP", `${minTrack.toFixed(1)}–${maxTrack.toFixed(1)} °C`, "#e10600"],
            ["AIR TEMP", `${minAir.toFixed(1)}–${maxAir.toFixed(1)} °C`, "#3b82f6"],
            ["WIND", `${avgWind} m/s (${windDir}°)`, "#ffffff"],
            ["HUMIDITY", `${avgHumidity}%`, "#ffffff"],
            ["PRESSURE", `${avgPressure} hPa`, "#ffffff"],
            ["RAIN", hasRain ? "WET (RAIN DETECTED)" : "DRY", hasRain ? "#3b82f6" : "#34d399"],
          ].map(([label, val, col]) => (
            <div key={label}>
              <div
                style={{
                  color: "#888892",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  marginBottom: 3,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  color: col,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block" }}
        >
          <defs>
            <clipPath id="weatherClip">
              <rect x={PAD_L} y={PAD_T} width={PW} height={PH} />
            </clipPath>
          </defs>

          {/* Rain bands */}
          {rainSegments.map((seg, i) => (
            <rect
              key={i}
              x={seg.x1}
              y={PAD_T}
              width={Math.max(4, seg.x2 - seg.x1)}
              height={PH}
              fill="rgba(59,130,246,0.18)"
              clipPath="url(#weatherClip)"
            />
          ))}

          {/* Grid lines & Y-axis labels */}
          {[minTemp, Math.round((minTemp + maxTemp) / 2), maxTemp].map((tVal) => {
            const y = PAD_T + PH - ((tVal - minTemp) / tempRange) * PH;
            return (
              <g key={tVal}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + PW}
                  y2={y}
                  stroke="#22222a"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 8}
                  y={y + 3}
                  fill="#888898"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={9}
                  textAnchor="end"
                >
                  {tVal}°C
                </text>
              </g>
            );
          })}

          {/* Track temp line */}
          <polyline
            points={line(trackTemps)}
            fill="none"
            stroke="#e10600"
            strokeWidth={2.2}
            clipPath="url(#weatherClip)"
          />

          {/* Air temp line */}
          <polyline
            points={line(airTemps)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.2}
            strokeDasharray="5 3"
            clipPath="url(#weatherClip)"
          />

          {/* Axes */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + PH}
            stroke="#33333e"
            strokeWidth={1.5}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + PH}
            x2={PAD_L + PW}
            y2={PAD_T + PH}
            stroke="#33333e"
            strokeWidth={1.5}
          />

          {/* X Axis Time Marks */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const x = PAD_L + frac * PW;
            const mins = Math.round((frac * maxTime) / 60);
            return (
              <g key={frac}>
                <line x1={x} y1={PAD_T + PH} x2={x} y2={PAD_T + PH + 4} stroke="#444450" />
                <text
                  x={x}
                  y={PAD_T + PH + 16}
                  fill="#888898"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={8}
                  textAnchor="middle"
                >
                  T+{mins}m
                </text>
              </g>
            );
          })}

          {/* Axis title */}
          <text
            x={PAD_L + PW}
            y={PAD_T + PH + 26}
            fill="#777785"
            fontFamily="IBM Plex Mono, monospace"
            fontSize={8}
            textAnchor="end"
          >
            SESSION PROGRESS →
          </text>
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #1a1a22",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 9,
            color: "#dedee8",
          }}
        >
          <div style={{ display: "flex", gap: 20 }}>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  background: "#e10600",
                  verticalAlign: "middle",
                  marginRight: 6,
                  borderRadius: 1,
                }}
              />
              TRACK TEMPERATURE (°C)
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  background: "#3b82f6",
                  verticalAlign: "middle",
                  marginRight: 6,
                  borderRadius: 1,
                }}
              />
              AIR TEMPERATURE (°C)
            </span>
            {hasRain && (
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: "rgba(59,130,246,0.35)",
                    verticalAlign: "middle",
                    marginRight: 6,
                    border: "1px solid #3b82f6",
                    borderRadius: 2,
                  }}
                />
                RAIN PERIOD
              </span>
            )}
          </div>

          <div style={{ color: "#888898", fontSize: 8 }}>
            DATA SAMPLING: 60 POINTS / 2 HOURS
          </div>
        </div>
      </div>
    </div>
  );
}
