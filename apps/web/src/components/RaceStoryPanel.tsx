import { useMemo, useState } from "react";
import type { SessionDriver, SessionLap, RaceControlMessage } from "../types";
import {
  TEAM_COLOURS,
  getTyreColour,
  getTyreTextColor,
  getTyreShort,
  formatLapTime,
  SESSION_NAME,
} from "../data/loader";

interface RaceStoryPanelProps {
  drivers: SessionDriver[];
  laps: SessionLap[];
  raceControl: RaceControlMessage[];
  sessionCode: string;
  selectedDriver?: string;
  onSelectDriver?: (driver: string) => void;
  year?: number;
  eventName?: string;
}

interface StintInfo {
  stint: number;
  compound: string;
  startLap: number;
  endLap: number;
  totalLaps: number;
  avgLapTime: number | null;
  bestLapTime: number | null;
  pitInLap: number | null;
  pitOutLap: number | null;
}

interface OvertakeEvent {
  lap: number;
  fromPos: number;
  toPos: number;
  type: "OVERTAKE" | "DEFENSE_LOSS" | "PIT_LOSS" | "PIT_OVERCUT_GAIN" | "RETIREMENT_GAIN";
  targetDriver?: string;
  targetTeam?: string;
  details: string;
}

interface PenaltyItem {
  time: string;
  lap: number | null;
  category: string;
  message: string;
  severity: "PENALTY" | "WARNING" | "INVESTIGATION" | "REPRIMAND";
}

export default function RaceStoryPanel({
  drivers,
  laps,
  raceControl,
  sessionCode,
  selectedDriver: controlledDriver,
  onSelectDriver,
  year = 2025,
  eventName = "Grand Prix",
}: RaceStoryPanelProps) {
  // Active driver state
  const [internalDriver, setInternalDriver] = useState<string>(drivers[0]?.abbreviation ?? "LEC");
  const activeDriver =
    controlledDriver && drivers.some((d) => d.abbreviation === controlledDriver)
      ? controlledDriver
      : drivers.some((d) => d.abbreviation === internalDriver)
      ? internalDriver
      : drivers[0]?.abbreviation ?? "";

  const handleSelectDriver = (d: string) => {
    setInternalDriver(d);
    onSelectDriver?.(d);
  };

  // Comparison driver state (optional overlay on charts)
  const [compareDriver, setCompareDriver] = useState<string | null>(null);

  // Table filter state
  const [tableFilter, setTableFilter] = useState<"ALL" | "PITS" | "PB" | "SLOW">("ALL");

  // Hovered lap in charts
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);

  // Active driver object
  const driverObj = useMemo(() => {
    return drivers.find((d) => d.abbreviation === activeDriver) || drivers[0];
  }, [drivers, activeDriver]);

  const teamCol = TEAM_COLOURS[driverObj?.team ?? ""] ?? "#60a5fa";

  // Comparison driver object
  const compareDriverObj = useMemo(() => {
    if (!compareDriver) return null;
    return drivers.find((d) => d.abbreviation === compareDriver) || null;
  }, [drivers, compareDriver]);

  const compareTeamCol = compareDriverObj ? TEAM_COLOURS[compareDriverObj.team] ?? "#f59e0b" : "#f59e0b";

  // Max laps in this session
  const maxRaceLaps = useMemo(() => {
    if (!laps.length) return 57;
    return Math.max(...laps.map((l) => l.LapNumber), 1);
  }, [laps]);

  // All laps for the active driver sorted by lap number
  const driverLaps = useMemo(() => {
    return laps
      .filter((l) => l.Driver === activeDriver && l.LapNumber > 0)
      .sort((a, b) => a.LapNumber - b.LapNumber);
  }, [laps, activeDriver]);

  // Comparison driver laps
  const compareLaps = useMemo(() => {
    if (!compareDriver) return [];
    return laps
      .filter((l) => l.Driver === compareDriver && l.LapNumber > 0)
      .sort((a, b) => a.LapNumber - b.LapNumber);
  }, [laps, compareDriver]);

  // Overall session fastest lap
  const overallFastestLap = useMemo(() => {
    const valid = laps.filter((l) => l.LapTime && l.LapTime > 0);
    if (!valid.length) return null;
    return valid.reduce((best, cur) => ((cur.LapTime ?? 999) < (best.LapTime ?? 999) ? cur : best), valid[0]);
  }, [laps]);

  // Driver personal best lap
  const bestLapObj = useMemo(() => {
    const valid = driverLaps.filter((l) => l.LapTime && l.LapTime > 0);
    if (!valid.length) return null;
    return valid.reduce((best, cur) => ((cur.LapTime ?? 999) < (best.LapTime ?? 999) ? cur : best), valid[0]);
  }, [driverLaps]);

  const bestLapTime = bestLapObj?.LapTime ?? null;

  // Stints calculation for active driver
  const driverStints: StintInfo[] = useMemo(() => {
    if (!driverLaps.length) return [];
    const stints: StintInfo[] = [];
    let current: StintInfo | null = null;
    const stintLapsMap = new Map<number, number[]>();

    driverLaps.forEach((l) => {
      const isNewStint =
        !current ||
        (l.Stint && l.Stint !== current.stint) ||
        (l.Compound && l.Compound !== current.compound);

      if (isNewStint) {
        if (current) stints.push(current);
        current = {
          stint: l.Stint || stints.length + 1,
          compound: l.Compound || "MEDIUM",
          startLap: l.LapNumber,
          endLap: l.LapNumber,
          totalLaps: 1,
          avgLapTime: null,
          bestLapTime: l.LapTime ?? null,
          pitInLap: l.PitInTime !== null ? l.LapNumber : null,
          pitOutLap: l.PitOutTime !== null ? l.LapNumber : null,
        };
        stintLapsMap.set(current.stint, l.LapTime ? [l.LapTime] : []);
      } else if (current) {
        current.endLap = l.LapNumber;
        current.totalLaps = current.endLap - current.startLap + 1;
        if (l.PitInTime !== null) current.pitInLap = l.LapNumber;
        if (l.PitOutTime !== null && current.pitOutLap === null) current.pitOutLap = l.LapNumber;
        if (l.LapTime) {
          const list = stintLapsMap.get(current.stint) || [];
          list.push(l.LapTime);
          stintLapsMap.set(current.stint, list);
          if (current.bestLapTime === null || l.LapTime < current.bestLapTime) {
            current.bestLapTime = l.LapTime;
          }
        }
      }
    });
    if (current) stints.push(current);

    // Compute average for each stint
    stints.forEach((s) => {
      const times = stintLapsMap.get(s.stint) || [];
      if (times.length > 0) {
        s.avgLapTime = times.reduce((a, b) => a + b, 0) / times.length;
      }
    });

    return stints;
  }, [driverLaps]);

  // Positions on each lap for every driver to calculate overtakes accurately
  const lapPositionsMap = useMemo(() => {
    const map = new Map<number, Map<string, number>>();
    for (let lapNum = 1; lapNum <= maxRaceLaps; lapNum++) {
      const lapLaps = laps.filter((l) => l.LapNumber === lapNum);
      const posMap = new Map<string, number>();
      lapLaps.forEach((l) => {
        if (l.Position !== null && l.Position !== undefined) {
          posMap.set(l.Driver, l.Position);
        }
      });
      map.set(lapNum, posMap);
    }
    return map;
  }, [laps, maxRaceLaps]);

  // Calculate Grid / Start position, Final position, and Net Position Delta
  const startPos = useMemo(() => {
    if (driverLaps.length > 0 && driverLaps[0].Position !== null) {
      return driverLaps[0].Position;
    }
    return driverObj?.position ?? 10;
  }, [driverLaps, driverObj]);

  const finishPos = useMemo(() => {
    if (driverLaps.length > 0) {
      const last = driverLaps[driverLaps.length - 1];
      if (last.Position !== null) return last.Position;
    }
    return driverObj?.position ?? 10;
  }, [driverLaps, driverObj]);

  const netPositionsGained = (startPos ?? 10) - (finishPos ?? 10);

  // Overtakes & Position Battles Engine
  const overtakesData = useMemo(() => {
    const events: OvertakeEvent[] = [];
    let overtakesMadeCount = 0;
    let overtakesSufferedCount = 0;

    for (let lapNum = 2; lapNum <= maxRaceLaps; lapNum++) {
      const prevMap = lapPositionsMap.get(lapNum - 1);
      const currMap = lapPositionsMap.get(lapNum);
      if (!prevMap || !currMap) continue;

      const pPos = prevMap.get(activeDriver);
      const cPos = currMap.get(activeDriver);
      if (pPos === undefined || cPos === undefined || pPos === cPos) continue;

      const thisLap = driverLaps.find((l) => l.LapNumber === lapNum);
      const isPitLap = thisLap?.PitInTime !== null || (thisLap?.PitOutTime !== null && lapNum > 1);

      if (cPos < pPos) {
        // Position improved (e.g. P5 -> P4)
        const diff = pPos - cPos;
        overtakesMadeCount += diff;

        // Check which drivers were passed
        const passedDrivers: string[] = [];
        for (let targetP = cPos; targetP < pPos; targetP++) {
          for (const [drv, prevP] of prevMap.entries()) {
            if (prevP === targetP && drv !== activeDriver) {
              const curTargetP = currMap.get(drv);
              if (curTargetP !== undefined && curTargetP > cPos) {
                passedDrivers.push(drv);
              }
            }
          }
        }

        const targetName = passedDrivers.length > 0 ? passedDrivers.join(", ") : `P${cPos} battle`;
        const targetObj = drivers.find((d) => d.abbreviation === passedDrivers[0]);

        events.push({
          lap: lapNum,
          fromPos: pPos,
          toPos: cPos,
          type: isPitLap ? "PIT_OVERCUT_GAIN" : "OVERTAKE",
          targetDriver: targetName,
          targetTeam: targetObj?.team,
          details:
            diff === 1
              ? `Overtook ${targetName} for P${cPos}`
              : `Gained ${diff} positions up to P${cPos} (passed ${targetName})`,
        });
      } else {
        // Position dropped (e.g. P3 -> P5)
        const diff = cPos - pPos;
        overtakesSufferedCount += diff;

        events.push({
          lap: lapNum,
          fromPos: pPos,
          toPos: cPos,
          type: isPitLap ? "PIT_LOSS" : "DEFENSE_LOSS",
          details: isPitLap
            ? `Pitted from P${pPos}, rejoined running P${cPos} (-${diff})`
            : `Lost position down to P${cPos} (-${diff})`,
        });
      }
    }

    return {
      events,
      overtakesMadeCount,
      overtakesSufferedCount,
      netOvertakes: overtakesMadeCount - overtakesSufferedCount,
    };
  }, [lapPositionsMap, maxRaceLaps, activeDriver, driverLaps, drivers]);

  // Penalties and Stewards Inquiries
  const driverPenalties: PenaltyItem[] = useMemo(() => {
    const list: PenaltyItem[] = [];
    const num = driverObj?.driver_number;
    const abbr = driverObj?.abbreviation;
    const full = driverObj?.full_name?.toLowerCase();

    // 1. Scan race control messages
    raceControl.forEach((m) => {
      const msgUpper = (m.Message || "").toUpperCase();
      const cat = (m.Category || "").toUpperCase();

      const isCarMatch =
        (num && m.RacingNumber === num) ||
        (num && msgUpper.includes(`CAR ${num}`)) ||
        (num && msgUpper.includes(`CAR #${num}`)) ||
        (abbr && msgUpper.includes(abbr)) ||
        (full && m.Message && m.Message.toLowerCase().includes(full));

      const isDisciplinary =
        cat.includes("PENALTY") ||
        cat.includes("STEWARD") ||
        cat.includes("INVESTIGATION") ||
        cat.includes("TRACKLIMITS") ||
        msgUpper.includes("PENALTY") ||
        msgUpper.includes("INVESTIGAT") ||
        msgUpper.includes("TRACK LIMITS") ||
        msgUpper.includes("WARNING") ||
        msgUpper.includes("BLACK AND WHITE") ||
        msgUpper.includes("DRIVE THROUGH") ||
        msgUpper.includes("REPRIMAND") ||
        msgUpper.includes("TIME PENALTY");

      if (isCarMatch && isDisciplinary) {
        let severity: PenaltyItem["severity"] = "PENALTY";
        if (msgUpper.includes("WARNING") || msgUpper.includes("BLACK AND WHITE")) severity = "WARNING";
        else if (msgUpper.includes("INVESTIGAT")) severity = "INVESTIGATION";
        else if (msgUpper.includes("REPRIMAND")) severity = "REPRIMAND";

        list.push({
          time: m.Time || "—",
          lap: m.Lap ?? null,
          category: m.Category || "Steward",
          message: m.Message,
          severity,
        });
      }
    });

    // 2. Scan deleted laps for track limits
    driverLaps.forEach((l) => {
      if (l.Deleted) {
        list.push({
          time: `Lap ${l.LapNumber}`,
          lap: l.LapNumber,
          category: "Track Limits",
          message: `Lap ${l.LapNumber} deleted - Turn track limits infringement (${formatLapTime(l.LapTime)})`,
          severity: "WARNING",
        });
      }
    });

    return list;
  }, [raceControl, driverObj, driverLaps]);

  // Average race lap time (excluding pit in/out laps)
  const avgRacePace = useMemo(() => {
    const cleanLaps = driverLaps.filter(
      (l) => l.LapTime && l.LapTime > 0 && l.PitInTime === null && l.PitOutTime === null
    );
    if (!cleanLaps.length) return null;
    const sum = cleanLaps.reduce((acc, l) => acc + l.LapTime!, 0);
    return sum / cleanLaps.length;
  }, [driverLaps]);

  // Filtered laps for the detailed table
  const displayedTableLaps = useMemo(() => {
    if (tableFilter === "PITS") {
      return driverLaps.filter((l) => l.PitInTime !== null || l.PitOutTime !== null);
    }
    if (tableFilter === "PB") {
      return driverLaps.filter((l) => l.IsPersonalBest || l.LapTime === bestLapTime);
    }
    if (tableFilter === "SLOW") {
      if (!avgRacePace) return driverLaps;
      return driverLaps.filter((l) => (l.LapTime ?? 0) > avgRacePace * 1.05);
    }
    return driverLaps;
  }, [driverLaps, tableFilter, bestLapTime, avgRacePace]);

  // Navigate to prev / next driver in grid
  const currentDriverIdx = drivers.findIndex((d) => d.abbreviation === activeDriver);
  const handlePrevDriver = () => {
    if (drivers.length <= 1) return;
    const nextIdx = (currentDriverIdx - 1 + drivers.length) % drivers.length;
    handleSelectDriver(drivers[nextIdx].abbreviation);
  };
  const handleNextDriver = () => {
    if (drivers.length <= 1) return;
    const nextIdx = (currentDriverIdx + 1) % drivers.length;
    handleSelectDriver(drivers[nextIdx].abbreviation);
  };

  // SVG Chart Dimensions
  const W = 960;
  const H_PACE = 260;
  const H_POS = 200;
  const PAD = { top: 25, right: 30, bottom: 35, left: 65 };

  // Pace Chart Scales
  const validPaceTimes = driverLaps.map((l) => l.LapTime!).filter((t) => t > 0);
  const minPaceTime = validPaceTimes.length ? Math.min(...validPaceTimes) * 0.985 : 75;
  const maxPaceTime = validPaceTimes.length
    ? Math.min(Math.max(...validPaceTimes), minPaceTime * 1.28)
    : 105;

  const scalePaceX = (lapNum: number) =>
    PAD.left + ((lapNum - 1) / Math.max(maxRaceLaps - 1, 1)) * (W - PAD.left - PAD.right);
  const scalePaceY = (t: number) =>
    H_PACE - PAD.bottom - ((t - minPaceTime) / Math.max(maxPaceTime - minPaceTime, 1)) * (H_PACE - PAD.top - PAD.bottom);

  const pacePath = useMemo(() => {
    if (!driverLaps.length) return "";
    return driverLaps
      .filter((l) => l.LapTime && l.LapTime > 0)
      .map(
        (l, i) =>
          `${i === 0 ? "M" : "L"} ${scalePaceX(l.LapNumber).toFixed(1)} ${scalePaceY(
            Math.min(l.LapTime!, maxPaceTime)
          ).toFixed(1)}`
      )
      .join(" ");
  }, [driverLaps, maxRaceLaps, minPaceTime, maxPaceTime]);

  const comparePacePath = useMemo(() => {
    if (!compareLaps.length) return "";
    return compareLaps
      .filter((l) => l.LapTime && l.LapTime > 0)
      .map(
        (l, i) =>
          `${i === 0 ? "M" : "L"} ${scalePaceX(l.LapNumber).toFixed(1)} ${scalePaceY(
            Math.min(l.LapTime!, maxPaceTime)
          ).toFixed(1)}`
      )
      .join(" ");
  }, [compareLaps, maxRaceLaps, minPaceTime, maxPaceTime]);

  // Position Chart Scales (P1 at top, P20 at bottom)
  const minPos = 1;
  const maxPos = Math.max(20, drivers.length);
  const scalePosX = (lapNum: number) =>
    PAD.left + ((lapNum - 1) / Math.max(maxRaceLaps - 1, 1)) * (W - PAD.left - PAD.right);
  const scalePosY = (pos: number) =>
    PAD.top + ((pos - minPos) / Math.max(maxPos - minPos, 1)) * (H_POS - PAD.top - PAD.bottom);

  const posPath = useMemo(() => {
    if (!driverLaps.length) return "";
    return driverLaps
      .filter((l) => l.Position !== null && l.Position !== undefined)
      .map(
        (l, i) =>
          `${i === 0 ? "M" : "L"} ${scalePosX(l.LapNumber).toFixed(1)} ${scalePosY(
            Math.min(Math.max(l.Position!, 1), maxPos)
          ).toFixed(1)}`
      )
      .join(" ");
  }, [driverLaps, maxRaceLaps, maxPos]);

  const comparePosPath = useMemo(() => {
    if (!compareLaps.length) return "";
    return compareLaps
      .filter((l) => l.Position !== null && l.Position !== undefined)
      .map(
        (l, i) =>
          `${i === 0 ? "M" : "L"} ${scalePosX(l.LapNumber).toFixed(1)} ${scalePosY(
            Math.min(Math.max(l.Position!, 1), maxPos)
          ).toFixed(1)}`
      )
      .join(" ");
  }, [compareLaps, maxRaceLaps, maxPos]);

  const hoveredLapData = useMemo(() => {
    if (hoveredLap === null) return null;
    return driverLaps.find((l) => l.LapNumber === hoveredLap) || null;
  }, [driverLaps, hoveredLap]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Hero & Driver Ribbon ── */}
      <div className="hero-section" style={{ minHeight: 90, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">
            {year} · {eventName.toUpperCase()} · {SESSION_NAME[sessionCode] ?? sessionCode} · INDIVIDUAL DRIVER
            CHRONICLE
          </div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
            <span>RACE STORY:</span>
            <span style={{ color: teamCol }}>
              {driverObj?.full_name ? driverObj.full_name.toUpperCase() : activeDriver}
            </span>
            <span
              style={{
                fontSize: 14,
                color: "#9ca3af",
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
                background: "rgba(255,255,255,0.06)",
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              #{driverObj?.driver_number || "—"}
            </span>
          </h1>
        </div>
        <div className="hero-metrics">
          <div className="metric">
            <span>GRID START</span>
            <strong>P{startPos}</strong>
          </div>
          <div className="metric">
            <span>FINISH POS</span>
            <strong style={{ color: finishPos <= 3 ? "#f59e0b" : "#ffffff" }}>P{finishPos}</strong>
          </div>
          <div className="metric">
            <span>NET DELTA</span>
            <strong
              style={{
                color:
                  netPositionsGained > 0 ? "#10b981" : netPositionsGained < 0 ? "#ef4444" : "#9ca3af",
              }}
            >
              {netPositionsGained > 0
                ? `▲ +${netPositionsGained}`
                : netPositionsGained < 0
                ? `▼ ${netPositionsGained}`
                : "— 0"}
            </strong>
          </div>
          <div className="metric">
            <span>PIT STOPS</span>
            <strong>{driverStints.length > 1 ? `${driverStints.length - 1} STOPS` : "NO STOP"}</strong>
          </div>
        </div>
      </div>

      {/* ── Driver Switcher Ribbon ── */}
      <div className="panel" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#dedee8" }}>
              SELECT DRIVER TO REVEAL RACE STORY
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#71717a",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              ({drivers.length} DRIVERS)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handlePrevDriver}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#eee",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
              }}
            >
              ◀ PREV
            </button>
            <button
              onClick={handleNextDriver}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#eee",
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
              }}
            >
              NEXT ▶
            </button>
          </div>
        </div>

        {/* Driver pill buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "thin",
          }}
        >
          {drivers.map((d) => {
            const isSelected = d.abbreviation === activeDriver;
            const dTeamCol = TEAM_COLOURS[d.team] ?? "#888";
            const dLaps = laps.filter((l) => l.Driver === d.abbreviation && l.LapNumber > 0);
            const dStart = dLaps[0]?.Position ?? d.position ?? 10;
            const dEnd = dLaps[dLaps.length - 1]?.Position ?? d.position ?? 10;
            const dNet = dStart - dEnd;

            return (
              <button
                key={d.abbreviation}
                onClick={() => handleSelectDriver(d.abbreviation)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: isSelected ? `1.5px solid ${dTeamCol}` : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ width: 3, height: 16, background: dTeamCol, borderRadius: 2 }} />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: isSelected ? "#ffffff" : "#a1a1aa",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  {d.abbreviation}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "IBM Plex Mono, monospace",
                    color: dNet > 0 ? "#10b981" : dNet < 0 ? "#ef4444" : "#71717a",
                  }}
                >
                  {dNet > 0 ? `+${dNet}` : dNet < 0 ? `${dNet}` : "="}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Key Performance Indicators (6 Tiles) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {/* Tile 1: Net Progression */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            POSITIONS GAINED / LOST
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "Space Grotesk, sans-serif",
              color: netPositionsGained > 0 ? "#10b981" : netPositionsGained < 0 ? "#ef4444" : "#eeeeef",
            }}
          >
            {netPositionsGained > 0
              ? `▲ +${netPositionsGained} GAINED`
              : netPositionsGained < 0
              ? `▼ ${Math.abs(netPositionsGained)} LOST`
              : "0 LEVEL"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
            Grid P{startPos} ➔ Finish P{finishPos}
          </div>
        </div>

        {/* Tile 2: Overtakes */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            OVERTAKES MADE / CONCEDED
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "Space Grotesk, sans-serif",
              color: "#38bdf8",
            }}
          >
            {overtakesData.overtakesMadeCount}
            <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>
              {" "}
              / {overtakesData.overtakesSufferedCount}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
            Net:{" "}
            <span
              style={{
                color:
                  overtakesData.netOvertakes > 0
                    ? "#10b981"
                    : overtakesData.netOvertakes < 0
                    ? "#ef4444"
                    : "#aaa",
              }}
            >
              {overtakesData.netOvertakes > 0 ? `+${overtakesData.netOvertakes}` : overtakesData.netOvertakes}
            </span>{" "}
            differential
          </div>
        </div>

        {/* Tile 3: Personal Best Lap */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            PERSONAL BEST LAP
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "IBM Plex Mono, monospace",
              color: bestLapTime === overallFastestLap?.LapTime ? "#c084fc" : "#eeeeef",
            }}
          >
            {bestLapTime ? formatLapTime(bestLapTime) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
            {bestLapObj
              ? `Lap ${bestLapObj.LapNumber} · ${bestLapObj.Compound || "TYRE"}${
                  bestLapTime === overallFastestLap?.LapTime ? " ★ OVERALL FL" : ""
                }`
              : "No valid lap"}
          </div>
        </div>

        {/* Tile 4: Average Race Pace */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            AVERAGE RACE PACE
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#eeeeef",
            }}
          >
            {avgRacePace ? formatLapTime(avgRacePace) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
            Clean racing laps excl. pit lane
          </div>
        </div>

        {/* Tile 5: Pit Strategy */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            TYRE STRATEGY
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "Space Grotesk, sans-serif",
              color: "#fbbf24",
            }}
          >
            {driverStints.length > 1 ? `${driverStints.length - 1}-STOP` : "1-STINT"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              fontFamily: "IBM Plex Mono, monospace",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {driverStints.map((s, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: getTyreColour(s.compound, year),
                    display: "inline-block",
                  }}
                />
                <strong style={{ color: "#fff" }}>{getTyreShort(s.compound)}</strong>
                {i < driverStints.length - 1 && <span style={{ color: "#555" }}>➔</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Tile 6: Penalties / Stewards */}
        <div
          className="panel"
          style={{
            padding: "16px 18px",
            background: "rgba(12, 12, 14, 0.95)",
            border: "1px solid #1f1f26",
          }}
        >
          <div style={{ fontSize: 10, color: "#85858b", letterSpacing: "0.08em", fontWeight: 700 }}>
            PENALTIES & INFRACTIONS
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "6px 0 2px",
              fontFamily: "Space Grotesk, sans-serif",
              color: driverPenalties.length > 0 ? "#ef4444" : "#10b981",
            }}
          >
            {driverPenalties.length > 0 ? `${driverPenalties.length} NOTED` : "0 CLEAN"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "IBM Plex Mono, monospace" }}>
            {driverPenalties.length > 0 ? "FIA Stewards actions taken" : "Clean disciplinary sheet"}
          </div>
        </div>
      </div>

      {/* ── Section: Tyre Strategy & Pit Windows ── */}
      <div className="panel">
        <div className="panel-title" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>TYRE STRATEGY & STINT LIFECYCLE</h2>
            <span>COMPOUND SELECTION, STINT LENGTHS & PIT STOP WINDOWS FOR {activeDriver}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {driverStints.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.04)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: getTyreColour(s.compound, year),
                  }}
                />
                <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#ddd" }}>
                  Stint {s.stint}: {s.compound} ({s.totalLaps} Laps)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Stint Bar Visual Timeline */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                height: 32,
                background: "#09090d",
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid #22222a",
              }}
            >
              {driverStints.map((st, i) => {
                const widthPct = (st.totalLaps / maxRaceLaps) * 100;
                const compCol = getTyreColour(st.compound, year);
                const textColor = getTyreTextColor(st.compound, year);
                const shortCode = getTyreShort(st.compound);

                return (
                  <div
                    key={i}
                    style={{
                      width: `${widthPct}%`,
                      background: compCol,
                      opacity: 0.95,
                      borderRight: i < driverStints.length - 1 ? "3px solid #09090d" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: textColor,
                      fontFamily: "IBM Plex Mono, monospace",
                      letterSpacing: "0.03em",
                      cursor: "help",
                    }}
                    title={`Stint ${st.stint}: ${st.compound} · Laps ${st.startLap} - ${st.endLap} (${st.totalLaps} laps)`}
                  >
                    {st.totalLaps >= 4 ? `STINT ${st.stint} · ${shortCode} (${st.totalLaps}L)` : shortCode}
                  </div>
                );
              })}
            </div>

            {/* Lap scale ticks */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontSize: 9,
                color: "#71717a",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              <span>LAP 1 (START)</span>
              <span>LAP {Math.round(maxRaceLaps / 2)} (MIDWAY)</span>
              <span>LAP {maxRaceLaps} (FINISH)</span>
            </div>
          </div>

          {/* Stint Detail Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {driverStints.map((st) => (
              <div
                key={st.stint}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: getTyreColour(st.compound, year),
                      }}
                    />
                    <strong style={{ fontSize: 13, color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}>
                      STINT {st.stint}
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.08)",
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    {st.compound}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#a1a1aa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>LAPS RUN:</span>
                    <strong style={{ color: "#eee" }}>
                      L{st.startLap} – L{st.endLap} ({st.totalLaps} laps)
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>BEST PACE:</span>
                    <strong style={{ color: "#c084fc" }}>
                      {st.bestLapTime ? formatLapTime(st.bestLapTime) : "—"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>AVG PACE:</span>
                    <strong style={{ color: "#eee" }}>
                      {st.avgLapTime ? formatLapTime(st.avgLapTime) : "—"}
                    </strong>
                  </div>
                  {st.pitInLap && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>PIT STOP:</span>
                      <strong style={{ color: "#f59e0b" }}>Lap {st.pitInLap}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section: Positions Progression & Overtakes Breakdown ── */}
      <div className="story-split-grid">
        {/* Left: Position Progression Curve */}
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>POSITION EVOLUTION</h2>
              <span>LAP-BY-LAP TRACK POSITION (P1 AT TOP)</span>
            </div>
            {/* Optional benchmark driver overlay selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "#85858b", fontFamily: "IBM Plex Mono, monospace" }}>
                OVERLAY:
              </span>
              <select
                value={compareDriver || ""}
                onChange={(e) => setCompareDriver(e.target.value || null)}
                style={{
                  background: "#141419",
                  border: "1px solid #282832",
                  color: "#eee",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                <option value="">None (Solo)</option>
                {drivers
                  .filter((d) => d.abbreviation !== activeDriver)
                  .map((d) => (
                    <option key={d.abbreviation} value={d.abbreviation}>
                      {d.abbreviation} ({d.team})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <svg viewBox={`0 0 ${W} ${H_POS}`} width="100%" height={H_POS} style={{ display: "block" }}>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_POS - PAD.top - PAD.bottom}
                fill="#09090d"
                stroke="#1c1c24"
                rx="4"
              />

              {/* Grid Lines for Positions P1, P5, P10, P15, P20 */}
              {[1, 5, 10, 15, Math.min(20, maxPos)].map((p) => {
                const y = scalePosY(p);
                return (
                  <g key={p}>
                    <line
                      x1={PAD.left}
                      y1={y}
                      x2={W - PAD.right}
                      y2={y}
                      stroke={p === 1 ? "rgba(245, 158, 11, 0.25)" : "#16161f"}
                      strokeDasharray={p === 1 ? "none" : "3 3"}
                    />
                    <text
                      x={PAD.left - 8}
                      y={y + 3}
                      fill={p === 1 ? "#f59e0b" : "#71717a"}
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight={p === 1 ? "700" : "500"}
                    >
                      P{p}
                    </text>
                  </g>
                );
              })}

              {/* Comparison driver line */}
              {compareDriver && comparePosPath && (
                <path
                  d={comparePosPath}
                  fill="none"
                  stroke={compareTeamCol}
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.75"
                />
              )}

              {/* Active driver position line */}
              <path
                d={posPath}
                fill="none"
                stroke={teamCol}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Position markers & Overtake indicators */}
              {driverLaps.map((l) => {
                if (l.Position === null || l.Position === undefined) return null;
                const cx = scalePosX(l.LapNumber);
                const cy = scalePosY(l.Position);
                const isPit = l.PitInTime !== null;
                const isHovered = hoveredLap === l.LapNumber;

                return (
                  <g
                    key={l.LapNumber}
                    onMouseEnter={() => setHoveredLap(l.LapNumber)}
                    onMouseLeave={() => setHoveredLap(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5 : isPit ? 4 : 2}
                      fill={isPit ? "#f59e0b" : teamCol}
                      stroke="#09090d"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}

              {/* X Axis ticks */}
              {[
                1,
                Math.max(2, Math.round(maxRaceLaps * 0.25)),
                Math.max(3, Math.round(maxRaceLaps * 0.5)),
                Math.max(4, Math.round(maxRaceLaps * 0.75)),
                maxRaceLaps,
              ].map((lapNum) => {
                const x = scalePosX(lapNum);
                return (
                  <text
                    key={lapNum}
                    x={x}
                    y={H_POS - 10}
                    fill="#71717a"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    L{lapNum}
                  </text>
                );
              })}
            </svg>

            {/* Micro legend */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 10,
                color: "#71717a",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 12, height: 2, background: teamCol, display: "inline-block" }} />
                  {activeDriver}
                </span>
                {compareDriver && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        width: 12,
                        height: 2,
                        background: compareTeamCol,
                        display: "inline-block",
                      }}
                    />
                    {compareDriver} (Benchmark)
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#f59e0b",
                      display: "inline-block",
                    }}
                  />
                  Pit Stop
                </span>
              </div>
              <span>Higher curve = Closer to P1</span>
            </div>
          </div>
        </div>

        {/* Right: Overtakes & Position Battles Log */}
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>OVERTAKES & BATTLES</h2>
              <span>CHRONOLOGICAL POSITION CHANGES</span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#10b981",
                fontFamily: "IBM Plex Mono, monospace",
                background: "rgba(16, 185, 129, 0.12)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {overtakesData.events.length} EVENTS
            </span>
          </div>

          <div
            style={{
              padding: "12px 16px",
              maxHeight: 250,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {overtakesData.events.length > 0 ? (
              overtakesData.events.map((ev, i) => {
                const isGain = ev.fromPos > ev.toPos;
                const badgeColor =
                  ev.type === "OVERTAKE"
                    ? "#10b981"
                    : ev.type === "PIT_OVERCUT_GAIN"
                    ? "#38bdf8"
                    : ev.type === "PIT_LOSS"
                    ? "#f59e0b"
                    : "#ef4444";

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#9ca3af",
                          fontFamily: "IBM Plex Mono, monospace",
                          width: 42,
                        }}
                      >
                        LAP {ev.lap}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 11, color: "#eee", fontWeight: 600 }}>{ev.details}</span>
                        <span
                          style={{
                            fontSize: 9,
                            color: badgeColor,
                            fontWeight: 700,
                            fontFamily: "IBM Plex Mono, monospace",
                          }}
                        >
                          {ev.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "IBM Plex Mono, monospace",
                        color: isGain ? "#10b981" : "#ef4444",
                      }}
                    >
                      P{ev.fromPos} ➔ P{ev.toPos}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "30px 20px",
                  textAlign: "center",
                  color: "#71717a",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                }}
              >
                POSITION UNCHANGED THROUGHOUT RACE DISTANCE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Lap-Time Consistency Graph ── */}
      <div className="panel">
        <div className="panel-title" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>LAP-TIME PROGRESSION & DEGRADATION</h2>
            <span>IN-DEPTH PACE TRACE ACROSS RACE DISTANCE (HOVER ANY POINT FOR DETAIL)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {bestLapTime && (
              <div
                style={{
                  fontSize: 11,
                  color: "#c084fc",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontWeight: 700,
                  background: "rgba(168, 85, 247, 0.10)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid rgba(168, 85, 247, 0.20)",
                }}
              >
                FASTEST: {formatLapTime(bestLapTime)}
              </div>
            )}
            {avgRacePace && (
              <div
                style={{
                  fontSize: 11,
                  color: "#38bdf8",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontWeight: 700,
                  background: "rgba(56, 189, 248, 0.10)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid rgba(56, 189, 248, 0.20)",
                }}
              >
                AVG PACE: {formatLapTime(avgRacePace)}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {driverLaps.length > 0 ? (
            <>
              <svg viewBox={`0 0 ${W} ${H_PACE}`} width="100%" height={H_PACE} style={{ display: "block" }}>
                <rect
                  x={PAD.left}
                  y={PAD.top}
                  width={W - PAD.left - PAD.right}
                  height={H_PACE - PAD.top - PAD.bottom}
                  fill="#09090d"
                  stroke="#1c1c24"
                  rx="4"
                />

                {/* Grid Lines for Y-axis times */}
                {[minPaceTime, (minPaceTime + maxPaceTime) / 2, maxPaceTime].map((t, idx) => {
                  const y = scalePaceY(t);
                  return (
                    <g key={idx}>
                      <line
                        x1={PAD.left}
                        y1={y}
                        x2={W - PAD.right}
                        y2={y}
                        stroke="#16161f"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={PAD.left - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {formatLapTime(t)}
                      </text>
                    </g>
                  );
                })}

                {/* Average pace dashed line */}
                {avgRacePace && (
                  <line
                    x1={PAD.left}
                    y1={scalePaceY(avgRacePace)}
                    x2={W - PAD.right}
                    y2={scalePaceY(avgRacePace)}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                    opacity="0.6"
                  />
                )}

                {/* Benchmark driver comparison line */}
                {compareDriver && comparePacePath && (
                  <path
                    d={comparePacePath}
                    fill="none"
                    stroke={compareTeamCol}
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    opacity="0.65"
                  />
                )}

                {/* Active driver pace path */}
                <path
                  d={pacePath}
                  fill="none"
                  stroke={teamCol}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />

                {/* Individual lap dots colored by tyre compound */}
                {driverLaps.map((l) => {
                  if (!l.LapTime || l.LapTime <= 0) return null;
                  const cx = scalePaceX(l.LapNumber);
                  const cy = scalePaceY(Math.min(l.LapTime, maxPaceTime));
                  const isPB = l.LapTime === bestLapTime;
                  const isPit = l.PitInTime !== null;
                  const isHovered = hoveredLap === l.LapNumber;
                  const compCol = getTyreColour(l.Compound, year);

                  return (
                    <g
                      key={l.LapNumber}
                      onMouseEnter={() => setHoveredLap(l.LapNumber)}
                      onMouseLeave={() => setHoveredLap(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 5.5 : isPB ? 4.5 : isPit ? 4 : 2.5}
                        fill={isPB ? "#c084fc" : isPit ? "#f59e0b" : compCol}
                        stroke="#09090d"
                        strokeWidth="1.2"
                      />
                    </g>
                  );
                })}

                {/* X Axis ticks */}
                {[
                  1,
                  Math.max(2, Math.round(maxRaceLaps * 0.25)),
                  Math.max(3, Math.round(maxRaceLaps * 0.5)),
                  Math.max(4, Math.round(maxRaceLaps * 0.75)),
                  maxRaceLaps,
                ].map((lapNum) => {
                  const x = scalePaceX(lapNum);
                  return (
                    <text
                      key={lapNum}
                      x={x}
                      y={H_PACE - 10}
                      fill="#71717a"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      L{lapNum}
                    </text>
                  );
                })}
              </svg>

              {/* Hover Readout Bar */}
              {hoveredLapData && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <strong style={{ color: "#fff" }}>LAP {hoveredLapData.LapNumber}</strong>
                    <span>
                      TIME:{" "}
                      <strong style={{ color: hoveredLapData.LapTime === bestLapTime ? "#c084fc" : teamCol }}>
                        {formatLapTime(hoveredLapData.LapTime)}
                      </strong>
                    </span>
                    <span>
                      POS: <strong style={{ color: "#fff" }}>P{hoveredLapData.Position}</strong>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: getTyreColour(hoveredLapData.Compound, year),
                          display: "inline-block",
                        }}
                      />
                      {hoveredLapData.Compound} (Age: {hoveredLapData.TyreLife || 1}L)
                    </span>
                    {hoveredLapData.Sector1Time && (
                      <span style={{ color: "#888" }}>
                        S1: {hoveredLapData.Sector1Time.toFixed(3)}s · S2:{" "}
                        {hoveredLapData.Sector2Time?.toFixed(3)}s · S3:{" "}
                        {hoveredLapData.Sector3Time?.toFixed(3)}s
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">NO LAP DATA RECORDED FOR {activeDriver}</div>
          )}
        </div>
      </div>

      {/* ── Section: Penalties & Stewards Inquiries ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>PENALTIES & STEWARDS DECISIONS</h2>
            <span>OFFICIAL DISCIPLINARY ACTIONS, WARNINGS & INVESTIGATIONS</span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              fontFamily: "IBM Plex Mono, monospace",
              background:
                driverPenalties.length > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: driverPenalties.length > 0 ? "#ef4444" : "#10b981",
            }}
          >
            {driverPenalties.length > 0 ? `${driverPenalties.length} INFRACTIONS` : "CLEAN RACE SHEET"}
          </span>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {driverPenalties.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {driverPenalties.map((pen, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fee2e2" }}>{pen.message}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#f87171",
                          fontFamily: "IBM Plex Mono, monospace",
                          marginTop: 2,
                        }}
                      >
                        {pen.category} · {pen.time}
                        {pen.lap ? ` · Lap ${pen.lap}` : ""}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "IBM Plex Mono, monospace",
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "rgba(239, 68, 68, 0.25)",
                      color: "#fca5a5",
                    }}
                  >
                    {pen.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 6,
                padding: "16px 20px",
              }}
            >
              <span style={{ fontSize: 22 }}>🛡️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a7f3d0" }}>
                  CLEAN SHEET · NO PENALTIES OR REPRIMANDS
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6ee7b7",
                    fontFamily: "IBM Plex Mono, monospace",
                    marginTop: 2,
                  }}
                >
                  {driverObj?.full_name || activeDriver} committed zero track limits infringements, pit lane
                  speeding violations, or collision infringements throughout the session.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section: Lap-Time per Lap Detailed Telemetry Table ── */}
      <div className="panel">
        <div
          className="panel-title"
          style={{
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2>LAP-TIME PER LAP TELEMETRY</h2>
            <span>INDIVIDUAL LAP BREAKDOWN, SECTOR SPLITS & TYRE METRICS</span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                { label: "ALL LAPS", val: "ALL" },
                { label: "PIT STOPS", val: "PITS" },
                { label: "PERSONAL BESTS", val: "PB" },
                { label: "DEGRADED LAPS", val: "SLOW" },
              ] as const
            ).map(({ label, val }) => (
              <button
                key={val}
                onClick={() => setTableFilter(val)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "IBM Plex Mono, monospace",
                  background: tableFilter === val ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.03)",
                  border:
                    tableFilter === val
                      ? "1px solid rgba(255,255,255,0.25)"
                      : "1px solid rgba(255,255,255,0.06)",
                  color: tableFilter === val ? "#ffffff" : "#888",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 16px 16px", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #1f1f28", color: "#6e6e78", textAlign: "left" }}>
                <th style={{ padding: "10px 8px" }}>LAP</th>
                <th style={{ padding: "10px 8px" }}>POS</th>
                <th style={{ padding: "10px 8px" }}>LAP TIME</th>
                <th style={{ padding: "10px 8px" }}>DELTA TO PB</th>
                <th style={{ padding: "10px 8px" }}>SECTOR 1</th>
                <th style={{ padding: "10px 8px" }}>SECTOR 2</th>
                <th style={{ padding: "10px 8px" }}>SECTOR 3</th>
                <th style={{ padding: "10px 8px" }}>COMPOUND</th>
                <th style={{ padding: "10px 8px" }}>TYRE AGE</th>
                <th style={{ padding: "10px 8px" }}>STINT</th>
                <th style={{ padding: "10px 8px", textAlign: "right" }}>PIT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {displayedTableLaps.length > 0 ? (
                displayedTableLaps.map((lap, idx) => {
                  const isPB = lap.LapTime === bestLapTime;
                  const deltaToPB =
                    lap.LapTime && bestLapTime ? (lap.LapTime - bestLapTime).toFixed(3) : null;
                  const compCol = getTyreColour(lap.Compound, year);
                  const isPitIn = lap.PitInTime !== null;
                  const isPitOut = lap.PitOutTime !== null;

                  return (
                    <tr
                      key={lap.LapNumber}
                      style={{
                        borderBottom: "1px solid #14141c",
                        background: isPB
                          ? "rgba(168, 85, 247, 0.08)"
                          : isPitIn || isPitOut
                          ? "rgba(245, 158, 11, 0.04)"
                          : idx % 2 === 0
                          ? "rgba(255,255,255,0.01)"
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: "#fff" }}>
                        {lap.LapNumber}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#bbb" }}>P{lap.Position ?? "—"}</td>
                      <td
                        style={{
                          padding: "8px 8px",
                          fontWeight: 700,
                          color: isPB ? "#c084fc" : "#eeeeef",
                        }}
                      >
                        {formatLapTime(lap.LapTime)} {isPB ? "★" : ""}
                      </td>
                      <td
                        style={{
                          padding: "8px 8px",
                          color: isPB ? "#c084fc" : "#888",
                        }}
                      >
                        {isPB ? "PB" : deltaToPB ? `+${deltaToPB}s` : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#aaa" }}>
                        {lap.Sector1Time ? lap.Sector1Time.toFixed(3) : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#aaa" }}>
                        {lap.Sector2Time ? lap.Sector2Time.toFixed(3) : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#aaa" }}>
                        {lap.Sector3Time ? lap.Sector3Time.toFixed(3) : "—"}
                      </td>
                      <td style={{ padding: "8px 8px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: compCol,
                            }}
                          />
                          <span style={{ color: compCol, fontWeight: 700 }}>
                            {getTyreShort(lap.Compound)}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: "8px 8px", color: "#aaa" }}>
                        {lap.TyreLife ? `${lap.TyreLife}L` : "1L"}
                      </td>
                      <td style={{ padding: "8px 8px", color: "#aaa" }}>Stint {lap.Stint || 1}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>
                        {isPitIn ? (
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "#f59e0b",
                              fontSize: 9,
                              fontWeight: 700,
                            }}
                          >
                            PIT IN
                          </span>
                        ) : isPitOut ? (
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: "rgba(56, 189, 248, 0.2)",
                              color: "#38bdf8",
                              fontSize: 9,
                              fontWeight: 700,
                            }}
                          >
                            PIT OUT
                          </span>
                        ) : (
                          <span style={{ color: "#444" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "24px 0", color: "#666" }}>
                    NO LAPS MATCH CURRENT FILTER
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
