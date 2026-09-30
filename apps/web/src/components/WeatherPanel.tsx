import { useMemo, useState } from "react";
import type { WeatherPoint } from "../types";
import { SESSION_NAME } from "../types";
import { generateFallbackWeather } from "../data/loader";

interface Props {
  weather: WeatherPoint[];
  year?: number;
  event?: string;
  sessionCode?: string;
}

const W = 960;
const H = 220;
const PAD_L = 55;
const PAD_R = 30;
const PAD_T = 25;
const PAD_B = 38;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

function line(points: [number, number][]) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export default function WeatherPanel({
  weather,
  year = 2025,
  event = "Monaco Grand Prix",
  sessionCode = "R",
}: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const eraTag =
    year >= 2010
      ? "LIVE FIA DIGITAL WEATHER TELEMETRY · 1Hz SENSORS"
      : year >= 1994
      ? "FIA ARCHIVAL WEATHER LOGS · METEOROLOGICAL STATIONS"
      : "HISTORICAL METEOROLOGICAL RECONSTRUCTION · RACE REPORTS";

  // Normalize weather data to prevent any NaN / undefined / string quirks
  const cleanWeather = useMemo(() => {
    const rawList = weather && weather.length > 0 ? weather : generateFallbackWeather(year, event, sessionCode);
    return rawList.map((w, i) => {
      const rawTime = typeof w.Time === "number" ? w.Time : parseFloat(String(w.Time)) || i * 120;
      const air = typeof w.AirTemp === "number" ? w.AirTemp : parseFloat(String(w.AirTemp)) || 22.0;
      const track = typeof w.TrackTemp === "number" ? w.TrackTemp : parseFloat(String(w.TrackTemp)) || 32.0;
      const hum = typeof w.Humidity === "number" ? w.Humidity : parseFloat(String(w.Humidity)) || 55;
      const pres = typeof w.Pressure === "number" ? w.Pressure : parseFloat(String(w.Pressure)) || 1013.2;
      const windSpd = typeof w.WindSpeed === "number" ? w.WindSpeed : parseFloat(String(w.WindSpeed)) || 2.5;
      const windDir = typeof w.WindDirection === "number" ? w.WindDirection : parseFloat(String(w.WindDirection)) || 180;
      const rain = Boolean(w.Rainfall);

      return {
        Time: rawTime,
        AirTemp: air,
        TrackTemp: track,
        Humidity: hum,
        Pressure: pres,
        Rainfall: rain,
        WindSpeed: windSpd,
        WindDirection: windDir,
      };
    });
  }, [weather]);

  const n = cleanWeather.length;
  const isFlatTimeline =
    n > 1 && cleanWeather[0].Time === cleanWeather[n - 1].Time;

  const minRawTime = cleanWeather[0]?.Time ?? 0;
  const maxRawTime = cleanWeather[n - 1]?.Time ?? 7200;
  const totalDuration = isFlatTimeline || maxRawTime <= minRawTime ? Math.max(1, (n - 1) * 120) : maxRawTime - minRawTime;

  const toX = (time: number, idx: number) => {
    if (n <= 1) return PAD_L + PW / 2;
    if (isFlatTimeline) {
      return PAD_L + (idx / (n - 1)) * PW;
    }
    const frac = Math.max(0, Math.min(1, (time - minRawTime) / totalDuration));
    return PAD_L + frac * PW;
  };

  const minTrack = cleanWeather.length ? Math.min(...cleanWeather.map((w) => w.TrackTemp)) : 25;
  const maxTrack = cleanWeather.length ? Math.max(...cleanWeather.map((w) => w.TrackTemp)) : 35;
  const minAir = cleanWeather.length ? Math.min(...cleanWeather.map((w) => w.AirTemp)) : 20;
  const maxAir = cleanWeather.length ? Math.max(...cleanWeather.map((w) => w.AirTemp)) : 28;

  let minTemp = Math.floor(Math.min(minTrack, minAir) - 2);
  let maxTemp = Math.ceil(Math.max(maxTrack, maxAir) + 2);
  if (maxTemp <= minTemp) {
    minTemp = 18;
    maxTemp = 45;
  }
  const tempRange = maxTemp - minTemp || 1;

  const trackTemps = useMemo(() => {
    return cleanWeather.map((w, idx): [number, number] => [
      toX(w.Time, idx),
      PAD_T + PH - ((w.TrackTemp - minTemp) / tempRange) * PH,
    ]);
  }, [cleanWeather, minTemp, tempRange, totalDuration, isFlatTimeline]);

  const airTemps = useMemo(() => {
    return cleanWeather.map((w, idx): [number, number] => [
      toX(w.Time, idx),
      PAD_T + PH - ((w.AirTemp - minTemp) / tempRange) * PH,
    ]);
  }, [cleanWeather, minTemp, tempRange, totalDuration, isFlatTimeline]);

  // Rain intervals
  const rainSegments = useMemo(() => {
    const segs: { x1: number; x2: number }[] = [];
    let rStart: number | null = null;
    let rStartIdx = 0;

    cleanWeather.forEach((w, i) => {
      if (w.Rainfall && rStart === null) {
        rStart = w.Time;
        rStartIdx = i;
      } else if (!w.Rainfall && rStart !== null) {
        segs.push({ x1: toX(rStart, rStartIdx), x2: toX(w.Time, i) });
        rStart = null;
      }
    });
    if (rStart !== null && cleanWeather.length > 0) {
      segs.push({ x1: toX(rStart, rStartIdx), x2: toX(cleanWeather[cleanWeather.length - 1].Time, cleanWeather.length - 1) });
    }
    return segs;
  }, [cleanWeather, totalDuration, isFlatTimeline]);

  const hasRain = cleanWeather.some((w) => w.Rainfall);
  const avgWind = cleanWeather.length
    ? (cleanWeather.reduce((a, w) => a + w.WindSpeed, 0) / cleanWeather.length).toFixed(1)
    : "2.4";
  const avgHumidity = cleanWeather.length
    ? (cleanWeather.reduce((a, w) => a + w.Humidity, 0) / cleanWeather.length).toFixed(0)
    : "55";
  const avgPressure = cleanWeather.length
    ? (cleanWeather.reduce((a, w) => a + w.Pressure, 0) / cleanWeather.length).toFixed(1)
    : "1014.2";
  const windDir = cleanWeather[0]?.WindDirection ?? 180;

  // Selected point data for interactive readout
  const activePt = hoverIndex !== null && cleanWeather[hoverIndex] ? cleanWeather[hoverIndex] : cleanWeather[cleanWeather.length - 1] || null;

  // Aerodynamic calculations: Air density rho = (P * 100) / (287.058 * (T + 273.15))
  const airDensity = useMemo(() => {
    if (!activePt) return "1.184";
    const pPa = activePt.Pressure * 100;
    const tK = activePt.AirTemp + 273.15;
    const rho = pPa / (287.058 * tK);
    return rho.toFixed(3);
  }, [activePt]);

  // Track Grip State
  const trackCondition = hasRain
    ? "WET / SLIPPERY · INTERMEDIATE/WET CONDITIONS"
    : maxTrack > 45
    ? "VERY HIGH TRACK TEMP · ACCELERATED DEGRADATION"
    : maxTrack > 35
    ? "OPTIMAL GRIP WINDOW · MEDIUM-HIGH ABRASION"
    : "GREEN / COOL SURFACE · LOW INITIAL ADHESION";

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      {/* ── Top Header ── */}
      <div className="panel-title" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2>WEATHER & TRACK CONDITIONS</h2>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                borderRadius: 3,
                color: "#00E5FF",
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 700,
              }}
            >
              {eraTag}
            </span>
          </div>
          <span style={{ color: "#a0a0ab", fontSize: 10 }}>
            {year} · {event} · {SESSION_NAME[sessionCode] ?? sessionCode}
          </span>
        </div>

        {/* Live / Summary Metrics */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[
            ["TRACK TEMP", `${minTrack.toFixed(1)}–${maxTrack.toFixed(1)} °C`, "#e10600"],
            ["AIR TEMP", `${minAir.toFixed(1)}–${maxAir.toFixed(1)} °C`, "#3b82f6"],
            ["WIND", `${avgWind} m/s (${windDir}°)`, "#ffffff"],
            ["HUMIDITY", `${avgHumidity}%`, "#ffffff"],
            ["PRESSURE", `${avgPressure} hPa`, "#ffffff"],
            ["AIR DENSITY", `${airDensity} kg/m³`, "#00E5FF"],
            ["TRACK STATUS", hasRain ? "WET" : "DRY", hasRain ? "#3b82f6" : "#34d399"],
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

      {/* ── Status Banner ── */}
      <div
        style={{
          margin: "12px 20px 0",
          padding: "8px 14px",
          background: hasRain ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.02)",
          border: `1px solid ${hasRain ? "rgba(59, 130, 246, 0.3)" : "#22222a"}`,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 10,
          fontFamily: "IBM Plex Mono, monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasRain ? "#3b82f6" : "#34d399", display: "inline-block" }} />
          <span style={{ color: "#ffffff", fontWeight: 700 }}>SURFACE PROFILE:</span>
          <span style={{ color: hasRain ? "#93c5fd" : "#dedee8" }}>{trackCondition}</span>
        </div>
        {activePt && (
          <div style={{ color: "#00E5FF", fontWeight: 700 }}>
            CURSOR AT T+{Math.round((activePt.Time - minRawTime) / 60)}m · TRACK: {activePt.TrackTemp.toFixed(1)}°C · AIR: {activePt.AirTemp.toFixed(1)}°C · WIND: {activePt.WindSpeed}m/s
          </div>
        )}
      </div>

      {/* ── SVG Timeline Chart ── */}
      <div style={{ padding: "16px 20px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block", cursor: "crosshair" }}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * W;
            if (svgX >= PAD_L && svgX <= PAD_L + PW && cleanWeather.length > 0) {
              const frac = (svgX - PAD_L) / PW;
              const idx = Math.max(0, Math.min(cleanWeather.length - 1, Math.round(frac * (cleanWeather.length - 1))));
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <clipPath id="weatherClip">
              <rect x={PAD_L} y={PAD_T} width={PW} height={PH} />
            </clipPath>
          </defs>

          {/* Background Grid */}
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
                  fill="#ffffff"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={9}
                  textAnchor="end"
                >
                  {tVal}°C
                </text>
              </g>
            );
          })}

          {/* Rain bands */}
          {rainSegments.map((seg, i) => (
            <rect
              key={i}
              x={seg.x1}
              y={PAD_T}
              width={Math.max(6, seg.x2 - seg.x1)}
              height={PH}
              fill="rgba(59,130,246,0.22)"
              clipPath="url(#weatherClip)"
            />
          ))}

          {/* Track Temp Polyline */}
          <polyline
            points={line(trackTemps)}
            fill="none"
            stroke="#e10600"
            strokeWidth={2.4}
            clipPath="url(#weatherClip)"
          />

          {/* Air Temp Polyline */}
          <polyline
            points={line(airTemps)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.2}
            strokeDasharray="5 3"
            clipPath="url(#weatherClip)"
          />

          {/* Interactive Hover Cursor */}
          {hoverIndex !== null && cleanWeather[hoverIndex] && (
            <g clipPath="url(#weatherClip)">
              <line
                x1={toX(cleanWeather[hoverIndex].Time, hoverIndex)}
                y1={PAD_T}
                x2={toX(cleanWeather[hoverIndex].Time, hoverIndex)}
                y2={PAD_T + PH}
                stroke="#00E5FF"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
              <circle
                cx={toX(cleanWeather[hoverIndex].Time, hoverIndex)}
                cy={PAD_T + PH - ((cleanWeather[hoverIndex].TrackTemp - minTemp) / tempRange) * PH}
                r={4}
                fill="#e10600"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <circle
                cx={toX(cleanWeather[hoverIndex].Time, hoverIndex)}
                cy={PAD_T + PH - ((cleanWeather[hoverIndex].AirTemp - minTemp) / tempRange) * PH}
                r={4}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          )}

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
            const mins = Math.round((frac * totalDuration) / 60);
            return (
              <g key={frac}>
                <line x1={x} y1={PAD_T + PH} x2={x} y2={PAD_T + PH + 4} stroke="#555566" />
                <text
                  x={x}
                  y={PAD_T + PH + 16}
                  fill="#ffffff"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={8}
                  textAnchor="middle"
                >
                  T+{mins}m
                </text>
              </g>
            );
          })}

          {/* Axis Title */}
          <text
            x={PAD_L + PW}
            y={PAD_T + PH + 26}
            fill="#ffffff"
            fontFamily="IBM Plex Mono, monospace"
            fontSize={8}
            textAnchor="end"
          >
            SESSION TIMELINE (0–{Math.round(totalDuration / 60)} MINS) →
          </text>
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            paddingTop: 10,
            borderTop: "1px solid #1a1a22",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 9,
            color: "#ffffff",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  background: "#e10600",
                  marginRight: 6,
                  borderRadius: 1,
                }}
              />
              TRACK TEMPERATURE (°C)
            </span>
            <span style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  background: "#3b82f6",
                  marginRight: 6,
                  borderRadius: 1,
                }}
              />
              AIR TEMPERATURE (°C)
            </span>
            {hasRain && (
              <span style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: "rgba(59,130,246,0.35)",
                    marginRight: 6,
                    border: "1px solid #3b82f6",
                    borderRadius: 2,
                  }}
                />
                RAIN PERIOD
              </span>
            )}
          </div>

          <div style={{ color: "#ffffff", fontSize: 8 }}>
            DATA SAMPLING: {cleanWeather.length} POINTS · HOVER FOR TELEMETRY READOUT
          </div>
        </div>
      </div>
    </div>
  );
}
