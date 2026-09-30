import { useMemo } from "react";
import type { WeatherPoint } from "../types";

interface Props {
  weather: WeatherPoint[];
}

const W = 800;
const H = 160;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

function line(points: [number, number][]) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export default function WeatherPanel({ weather }: Props) {
  const maxTime = weather[weather.length - 1]?.Time ?? 1;

  const toX = (t: number) => PAD_L + (t / maxTime) * PW;

  const trackTemps = useMemo(() => {
    const min = Math.min(...weather.map((w) => w.TrackTemp));
    const max = Math.max(...weather.map((w) => w.TrackTemp));
    const range = max - min || 1;
    return weather.map((w): [number, number] => [
      toX(w.Time),
      PAD_T + PH - ((w.TrackTemp - min) / range) * PH,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather]);

  const airTemps = useMemo(() => {
    const min = Math.min(...weather.map((w) => w.AirTemp));
    const max = Math.max(...weather.map((w) => w.AirTemp));
    const range = max - min || 1;
    return weather.map((w): [number, number] => [
      toX(w.Time),
      PAD_T + PH - ((w.AirTemp - min) / range) * PH,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather]);

  // Rain events
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

  const trackMin = Math.min(...weather.map((w) => w.TrackTemp)).toFixed(1);
  const trackMax = Math.max(...weather.map((w) => w.TrackTemp)).toFixed(1);
  const airMin = Math.min(...weather.map((w) => w.AirTemp)).toFixed(1);
  const airMax = Math.max(...weather.map((w) => w.AirTemp)).toFixed(1);
  const hasRain = weather.some((w) => w.Rainfall);

  const avgWind = (
    weather.reduce((a, w) => a + w.WindSpeed, 0) / weather.length
  ).toFixed(1);
  const avgHumidity = (
    weather.reduce((a, w) => a + w.Humidity, 0) / weather.length
  ).toFixed(0);

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-title">
        <div>
          <h2>WEATHER</h2>
          <span>TRACK TEMP / AIR TEMP OVER SESSION</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            ["TRACK TEMP", `${trackMin}–${trackMax} °C`],
            ["AIR TEMP", `${airMin}–${airMax} °C`],
            ["WIND", `${avgWind} m/s avg`],
            ["HUMIDITY", `${avgHumidity}%`],
            ["RAIN", hasRain ? "YES" : "NONE"],
          ].map(([label, val]) => (
            <div key={label}>
              <div
                style={{
                  color: "#55555b",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 7,
                  letterSpacing: "0.1em",
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  color:
                    label === "RAIN" && hasRain
                      ? "#3b82f6"
                      : "#eeeeef",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 10,
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 15px" }}>
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
              width={seg.x2 - seg.x1}
              height={PH}
              fill="rgba(59,130,246,0.12)"
              clipPath="url(#weatherClip)"
            />
          ))}

          {/* Grid */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD_L}
              y1={PAD_T + PH * (1 - f)}
              x2={PAD_L + PW}
              y2={PAD_T + PH * (1 - f)}
              stroke="#1d1d21"
              strokeWidth={1}
            />
          ))}

          {/* Track temp line */}
          <polyline
            points={line(trackTemps)}
            fill="none"
            stroke="#e10600"
            strokeWidth={2}
            clipPath="url(#weatherClip)"
          />

          {/* Air temp line */}
          <polyline
            points={line(airTemps)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 3"
            clipPath="url(#weatherClip)"
          />

          {/* Axis */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + PH}
            stroke="#333338"
            strokeWidth={1}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + PH}
            x2={PAD_L + PW}
            y2={PAD_T + PH}
            stroke="#333338"
            strokeWidth={1}
          />

          {/* Labels */}
          <text
            x={PAD_L + PW - 5}
            y={PAD_T + PH + 16}
            fill="#55555b"
            fontFamily="IBM Plex Mono, monospace"
            fontSize={8}
            textAnchor="end"
          >
            SESSION TIME →
          </text>
        </svg>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 20,
            paddingTop: 6,
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 8,
            color: "#77777d",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 2,
                background: "#e10600",
                verticalAlign: "middle",
                marginRight: 5,
              }}
            />
            TRACK TEMP
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 2,
                background: "#3b82f6",
                verticalAlign: "middle",
                marginRight: 5,
              }}
            />
            AIR TEMP
          </span>
          {hasRain && (
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  background: "rgba(59,130,246,0.3)",
                  verticalAlign: "middle",
                  marginRight: 5,
                }}
              />
              RAIN
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
