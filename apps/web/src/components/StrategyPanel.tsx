import { useMemo, useState } from "react";
import type { SessionDriver, SessionLap } from "../types";
import { TEAM_COLOURS, TYRE_COLOURS, formatLapTime } from "../data/loader";

interface StrategyPanelProps {
  drivers: SessionDriver[];
  laps: SessionLap[];
  sessionCode: string;
  selectedDriver?: string;
  onSelectDriver?: (driver: string) => void;
}

export default function StrategyPanel({
  drivers,
  laps,
  sessionCode,
  selectedDriver: controlledDriver,
  onSelectDriver,
}: StrategyPanelProps) {
  const [internalDriver, setInternalDriver] = useState<string>(drivers[0]?.abbreviation ?? "LEC");
  const activeDriver = (controlledDriver && drivers.some(d => d.abbreviation === controlledDriver))
    ? controlledDriver
    : (drivers.some(d => d.abbreviation === internalDriver) ? internalDriver : (drivers[0]?.abbreviation ?? ""));

  const handleSelectDriver = (d: string) => {
    setInternalDriver(d);
    onSelectDriver?.(d);
  };

  // Calculate stints per driver
  const driverStints = useMemo(() => {
    const map = new Map<
      string,
      { stint: number; compound: string; startLap: number; endLap: number; totalLaps: number }[]
    >();

    drivers.forEach((d) => {
      const dLaps = laps
        .filter((l) => l.Driver === d.abbreviation && l.LapNumber > 0)
        .sort((a, b) => a.LapNumber - b.LapNumber);

      const stints: { stint: number; compound: string; startLap: number; endLap: number; totalLaps: number }[] = [];
      let currentStint: { stint: number; compound: string; startLap: number; endLap: number; totalLaps: number } | null = null;

      dLaps.forEach((l) => {
        if (!currentStint || currentStint.stint !== l.Stint || (l.Compound && l.Compound !== currentStint.compound)) {
          if (currentStint) stints.push(currentStint);
          currentStint = {
            stint: l.Stint || (stints.length + 1),
            compound: l.Compound || "MEDIUM",
            startLap: l.LapNumber,
            endLap: l.LapNumber,
            totalLaps: 1,
          };
        } else {
          currentStint.endLap = l.LapNumber;
          currentStint.totalLaps = currentStint.endLap - currentStint.startLap + 1;
        }
      });
      if (currentStint) stints.push(currentStint);
      map.set(d.abbreviation, stints);
    });

    return map;
  }, [drivers, laps]);

  const maxRaceLaps = useMemo(() => {
    if (!laps.length) return 70;
    return Math.max(...laps.map((l) => l.LapNumber), 1);
  }, [laps]);

  // Selected driver lap times
  const selectedDriverLaps = useMemo(() => {
    return laps
      .filter((l) => l.Driver === activeDriver && l.LapTime && l.LapTime > 0)
      .sort((a, b) => a.LapNumber - b.LapNumber);
  }, [laps, activeDriver]);

  const bestLapTime = useMemo(() => {
    if (!selectedDriverLaps.length) return null;
    return Math.min(...selectedDriverLaps.map((l) => l.LapTime!));
  }, [selectedDriverLaps]);

  const activeDriverObj = drivers.find((d) => d.abbreviation === activeDriver);
  const activeTeamCol = TEAM_COLOURS[activeDriverObj?.team ?? ""] ?? "#60a5fa";

  // SVG dimensions for Lap Time chart
  const W = 900;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 30, left: 60 };

  const validTimes = selectedDriverLaps.map((l) => l.LapTime!);
  const minTime = validTimes.length ? Math.min(...validTimes) * 0.98 : 70;
  const maxTime = validTimes.length ? Math.min(Math.max(...validTimes), minTime * 1.25) : 100;

  const scaleX = (lapNum: number) => PAD.left + ((lapNum - 1) / Math.max(maxRaceLaps - 1, 1)) * (W - PAD.left - PAD.right);
  const scaleY = (time: number) => H - PAD.bottom - ((time - minTime) / Math.max(maxTime - minTime, 1)) * (H - PAD.top - PAD.bottom);

  const lapTimePath = useMemo(() => {
    if (!selectedDriverLaps.length) return "";
    return selectedDriverLaps
      .map((l, i) => `${i === 0 ? "M" : "L"} ${scaleX(l.LapNumber).toFixed(1)} ${scaleY(Math.min(l.LapTime!, maxTime)).toFixed(1)}`)
      .join(" ");
  }, [selectedDriverLaps, maxRaceLaps, minTime, maxTime]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Header ── */}
      <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">TYRE STRATEGY & LAP EVOLUTION · {sessionCode === "R" ? "RACE" : "PRACTICE/QUALIFYING"}</div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>RACE STRATEGY & LAP ANALYSIS</h1>
        </div>
        <div className="hero-metrics">
          <div className="metric"><span>TOTAL LAPS</span><strong>{maxRaceLaps}</strong></div>
          <div className="metric"><span>DRIVERS</span><strong>{drivers.length}</strong></div>
        </div>
      </div>

      {/* ── Tyre Stint Chart ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>TYRE STINT TIMELINE</h2>
            <span>COMPOUND SELECTION & PIT STOP WINDOWS ACROSS ALL DRIVERS</span>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {(["SOFT", "MEDIUM", "HARD", "INTER", "WET"] as const).map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYRE_COLOURS[c], boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
                <span style={{ fontSize: 10, color: "#8e8e98", fontFamily: "IBM Plex Mono, monospace" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {drivers.map((d) => {
            const stints = driverStints.get(d.abbreviation) ?? [];
            const teamCol = TEAM_COLOURS[d.team] ?? "#888";
            const isSelected = activeDriver === d.abbreviation;

            return (
              <div
                key={d.abbreviation}
                onClick={() => handleSelectDriver(d.abbreviation)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                  border: isSelected ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Driver Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, background: teamCol, borderRadius: 2 }} />
                  <span style={{ fontWeight: 700, fontSize: 11, color: isSelected ? "#ffffff" : "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
                    {d.abbreviation}
                  </span>
                </div>

                {/* Stints bar */}
                <div style={{ display: "flex", height: 22, background: "#0b0b0e", borderRadius: 4, overflow: "hidden", border: "1px solid #1c1c24" }}>
                  {stints.map((st, i) => {
                    const widthPct = (st.totalLaps / maxRaceLaps) * 100;
                    const compCol = TYRE_COLOURS[st.compound] ?? "#64748b";

                    return (
                      <div
                        key={i}
                        style={{
                          width: `${widthPct}%`,
                          background: compCol,
                          opacity: 0.88,
                          borderRight: i < stints.length - 1 ? "2px solid #09090d" : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: st.compound === "HARD" ? "#0f172a" : "#ffffff",
                          fontFamily: "IBM Plex Mono, monospace",
                          letterSpacing: "0.02em",
                        }}
                        title={`Stint ${st.stint}: ${st.compound} (Lap ${st.startLap} - ${st.endLap}, ${st.totalLaps} laps)`}
                      >
                        {st.totalLaps >= 4 ? `${st.compound[0]} (${st.totalLaps}L)` : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Lap Time Evolution Chart ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>LAP TIME CONSISTENCY & DEGRADATION</h2>
            <span>LAP-BY-LAP PACE EVOLUTION FOR {activeDriver}</span>
          </div>
          {bestLapTime && (
            <div style={{
              fontSize: 11,
              color: "#c084fc",
              fontFamily: "IBM Plex Mono, monospace",
              fontWeight: 700,
              background: "rgba(168, 85, 247, 0.10)",
              padding: "3px 8px",
              borderRadius: 4,
              border: "1px solid rgba(168, 85, 247, 0.20)",
            }}>
              BEST: {formatLapTime(bestLapTime)}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>
          {selectedDriverLaps.length > 0 ? (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" style={{ display: "block" }}>
              <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="#09090d" stroke="#1c1c24" rx="4" />

              {/* Grid Lines */}
              {[minTime, (minTime + maxTime) / 2, maxTime].map((t, idx) => {
                const y = scaleY(t);
                return (
                  <g key={idx}>
                    <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#16161f" strokeDasharray="3 3" />
                    <text x={PAD.left - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono, monospace">
                      {formatLapTime(t)}
                    </text>
                  </g>
                );
              })}

              {/* Lap path styled with selected driver team color */}
              <path d={lapTimePath} fill="none" stroke={activeTeamCol} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

              {/* Individual lap points */}
              {selectedDriverLaps.map((l) => {
                const cx = scaleX(l.LapNumber);
                const cy = scaleY(Math.min(l.LapTime!, maxTime));
                const isPB = l.LapTime === bestLapTime;

                return (
                  <circle
                    key={l.LapNumber}
                    cx={cx}
                    cy={cy}
                    r={isPB ? 4 : 2.5}
                    fill={isPB ? "#c084fc" : (TYRE_COLOURS[l.Compound] ?? activeTeamCol)}
                    stroke="#0b0b0e"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* X Axis labels dynamically spaced based on real race distance */}
              {[
                1,
                Math.max(2, Math.round(maxRaceLaps * 0.25)),
                Math.max(3, Math.round(maxRaceLaps * 0.50)),
                Math.max(4, Math.round(maxRaceLaps * 0.75)),
                maxRaceLaps,
              ].map((lapNum) => {
                const x = scaleX(lapNum);
                return (
                  <text key={lapNum} x={x} y={H - 10} fill="#71717a" fontSize="9" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
                    L{lapNum}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div className="empty-state">NO LAP DATA AVAILABLE FOR {activeDriver}</div>
          )}
        </div>
      </div>
    </div>
  );
}
