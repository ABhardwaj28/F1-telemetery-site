import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CircuitData,
  LapTelemetry,
  SessionDriver,
  SessionLap,
} from "../types";
import { TEAM_COLOURS, TYRE_COLOURS, formatLapTime } from "../data/loader";

interface DriverComparisonProps {
  circuit: CircuitData | null;
  drivers: SessionDriver[];
  driverA: string;
  lapA: number;
  telemetryA: LapTelemetry | null;
  driverB: string;
  lapB: number;
  telemetryB: LapTelemetry | null;
  availableLapsA: SessionLap[];
  availableLapsB: SessionLap[];
  onSelectDriverA: (driver: string) => void;
  onSelectLapA: (lap: number) => void;
  onSelectDriverB: (driver: string) => void;
  onSelectLapB: (lap: number) => void;
}

export default function DriverComparison({
  circuit,
  drivers,
  driverA,
  lapA,
  telemetryA,
  driverB,
  lapB,
  telemetryB,
  availableLapsA,
  availableLapsB,
  onSelectDriverA,
  onSelectLapA,
  onSelectDriverB,
  onSelectLapB,
}: DriverComparisonProps) {
  const [cursorDist, setCursorDist] = useState<number | null>(null);
  const [visibleChannel, setVisibleChannel] = useState<"all" | "speed" | "inputs" | "delta">("all");
  const [layoutMode, setLayoutMode] = useState<"overlay" | "split">("overlay");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const teamA = drivers.find((d) => d.abbreviation === driverA)?.team ?? "";
  const teamB = drivers.find((d) => d.abbreviation === driverB)?.team ?? "";

  // Vibrant high-contrast distinct colors
  const colorA = TEAM_COLOURS[teamA] ?? "#FF8000";
  const rawColorB = TEAM_COLOURS[teamB] ?? "#00E5FF";
  const colorB =
    driverA === driverB || teamA === teamB || colorA === rawColorB
      ? "#00E5FF"
      : rawColorB;

  const ptsA = useMemo(() => telemetryA?.telemetry.data ?? [], [telemetryA]);
  const ptsB = useMemo(() => telemetryB?.telemetry.data ?? [], [telemetryB]);

  const trackLength =
    circuit?.length_m ?? (ptsA.length ? ptsA[ptsA.length - 1].Distance : 5000);
  const turns = circuit?.turns ?? [];

  // Simultaneous animation timer
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        const moveDist = 68 * deltaSec * playbackSpeed;
        setCursorDist((prev) => {
          const current = prev ?? 0;
          const next = current + moveDist;
          if (next >= trackLength) {
            return 0; // loop
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, trackLength]);

  // Delta points simultaneous calculation
  const deltaPoints = useMemo(() => {
    if (!ptsA.length || !ptsB.length) return [];

    let bIdx = 0;
    return ptsA.map((pA) => {
      while (bIdx < ptsB.length - 1 && ptsB[bIdx + 1].Distance < pA.Distance) {
        bIdx++;
      }
      const pB = ptsB[bIdx] || pA;
      const dt = pA.Time - pB.Time;
      return {
        distance: pA.Distance,
        delta: dt,
        speedA: pA.Speed,
        speedB: pB.Speed,
        throttleA: pA.Throttle,
        throttleB: pB.Throttle,
        brakeA: pA.Brake,
        brakeB: pB.Brake,
        gearA: pA.nGear,
        gearB: pB.nGear,
      };
    });
  }, [ptsA, ptsB]);

  // SVG dimensions
  const W = 960;
  const H_SPEED = layoutMode === "split" ? 170 : 240;
  const H_SPEED_SPLIT_TOTAL = 350;
  const H_DELTA = 90;
  const H_THROTTLE = 90;
  const H_GEAR = 70;
  const PAD = { top: 20, right: 30, bottom: 20, left: 60 };

  const totalHeight = useMemo(() => {
    if (layoutMode === "split") {
      if (visibleChannel === "speed") return H_SPEED_SPLIT_TOTAL;
      if (visibleChannel === "delta") return H_DELTA;
      if (visibleChannel === "inputs") return H_THROTTLE + H_GEAR;
      return H_SPEED_SPLIT_TOTAL + H_DELTA + H_THROTTLE + H_GEAR;
    }
    if (visibleChannel === "speed") return H_SPEED;
    if (visibleChannel === "delta") return H_DELTA;
    if (visibleChannel === "inputs") return H_THROTTLE + H_GEAR;
    return H_SPEED + H_DELTA + H_THROTTLE + H_GEAR;
  }, [visibleChannel, layoutMode, H_SPEED, H_SPEED_SPLIT_TOTAL]);

  const maxSpeed = useMemo(() => {
    const sA = ptsA.map((p) => p.Speed);
    const sB = ptsB.map((p) => p.Speed);
    const max = Math.max(...sA, ...sB, 320);
    return Math.max(340, Math.ceil((max + 10) / 20) * 20);
  }, [ptsA, ptsB]);

  const scaleX = useCallback(
    (dist: number) => PAD.left + (dist / trackLength) * (W - PAD.left - PAD.right),
    [trackLength]
  );
  const scaleSpeedY = useCallback(
    (speed: number, height: number = H_SPEED) =>
      height - PAD.bottom - (speed / maxSpeed) * (height - PAD.top - PAD.bottom),
    [maxSpeed, H_SPEED]
  );

  // Delta scale
  const maxDelta = 1.5;
  const scaleDeltaY = (d: number) => {
    const clamped = Math.max(-maxDelta, Math.min(maxDelta, d));
    const midY = (H_DELTA - PAD.top - PAD.bottom) / 2 + PAD.top;
    return midY - (clamped / maxDelta) * ((H_DELTA - PAD.top - PAD.bottom) / 2);
  };

  const scaleThrottleY = (th: number) =>
    H_THROTTLE - PAD.bottom - (th / 100) * (H_THROTTLE - PAD.top - PAD.bottom);
  const scaleGearY = (g: number) =>
    H_GEAR - PAD.bottom - (g / 8) * (H_GEAR - PAD.top - PAD.bottom);

  // Speed paths (thin, high-precision)
  const speedPathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX, scaleSpeedY]);

  const speedPathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX, scaleSpeedY]);

  // Split view paths
  const speedPathSplitA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed, 160).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX, scaleSpeedY]);

  const speedPathSplitB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed, 160).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX, scaleSpeedY]);

  // Delta path
  const deltaPath = useMemo(() => {
    if (!deltaPoints.length) return "";
    return deltaPoints
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.distance).toFixed(1)} ${scaleDeltaY(p.delta).toFixed(1)}`
      )
      .join(" ");
  }, [deltaPoints, scaleX]);

  // Throttle paths
  const throttlePathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleThrottleY(p.Throttle).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX]);

  const throttlePathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleThrottleY(p.Throttle).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX]);

  // Gear paths (stepped)
  const gearPathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleGearY(p.nGear).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX]);

  const gearPathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleGearY(p.nGear).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX]);

  // Turn apex analysis
  const turnAnalysis = useMemo(() => {
    if (!turns.length || !ptsA.length) return [];
    return turns.map((t) => {
      const windowA = ptsA.filter((p) => Math.abs(p.Distance - t.distance) < 55);
      const minA = windowA.length
        ? Math.min(...windowA.map((p) => p.Speed))
        : t.speed;

      const windowB = ptsB.filter((p) => Math.abs(p.Distance - t.distance) < 55);
      const minB = windowB.length
        ? Math.min(...windowB.map((p) => p.Speed))
        : t.speed;

      return {
        turn: t.number,
        distance: Math.round(t.distance),
        speedA: Math.round(minA),
        speedB: Math.round(minB),
        deltaSpeed: Math.round(minA - minB),
      };
    });
  }, [turns, ptsA, ptsB]);

  // Hover scrubbing handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const svgX = relX * W;
    const clampedSvgX = Math.max(PAD.left, Math.min(W - PAD.right, svgX));
    const dist =
      ((clampedSvgX - PAD.left) / (W - PAD.left - PAD.right)) * trackLength;
    setCursorDist(dist);
  };

  const cursorPointA = useMemo(() => {
    if (cursorDist === null || !ptsA.length) return ptsA[0] ?? null;
    return ptsA.reduce((prev, curr) =>
      Math.abs(curr.Distance - cursorDist) < Math.abs(prev.Distance - cursorDist)
        ? curr
        : prev
    );
  }, [cursorDist, ptsA]);

  const cursorPointB = useMemo(() => {
    if (cursorDist === null || !ptsB.length) return ptsB[0] ?? null;
    return ptsB.reduce((prev, curr) =>
      Math.abs(curr.Distance - cursorDist) < Math.abs(prev.Distance - cursorDist)
        ? curr
        : prev
    );
  }, [cursorDist, ptsB]);

  const topSpeedA = ptsA.length ? Math.max(...ptsA.map((p) => p.Speed)) : 0;
  const topSpeedB = ptsB.length ? Math.max(...ptsB.map((p) => p.Speed)) : 0;
  const timeA = telemetryA?.lap_time ?? 0;
  const timeB = telemetryB?.lap_time ?? timeA;
  const lapTimeDelta = timeA && timeB ? timeA - timeB : 0;

  const currentDist = cursorDist ?? (ptsA.length ? ptsA[0].Distance : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Bar Selectors with Driver Colors ── */}
      <div className="panel" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Driver A */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 5,
                  height: 38,
                  background: colorA,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colorA}88`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: colorA,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 14, height: 2, background: colorA, display: "inline-block" }} />
                  DRIVER A ({driverA}) — SOLID
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <select
                    className="f1-select"
                    value={driverA}
                    onChange={(e) => onSelectDriverA(e.target.value)}
                    style={{ borderColor: colorA, background: "#111", minWidth: 130 }}
                  >
                    {drivers.map((d) => (
                      <option key={d.abbreviation} value={d.abbreviation}>
                        {d.abbreviation} ({d.team})
                      </option>
                    ))}
                  </select>
                  <select
                    className="f1-select"
                    value={lapA}
                    onChange={(e) => onSelectLapA(Number(e.target.value))}
                  >
                    {availableLapsA.length > 0 ? (
                      availableLapsA.map((l) => (
                        <option key={l.LapNumber} value={l.LapNumber}>
                          Lap {l.LapNumber} {l.LapTime ? `(${formatLapTime(l.LapTime)})` : ""}
                        </option>
                      ))
                    ) : (
                      <option value={lapA}>Lap {lapA}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 14,
                color: "#777",
                fontWeight: 800,
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              VS
            </div>

            {/* Driver B */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 5,
                  height: 38,
                  background: colorB,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colorB}88`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: colorB,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 2,
                      borderTop: `2px dashed ${colorB}`,
                      display: "inline-block",
                    }}
                  />
                  DRIVER B ({driverB}) — DASHED
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <select
                    className="f1-select"
                    value={driverB}
                    onChange={(e) => onSelectDriverB(e.target.value)}
                    style={{ borderColor: colorB, background: "#111", minWidth: 130 }}
                  >
                    {drivers.map((d) => (
                      <option key={d.abbreviation} value={d.abbreviation}>
                        {d.abbreviation} ({d.team})
                      </option>
                    ))}
                  </select>
                  <select
                    className="f1-select"
                    value={lapB}
                    onChange={(e) => onSelectLapB(Number(e.target.value))}
                  >
                    {availableLapsB.length > 0 ? (
                      availableLapsB.map((l) => (
                        <option key={l.LapNumber} value={l.LapNumber}>
                          Lap {l.LapNumber} {l.LapTime ? `(${formatLapTime(l.LapTime)})` : ""}
                        </option>
                      ))
                    ) : (
                      <option value={lapB}>Lap {lapB}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Overlay vs Split, Simultaneous Playback, Channels */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* View Mode: Overlay vs Split */}
            <div style={{ display: "flex", border: "1px solid #2a2a35", borderRadius: 4, overflow: "hidden" }}>
              <button
                onClick={() => setLayoutMode("overlay")}
                style={{
                  background: layoutMode === "overlay" ? "#282834" : "#111116",
                  color: layoutMode === "overlay" ? "#fff" : "#777",
                  border: "none",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                OVERLAY
              </button>
              <button
                onClick={() => setLayoutMode("split")}
                style={{
                  background: layoutMode === "split" ? "#282834" : "#111116",
                  color: layoutMode === "split" ? "#fff" : "#777",
                  border: "none",
                  borderLeft: "1px solid #2a2a35",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                SPLIT TRACKS
              </button>
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? "#e10600" : "#1a1a22",
                color: "#fff",
                border: "1px solid #333340",
                padding: "6px 14px",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: "IBM Plex Mono, monospace",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
            </button>

            {/* Speed Multiplier */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="f1-select"
              style={{ padding: "4px 8px", fontSize: 10 }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x Realtime</option>
              <option value={2}>2.0x Fast</option>
              <option value={4}>4.0x Ultra</option>
            </select>

            {/* Channels Filter */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "speed", "inputs", "delta"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setVisibleChannel(ch)}
                  style={{
                    background: visibleChannel === ch ? "#e10600" : "#131318",
                    color: visibleChannel === ch ? "#fff" : "#888894",
                    border: "1px solid #252530",
                    padding: "6px 10px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                    cursor: "pointer",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {ch === "inputs" ? "THROTTLE / GEAR" : ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Head to Head Live Telemetry Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div
          className="panel"
          style={{
            padding: "14px 18px",
            borderLeft: `4px solid ${colorA}`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        >
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            LAP TIME DELTA
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorA,
              }}
            >
              {formatLapTime(timeA)}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: lapTimeDelta <= 0 ? "#34d399" : "#e10600",
              }}
            >
              {lapTimeDelta === 0
                ? "EVEN"
                : `${lapTimeDelta > 0 ? "+" : ""}${lapTimeDelta.toFixed(3)}s`}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorB,
              }}
            >
              {formatLapTime(timeB)}
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: "14px 18px",
            borderLeft: `4px solid ${colorB}`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        >
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            LIVE SPEED ({currentDist.toFixed(0)}m)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorA,
              }}
            >
              {cursorPointA?.Speed.toFixed(0) ?? 0} km/h
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  (cursorPointA?.Speed ?? 0) >= (cursorPointB?.Speed ?? 0)
                    ? colorA
                    : colorB,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 700,
              }}
            >
              {((cursorPointA?.Speed ?? 0) - (cursorPointB?.Speed ?? 0) > 0 ? "+" : "") +
                ((cursorPointA?.Speed ?? 0) - (cursorPointB?.Speed ?? 0)).toFixed(0)}{" "}
              km/h
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorB,
              }}
            >
              {cursorPointB?.Speed.toFixed(0) ?? 0} km/h
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            LIVE THROTTLE & GEAR
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: colorA, fontFamily: "IBM Plex Mono, monospace" }}>
              G{cursorPointA?.nGear ?? 8} · {cursorPointA?.Throttle.toFixed(0) ?? 0}%
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>vs</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colorB, fontFamily: "IBM Plex Mono, monospace" }}>
              G{cursorPointB?.nGear ?? 8} · {cursorPointB?.Throttle.toFixed(0) ?? 0}%
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            TYRE & TOP SPEED
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: TYRE_COLOURS[telemetryA?.compound ?? ""] ?? "#eee",
              }}
            >
              {topSpeedA.toFixed(0)} <small style={{ fontSize: 10, color: "#888" }}>km/h</small>
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>vs</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: TYRE_COLOURS[telemetryB?.compound ?? ""] ?? "#eee",
              }}
            >
              {topSpeedB.toFixed(0)} <small style={{ fontSize: 10, color: "#888" }}>km/h</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Channel Overlaid / Split SVG Graphs ── */}
      <div className="panel" style={{ padding: "20px 24px" }}>
        <div
          className="panel-title"
          style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <h2>{layoutMode === "overlay" ? "OVERLAID TELEMETRY TRACES" : "SEPARATE SYNCHRONIZED TRACKS"}</h2>
            <span>
              {layoutMode === "overlay"
                ? "DISTINCT THIN SOLID (DRIVER A) & THIN DASHED (DRIVER B) TRACES"
                : "DEDICATED SYNCHRONIZED LANES FOR DRIVER A & DRIVER B"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 2.5,
                  background: colorA,
                  borderRadius: 1,
                  boxShadow: `0 0 6px ${colorA}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: colorA,
                  fontWeight: 700,
                }}
              >
                {driverA} (Solid)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 2.5,
                  borderTop: `2px dashed ${colorB}`,
                  boxShadow: `0 0 6px ${colorB}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: colorB,
                  fontWeight: 700,
                }}
              >
                {driverB} (Dashed)
              </span>
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${totalHeight}`}
          width="100%"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => !isPlaying && setCursorDist(null)}
          style={{ cursor: "crosshair", overflow: "visible" }}
        >
          <defs>
            <filter id="glowA">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={colorA} floodOpacity="0.5" />
            </filter>
            <filter id="glowB">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={colorB} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ── 1. SPEED CHANNEL (OVERLAY MODE) ── */}
          {layoutMode === "overlay" && (visibleChannel === "all" || visibleChannel === "speed") && (
            <g>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_SPEED - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              {/* Y-axis speed labels */}
              {[100, 150, 200, 250, 300, 350].filter((s) => s <= maxSpeed).map((s) => {
                const y = scaleSpeedY(s);
                return (
                  <g key={s}>
                    <line
                      x1={PAD.left}
                      y1={y}
                      x2={W - PAD.right}
                      y2={y}
                      stroke="#181822"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y + 3}
                      fill="#555562"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {s}
                    </text>
                  </g>
                );
              })}

              {/* Turn markers */}
              {turns.map((t) => {
                const x = scaleX(t.distance);
                return (
                  <g key={t.number}>
                    <line
                      x1={x}
                      y1={PAD.top}
                      x2={x}
                      y2={H_SPEED - PAD.bottom}
                      stroke="#22222c"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={PAD.top - 6}
                      fill="#777785"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="600"
                    >
                      T{t.number}
                    </text>
                  </g>
                );
              })}

              {/* Driver A: Crisp Thin Solid Line */}
              <path
                d={speedPathA}
                fill="none"
                stroke={colorA}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowA)"
              />

              {/* Driver B: Crisp Thin Dashed Line */}
              <path
                d={speedPathB}
                fill="none"
                stroke={colorB}
                strokeWidth="1.8"
                strokeDasharray="6 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowB)"
              />

              {/* Live ghost markers on curves */}
              {cursorPointA && (
                <circle
                  cx={scaleX(cursorPointA.Distance)}
                  cy={scaleSpeedY(cursorPointA.Speed)}
                  r={4.5}
                  fill={colorA}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}
              {cursorPointB && (
                <rect
                  x={scaleX(cursorPointB.Distance) - 4}
                  y={scaleSpeedY(cursorPointB.Speed) - 4}
                  width={8}
                  height={8}
                  transform={`rotate(45, ${scaleX(cursorPointB.Distance)}, ${scaleSpeedY(cursorPointB.Speed)})`}
                  fill={colorB}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#888"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
              >
                SPEED (KM/H) · SOLID: {driverA} | DASHED: {driverB}
              </text>
            </g>
          )}

          {/* ── 1. SPEED CHANNEL (SPLIT DUAL TRACKS MODE) ── */}
          {layoutMode === "split" && (visibleChannel === "all" || visibleChannel === "speed") && (
            <g>
              {/* Panel Driver A */}
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={130}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />
              <path
                d={speedPathSplitA}
                fill="none"
                stroke={colorA}
                strokeWidth="1.8"
                strokeLinecap="round"
                filter="url(#glowA)"
              />
              {cursorPointA && (
                <circle
                  cx={scaleX(cursorPointA.Distance)}
                  cy={scaleSpeedY(cursorPointA.Speed, 160)}
                  r={4.5}
                  fill={colorA}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}
              <text x={PAD.left + 8} y={PAD.top + 14} fill={colorA} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                {driverA} SPEED ({cursorPointA?.Speed.toFixed(0)} KM/H)
              </text>

              {/* Panel Driver B */}
              <g transform="translate(0, 150)">
                <rect
                  x={PAD.left}
                  y={PAD.top}
                  width={W - PAD.left - PAD.right}
                  height={130}
                  fill="#0a0a0d"
                  stroke="#1c1c24"
                />
                <path
                  d={speedPathSplitB}
                  fill="none"
                  stroke={colorB}
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                  filter="url(#glowB)"
                />
                {cursorPointB && (
                  <rect
                    x={scaleX(cursorPointB.Distance) - 4}
                    y={scaleSpeedY(cursorPointB.Speed, 160) - 4}
                    width={8}
                    height={8}
                    transform={`rotate(45, ${scaleX(cursorPointB.Distance)}, ${scaleSpeedY(cursorPointB.Speed, 160)})`}
                    fill={colorB}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
                <text x={PAD.left + 8} y={PAD.top + 14} fill={colorB} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                  {driverB} SPEED ({cursorPointB?.Speed.toFixed(0)} KM/H)
                </text>
              </g>
            </g>
          )}

          {/* ── 2. DELTA TIME CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "delta") && (
            <g transform={`translate(0, ${visibleChannel === "all" ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) : 0})`}>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_DELTA - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              {/* Zero baseline */}
              <line
                x1={PAD.left}
                y1={scaleDeltaY(0)}
                x2={W - PAD.right}
                y2={scaleDeltaY(0)}
                stroke="#444452"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(0) + 3}
                fill="#888892"
                fontSize="9"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                0.0s
              </text>
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(1) + 3}
                fill="#555562"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                +1.0s
              </text>
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(-1) + 3}
                fill="#555562"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                -1.0s
              </text>

              {/* Delta line */}
              <path d={deltaPath} fill="none" stroke="#f5c518" strokeWidth="1.8" />

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#888"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
              >
                TIME DELTA (Δt = {driverA} - {driverB})
              </text>
            </g>
          )}

          {/* ── 3. THROTTLE & BRAKE CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "inputs") && (
            <g
              transform={`translate(0, ${
                visibleChannel === "all"
                  ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) + H_DELTA
                  : 0
              })`}
            >
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_THROTTLE - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              <line
                x1={PAD.left}
                y1={scaleThrottleY(100)}
                x2={W - PAD.right}
                y2={scaleThrottleY(100)}
                stroke="#181822"
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 8}
                y={scaleThrottleY(100) + 3}
                fill="#555"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                100%
              </text>
              <text
                x={PAD.left - 8}
                y={scaleThrottleY(0) + 3}
                fill="#555"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                0%
              </text>

              {/* Throttle traces: Solid A vs Dashed B */}
              <path d={throttlePathA} fill="none" stroke={colorA} strokeWidth="1.6" opacity="0.9" />
              <path d={throttlePathB} fill="none" stroke={colorB} strokeWidth="1.6" strokeDasharray="5 2.5" opacity="0.9" />

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#888"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
              >
                THROTTLE % (SOLID: {driverA} | DASHED: {driverB})
              </text>
            </g>
          )}

          {/* ── 4. GEAR CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "inputs") && (
            <g
              transform={`translate(0, ${
                visibleChannel === "all"
                  ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) + H_DELTA + H_THROTTLE
                  : H_THROTTLE
              })`}
            >
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_GEAR - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              <text
                x={PAD.left - 8}
                y={scaleGearY(8) + 3}
                fill="#555"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                G8
              </text>
              <text
                x={PAD.left - 8}
                y={scaleGearY(1) + 3}
                fill="#555"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                G1
              </text>

              {/* Gear traces: Solid A vs Dashed B */}
              <path d={gearPathA} fill="none" stroke={colorA} strokeWidth="1.6" />
              <path d={gearPathB} fill="none" stroke={colorB} strokeWidth="1.6" strokeDasharray="5 2.5" />

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#888"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="600"
              >
                GEAR SELECTION
              </text>
            </g>
          )}

          {/* ── Simultaneous Hover/Play Cursor Bar ── */}
          {cursorDist !== null && (
            <line
              x1={scaleX(cursorDist)}
              y1={PAD.top}
              x2={scaleX(cursorDist)}
              y2={totalHeight - PAD.bottom}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}

          {/* ── Tooltip Bubble ── */}
          {cursorDist !== null && cursorPointA && cursorPointB && (
            <g
              transform={`translate(${Math.min(
                W - 200,
                Math.max(PAD.left + 10, scaleX(cursorDist) - 95)
              )}, ${PAD.top + 10})`}
            >
              <rect
                width="190"
                height="78"
                rx="6"
                fill="#101015"
                stroke="#2a2a35"
                opacity="0.96"
                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.7))"
              />
              <text x="12" y="16" fill="#888" fontSize="9" fontFamily="IBM Plex Mono, monospace">
                DISTANCE: {cursorDist.toFixed(0)}m / {trackLength.toFixed(0)}m
              </text>
              <text
                x="12"
                y="38"
                fill={colorA}
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                — {driverA}: {cursorPointA.Speed.toFixed(0)} km/h · G{cursorPointA.nGear} · {cursorPointA.Throttle.toFixed(0)}% TH
              </text>
              <text
                x="12"
                y="58"
                fill={colorB}
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                - - {driverB}: {cursorPointB.Speed.toFixed(0)} km/h · G{cursorPointB.nGear} · {cursorPointB.Throttle.toFixed(0)}% TH
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Turn Apex Speed Comparison Table ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>CORNER MINIMUM SPEED BREAKDOWN</h2>
            <span>APEX SPEED DELTAS ACROSS ALL {turns.length} CORNERS</span>
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #22222a",
                  color: "#777782",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 16px" }}>CORNER</th>
                <th style={{ padding: "8px 16px" }}>DISTANCE</th>
                <th style={{ padding: "8px 16px", color: colorA }}>{driverA} (SOLID) APEX</th>
                <th style={{ padding: "8px 16px", color: colorB }}>{driverB} (DASHED) APEX</th>
                <th style={{ padding: "8px 16px" }}>DELTA</th>
                <th style={{ padding: "8px 16px" }}>ADVANTAGE</th>
              </tr>
            </thead>
            <tbody>
              {turnAnalysis.map((t) => {
                const diff = t.speedA - t.speedB;
                const adv = diff > 0 ? driverA : diff < 0 ? driverB : "EQUAL";
                const advColor = diff > 0 ? colorA : diff < 0 ? colorB : "#888";
                return (
                  <tr key={t.turn} style={{ borderBottom: "1px solid #14141a" }}>
                    <td style={{ padding: "8px 16px", fontWeight: 700, color: "#eee" }}>
                      T{t.turn}
                    </td>
                    <td style={{ padding: "8px 16px", color: "#777" }}>{t.distance}m</td>
                    <td style={{ padding: "8px 16px", color: colorA, fontWeight: 600 }}>
                      {t.speedA} km/h
                    </td>
                    <td style={{ padding: "8px 16px", color: colorB, fontWeight: 600 }}>
                      {t.speedB} km/h
                    </td>
                    <td
                      style={{
                        padding: "8px 16px",
                        color: diff >= 0 ? "#34d399" : "#e10600",
                        fontWeight: 700,
                      }}
                    >
                      {diff > 0 ? `+${diff}` : diff} km/h
                    </td>
                    <td style={{ padding: "8px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: `${advColor}22`,
                          color: advColor,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {adv}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
