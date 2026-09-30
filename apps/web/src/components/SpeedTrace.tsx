import { useCallback, useMemo, useRef, useState } from "react";
import type { TelemetryPoint, Turn } from "../types";

interface Props {
  data: TelemetryPoint[];
  turns: Turn[];
  trackLength: number;
  onCursorChange: (index: number) => void;
  cursorIndex: number;
  color?: string;
  sessionCode?: string;
}

const CHART_W = 1000;
const CHART_H = 300;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 38;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export default function SpeedTrace({
  data,
  turns,
  trackLength,
  onCursorChange,
  cursorIndex,
  color = "#e10600",
  sessionCode = "R",
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovering, setHovering] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: "IBM Plex Mono, monospace" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📡</div>
        <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          CAR TELEMETRY STREAM UNAVAILABLE
        </div>
        <div style={{ color: "#888892", fontSize: 11 }}>
          High-frequency ECU and GPS telemetry channels are not recorded for this session.
        </div>
      </div>
    );
  }

  const maxDist = trackLength || (data.length ? data[data.length - 1].Distance : 5000);

  const maxSpeed = useMemo(() => {
    if (!data.length) return 340;
    const highest = Math.max(...data.map((p) => p.Speed));
    return Math.max(340, Math.ceil((highest + 10) / 20) * 20);
  }, [data]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let s = 0; s <= maxSpeed; s += 50) {
      ticks.push(s);
    }
    return ticks;
  }, [maxSpeed]);

  const toX = useCallback(
    (dist: number) => PAD_L + (dist / maxDist) * PLOT_W,
    [maxDist]
  );
  const toY = useCallback(
    (speed: number) => PAD_T + PLOT_H - (speed / maxSpeed) * PLOT_H,
    [maxSpeed]
  );

  // Build the speed polyline
  const speedPoints = useMemo(
    () =>
      data
        .map((p) => `${toX(p.Distance).toFixed(1)},${toY(p.Speed).toFixed(1)}`)
        .join(" "),
    [data, toX, toY]
  );

  // Throttle fill area
  const throttlePoints = useMemo(() => {
    if (!data.length) return "";
    return [
      `${toX(data[0]?.Distance ?? 0).toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)}`,
      ...data.map((p) => `${toX(p.Distance).toFixed(1)},${toY(p.Speed).toFixed(1)}`),
      `${toX(data[data.length - 1]?.Distance ?? maxDist).toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)}`,
    ].join(" ");
  }, [data, maxDist, toX, toY]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !data.length) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_W;
      const dist = ((mouseX - PAD_L) / PLOT_W) * maxDist;
      // Find nearest point
      let best = 0;
      let bestDelta = Infinity;
      for (let i = 0; i < data.length; i++) {
        const d = Math.abs(data[i].Distance - dist);
        if (d < bestDelta) {
          bestDelta = d;
          best = i;
        }
      }
      onCursorChange(best);
    },
    [data, maxDist, onCursorChange]
  );

  const cursorPoint = data[cursorIndex] ?? data[0] ?? null;
  const cursorX = cursorPoint ? toX(cursorPoint.Distance) : -999;
  const cursorY = cursorPoint ? toY(cursorPoint.Speed) : PAD_T;

  // Brake zones — segments where brake is true
  const brakeSegments = useMemo(() => {
    const segments: { x1: number; x2: number }[] = [];
    let brakeStart: number | null = null;
    for (let i = 0; i < data.length; i++) {
      if (data[i].Brake && brakeStart === null) {
        brakeStart = data[i].Distance;
      } else if (!data[i].Brake && brakeStart !== null) {
        segments.push({ x1: toX(brakeStart), x2: toX(data[i].Distance) });
        brakeStart = null;
      }
    }
    if (brakeStart !== null) {
      segments.push({ x1: toX(brakeStart), x2: toX(maxDist) });
    }
    return segments;
  }, [data, maxDist, toX]);

  // DRS zones
  const drsSegments = useMemo(() => {
    const segments: { x1: number; x2: number }[] = [];
    let drsStart: number | null = null;
    for (let i = 0; i < data.length; i++) {
      const isDrs = Boolean(data[i].DRS && data[i].DRS > 0);
      if (isDrs && drsStart === null) {
        drsStart = data[i].Distance;
      } else if (!isDrs && drsStart !== null) {
        segments.push({ x1: toX(drsStart), x2: toX(data[i].Distance) });
        drsStart = null;
      }
    }
    if (drsStart !== null) {
      segments.push({ x1: toX(drsStart), x2: toX(maxDist) });
    }
    return segments;
  }, [data, maxDist, toX]);

  // Dynamic X ticks
  const xTicks = useMemo(() => {
    const step = maxDist > 4500 ? 1000 : 500;
    const ticks: number[] = [];
    for (let d = 0; d < maxDist; d += step) {
      ticks.push(d);
    }
    ticks.push(Math.round(maxDist));
    return ticks;
  }, [maxDist]);

  return (
    <div className="speed-container" style={{ userSelect: "none" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        height="100%"
        className="speed-chart"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <defs>
          <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="drsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.03" />
          </linearGradient>
          <clipPath id="plotArea">
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y} className="grid-line" stroke="#181822" strokeDasharray="3 3" />
              <text x={PAD_L - 6} y={y + 3} className="axis-text" textAnchor="end" fill="#555562" fontSize="9" fontFamily="IBM Plex Mono, monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {xTicks.map((v) => {
          const x = toX(v);
          return (
            <g key={v}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + PLOT_H} className="grid-line" stroke="#181822" />
              <text x={x} y={PAD_T + PLOT_H + 14} className="axis-text" textAnchor="middle" fill="#555562" fontSize="9" fontFamily="IBM Plex Mono, monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* Brake zones */}
        {brakeSegments.map((seg, i) => (
          <rect
            key={i}
            x={seg.x1}
            y={PAD_T}
            width={Math.max(seg.x2 - seg.x1, 1)}
            height={PLOT_H}
            fill="rgba(225, 6, 0, 0.10)"
            clipPath="url(#plotArea)"
          />
        ))}

        {/* DRS zones */}
        {drsSegments.map((seg, i) => (
          <rect
            key={i}
            x={seg.x1}
            y={PAD_T}
            width={Math.max(seg.x2 - seg.x1, 1)}
            height={PLOT_H}
            fill="url(#drsGrad)"
            clipPath="url(#plotArea)"
          />
        ))}

        {/* Speed fill area */}
        {throttlePoints && (
          <polygon points={throttlePoints} fill="url(#speedFill)" clipPath="url(#plotArea)" />
        )}

        {/* Speed line */}
        {speedPoints && (
          <polyline
            points={speedPoints}
            fill="none"
            stroke={color}
            strokeWidth={sessionCode === "Q" || sessionCode === "SQ" ? "1.6" : "2.4"}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#plotArea)"
          />
        )}

        {/* Turn markers */}
        {turns.map((t) => {
          const x = toX(t.distance);
          return (
            <g key={t.number}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + PLOT_H} className="turn-line" stroke="#22222e" strokeWidth="1" />
              <circle cx={x} cy={PAD_T + 8} r={8} className="turn-circle" fill="#0f0f14" stroke="#3a3a46" strokeWidth="1" />
              <text x={x} y={PAD_T + 11} className="turn-text" textAnchor="middle" fill="#888894" fontSize="8" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
                {t.number}
              </text>
            </g>
          );
        })}

        {/* Cursor */}
        {hovering && cursorPoint && (
          <>
            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={PAD_T + PLOT_H}
              className="cursor-line"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx={cursorX} cy={cursorY} r={5} fill={color} stroke="#ffffff" strokeWidth="1.5" />
          </>
        )}

        {/* Axis labels */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={CHART_H - 4}
          className="axis-text"
          textAnchor="middle"
          fill="#777785"
          fontSize="9"
          fontFamily="IBM Plex Mono, monospace"
        >
          DISTANCE (m)
        </text>
        <text
          x={14}
          y={PAD_T + PLOT_H / 2}
          className="axis-text"
          textAnchor="middle"
          fill="#777785"
          fontSize="9"
          fontFamily="IBM Plex Mono, monospace"
          transform={`rotate(-90, 14, ${PAD_T + PLOT_H / 2})`}
        >
          KM/H
        </text>
      </svg>

      {/* Legend */}
      <div className="chart-footer">
        <span>0 m</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 3,
              fontSize: 9,
              fontFamily: "IBM Plex Mono, monospace",
              fontWeight: 700,
              background: sessionCode === "Q" || sessionCode === "SQ" ? "rgba(0, 229, 255, 0.12)" : "rgba(255, 215, 0, 0.12)",
              color: sessionCode === "Q" || sessionCode === "SQ" ? "#00E5FF" : "#FFD700",
              border: `1px solid ${sessionCode === "Q" || sessionCode === "SQ" ? "rgba(0, 229, 255, 0.4)" : "rgba(255, 215, 0, 0.4)"}`,
            }}
          >
            {sessionCode === "Q" || sessionCode === "SQ"
              ? `⚡ RAW 50Hz QUALIFYING (${data.length.toLocaleString()} CAN SAMPLES)`
              : `📦 COMPRESSED 10Hz RACE LOG (${data.length.toLocaleString()} SAMPLES)`}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 16, height: 3, background: color, borderRadius: 1, display: "inline-block" }} />
            Speed
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 8, background: "rgba(225,6,0,0.25)", borderRadius: 1, display: "inline-block" }} />
            Brake Zone
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 8, background: "rgba(52,211,153,0.25)", borderRadius: 1, display: "inline-block" }} />
            DRS Zone
          </span>
        </div>
        <span>{Math.round(maxDist)} m</span>
      </div>

      {/* Hover popup */}
      {hovering && cursorPoint && (
        <div
          className="telemetry-popup"
          style={{ left: `${Math.max(10, Math.min((cursorX / CHART_W) * 100 - 10, 78))}%` }}
        >
          <div className="popup-distance">{cursorPoint.Distance.toFixed(0)} m</div>
          <div className="popup-speed" style={{ color }}>
            {cursorPoint.Speed.toFixed(0)} <small>km/h</small>
          </div>
          <div className="popup-grid">
            <div>
              THROTTLE <b>{cursorPoint.Throttle.toFixed(0)}%</b>
            </div>
            <div>
              BRAKE <b style={{ color: cursorPoint.Brake ? "#e10600" : "#34d399" }}>{cursorPoint.Brake ? "ON" : "OFF"}</b>
            </div>
            <div>
              GEAR <b>G{cursorPoint.nGear}</b>
            </div>
            <div>
              RPM <b>{Math.round(cursorPoint.RPM).toLocaleString()}</b>
            </div>
            <div>
              DRS <b style={{ color: cursorPoint.DRS > 0 ? "#34d399" : "#666" }}>{cursorPoint.DRS > 0 ? "OPEN" : "CLOSED"}</b>
            </div>
            <div>
              TIME <b>{cursorPoint.Time.toFixed(2)}s</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
