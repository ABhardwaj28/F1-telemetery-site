import { useState } from "react";
import type { Calendar, ConstructorStanding, DriverStanding } from "../types";
import { TEAM_COLOURS } from "../data/loader";

interface ChampionshipPanelProps {
  calendar: Calendar;
  year: number;
}

// 2025 Initial / Current Championship dataset
const DRIVER_STANDINGS_2025: DriverStanding[] = [
  { position: 1, driver: "NOR", driverNumber: "4", driverName: "Lando Norris", nationality: "GBR", team: "McLaren", points: 285, wins: 5, podiums: 14, fastestLaps: 4, gapToLeader: 0 },
  { position: 2, driver: "VER", driverNumber: "1", driverName: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", points: 277, wins: 7, podiums: 13, fastestLaps: 3, gapToLeader: 8 },
  { position: 3, driver: "LEC", driverNumber: "16", driverName: "Charles Leclerc", nationality: "MON", team: "Ferrari", points: 245, wins: 3, podiums: 11, fastestLaps: 2, gapToLeader: 40 },
  { position: 4, driver: "PIA", driverNumber: "81", driverName: "Oscar Piastri", nationality: "AUS", team: "McLaren", points: 222, wins: 2, podiums: 8, fastestLaps: 2, gapToLeader: 63 },
  { position: 5, driver: "HAM", driverNumber: "44", driverName: "Lewis Hamilton", nationality: "GBR", team: "Ferrari", points: 190, wins: 2, podiums: 7, fastestLaps: 2, gapToLeader: 95 },
  { position: 6, driver: "RUS", driverNumber: "63", driverName: "George Russell", nationality: "GBR", team: "Mercedes", points: 175, wins: 1, podiums: 6, fastestLaps: 1, gapToLeader: 110 },
  { position: 7, driver: "SAI", driverNumber: "55", driverName: "Carlos Sainz", nationality: "ESP", team: "Williams", points: 78, wins: 0, podiums: 2, fastestLaps: 0, gapToLeader: 207 },
  { position: 8, driver: "ALO", driverNumber: "14", driverName: "Fernando Alonso", nationality: "ESP", team: "Aston Martin", points: 64, wins: 0, podiums: 1, fastestLaps: 0, gapToLeader: 221 },
  { position: 9, driver: "GAS", driverNumber: "10", driverName: "Pierre Gasly", nationality: "FRA", team: "Alpine", points: 42, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 243 },
  { position: 10, driver: "TSU", driverNumber: "22", driverName: "Yuki Tsunoda", nationality: "JPN", team: "Racing Bulls", points: 30, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 255 },
  { position: 11, driver: "ALB", driverNumber: "23", driverName: "Alexander Albon", nationality: "THA", team: "Williams", points: 28, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 257 },
  { position: 12, driver: "STR", driverNumber: "18", driverName: "Lance Stroll", nationality: "CAN", team: "Aston Martin", points: 26, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 259 },
  { position: 13, driver: "HUL", driverNumber: "27", driverName: "Nico Hülkenberg", nationality: "GER", team: "Kick Sauber", points: 22, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 263 },
  { position: 14, driver: "OCO", driverNumber: "31", driverName: "Esteban Ocon", nationality: "FRA", team: "Haas", points: 18, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 267 },
  { position: 15, driver: "BEA", driverNumber: "87", driverName: "Oliver Bearman", nationality: "GBR", team: "Haas", points: 12, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 273 },
  { position: 16, driver: "LAW", driverNumber: "30", driverName: "Liam Lawson", nationality: "NZL", team: "Racing Bulls", points: 10, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 275 },
  { position: 17, driver: "DOO", driverNumber: "7", driverName: "Jack Doohan", nationality: "AUS", team: "Alpine", points: 6, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 279 },
  { position: 18, driver: "ANT", driverNumber: "12", driverName: "Kimi Antonelli", nationality: "ITA", team: "Mercedes", points: 5, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 280 },
  { position: 19, driver: "BOR", driverNumber: "5", driverName: "Gabriel Bortoleto", nationality: "BRA", team: "Kick Sauber", points: 2, wins: 0, podiums: 0, fastestLaps: 0, gapToLeader: 283 },
];

const CONSTRUCTOR_STANDINGS_2025: ConstructorStanding[] = [
  { position: 1, team: "McLaren", points: 507, wins: 7, podiums: 22, gapToLeader: 0, drivers: ["NOR", "PIA"] },
  { position: 2, team: "Ferrari", points: 435, wins: 5, podiums: 18, gapToLeader: 72, drivers: ["LEC", "HAM"] },
  { position: 3, team: "Red Bull Racing", points: 310, wins: 7, podiums: 14, gapToLeader: 197, drivers: ["VER"] },
  { position: 4, team: "Mercedes", points: 180, wins: 1, podiums: 6, gapToLeader: 327, drivers: ["RUS", "ANT"] },
  { position: 5, team: "Williams", points: 106, wins: 0, podiums: 2, gapToLeader: 401, drivers: ["SAI", "ALB"] },
  { position: 6, team: "Aston Martin", points: 90, wins: 0, podiums: 1, gapToLeader: 417, drivers: ["ALO", "STR"] },
  { position: 7, team: "Alpine", points: 48, wins: 0, podiums: 0, gapToLeader: 459, drivers: ["GAS", "DOO"] },
  { position: 8, team: "Racing Bulls", points: 40, wins: 0, podiums: 0, gapToLeader: 467, drivers: ["TSU", "LAW"] },
  { position: 9, team: "Haas", points: 30, wins: 0, podiums: 0, gapToLeader: 477, drivers: ["OCO", "BEA"] },
  { position: 10, team: "Kick Sauber", points: 24, wins: 0, podiums: 0, gapToLeader: 483, drivers: ["HUL", "BOR"] },
];

export default function ChampionshipPanel({ calendar, year }: ChampionshipPanelProps) {
  const [tab, setTab] = useState<"drivers" | "constructors" | "calendar">("drivers");
  const maxDriverPts = DRIVER_STANDINGS_2025[0]?.points ?? 1;
  const maxConstructorPts = CONSTRUCTOR_STANDINGS_2025[0]?.points ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Championship Bar ── */}
      <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">FIA FORMULA ONE WORLD CHAMPIONSHIP · {year}</div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>CHAMPIONSHIP STANDINGS</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(["drivers", "constructors", "calendar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "#e10600" : "#1a1a1f",
                color: tab === t ? "#fff" : "#999",
                border: "1px solid #2a2a32",
                padding: "8px 16px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── DRIVERS STANDINGS TAB ── */}
      {tab === "drivers" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>DRIVERS' WORLD CHAMPIONSHIP</h2>
              <span>2025 SEASON DRIVER STANDINGS & POINTS SHARE</span>
            </div>
            <strong>{DRIVER_STANDINGS_2025.length} DRIVERS</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #22222a", color: "#777782", textAlign: "left", height: 38 }}>
                  <th style={{ padding: "0 16px", width: 45 }}>POS</th>
                  <th style={{ padding: "0 16px" }}>DRIVER</th>
                  <th style={{ padding: "0 16px" }}>TEAM</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>WINS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>PODIUMS</th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>GAP</th>
                  <th style={{ padding: "0 16px", width: 140, textAlign: "right" }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {DRIVER_STANDINGS_2025.map((d) => {
                  const teamCol = TEAM_COLOURS[d.team] ?? "#888";
                  const pct = (d.points / maxDriverPts) * 100;

                  return (
                    <tr
                      key={d.driver}
                      style={{
                        borderBottom: "1px solid #14141a",
                        height: 44,
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "0 16px", fontWeight: 700, color: d.position <= 3 ? "#f5c518" : "#888" }}>
                        {d.position}
                      </td>
                      <td style={{ padding: "0 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 3, height: 20, background: teamCol, borderRadius: 1 }} />
                          <div>
                            <span style={{ fontWeight: 700, color: "#fff", marginRight: 6 }}>{d.driver}</span>
                            <span style={{ color: "#777", fontSize: 10 }}>#{d.driverNumber} · {d.driverName}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0 16px", color: "#999" }}>{d.team}</td>
                      <td style={{ padding: "0 16px", textAlign: "center", fontWeight: d.wins ? 700 : 400, color: d.wins ? "#fff" : "#555" }}>
                        {d.wins || "—"}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "center", color: d.podiums ? "#fff" : "#555" }}>
                        {d.podiums || "—"}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "right", color: d.gapToLeader === 0 ? "#34d399" : "#666" }}>
                        {d.gapToLeader === 0 ? "LEADER" : `-${d.gapToLeader}`}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{d.points} PTS</span>
                          <div style={{ width: 100, height: 3, background: "#1c1c22", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: teamCol }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CONSTRUCTORS STANDINGS TAB ── */}
      {tab === "constructors" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>CONSTRUCTORS' WORLD CHAMPIONSHIP</h2>
              <span>2025 TEAM POINTS & PODIUM SHARE</span>
            </div>
            <strong>10 TEAMS</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #22222a", color: "#777782", textAlign: "left", height: 38 }}>
                  <th style={{ padding: "0 16px", width: 45 }}>POS</th>
                  <th style={{ padding: "0 16px" }}>TEAM</th>
                  <th style={{ padding: "0 16px" }}>DRIVERS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>WINS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>PODIUMS</th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>GAP</th>
                  <th style={{ padding: "0 16px", width: 150, textAlign: "right" }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {CONSTRUCTOR_STANDINGS_2025.map((c) => {
                  const teamCol = TEAM_COLOURS[c.team] ?? "#888";
                  const pct = (c.points / maxConstructorPts) * 100;

                  return (
                    <tr key={c.team} style={{ borderBottom: "1px solid #14141a", height: 46 }}>
                      <td style={{ padding: "0 16px", fontWeight: 700, color: c.position <= 3 ? "#f5c518" : "#888" }}>
                        {c.position}
                      </td>
                      <td style={{ padding: "0 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 4, height: 22, background: teamCol, borderRadius: 1 }} />
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: 12 }}>{c.team}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0 16px", color: "#888" }}>
                        {c.drivers.join(" · ")}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "center", fontWeight: c.wins ? 700 : 400, color: c.wins ? "#fff" : "#555" }}>
                        {c.wins || "—"}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "center", color: c.podiums ? "#fff" : "#555" }}>
                        {c.podiums || "—"}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "right", color: c.gapToLeader === 0 ? "#34d399" : "#666" }}>
                        {c.gapToLeader === 0 ? "LEADER" : `-${c.gapToLeader}`}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{c.points} PTS</span>
                          <div style={{ width: 120, height: 4, background: "#1c1c22", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: teamCol }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CALENDAR TAB ── */}
      {tab === "calendar" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>2025 FIA FORMULA 1 CALENDAR</h2>
              <span>FULL 24-ROUND SCHEDULE</span>
            </div>
            <strong>{calendar.length} RACES</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: "16px 20px" }}>
            {calendar.map((r) => (
              <div
                key={r.round}
                style={{
                  background: "#101014",
                  border: "1px solid #1f1f26",
                  borderRadius: 6,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 10, color: "#e10600", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>
                    ROUND {r.round}
                  </span>
                  {r.format === "sprint_qualifying" && (
                    <span style={{ fontSize: 9, background: "rgba(225,6,0,0.15)", color: "#e10600", padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>
                      SPRINT
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#eee" }}>{r.event}</div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{r.location}, {r.country}</div>
                </div>
                <div style={{ fontSize: 10, color: "#555", fontFamily: "IBM Plex Mono, monospace" }}>
                  {r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
