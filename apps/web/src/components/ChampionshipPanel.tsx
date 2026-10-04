import { useEffect, useState } from "react";
import type { Calendar } from "../types";
import { TEAM_COLOURS, loadChampionshipStandings } from "../data/loader";
import type { ChampionshipStandings } from "../data/loader";

interface ChampionshipPanelProps {
  calendar: Calendar;
  year: number;
}

/** Drivers who switched teams have "A / B" — colour by their most recent team. */
function teamColour(team: string): string {
  return TEAM_COLOURS[team] ?? TEAM_COLOURS[team.split(" / ").pop() ?? ""] ?? "#888";
}

export default function ChampionshipPanel({ calendar, year }: ChampionshipPanelProps) {
  const [tab, setTab] = useState<"drivers" | "constructors" | "calendar">("drivers");
  const [standings, setStandings] = useState<ChampionshipStandings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadChampionshipStandings(year).then((s) => {
      if (cancelled) return;
      setStandings(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const driverStandings = standings?.drivers ?? [];
  const constructorStandings = standings?.constructors ?? [];

  const maxDriverPts = driverStandings[0]?.points || 1;
  const maxConstructorPts = constructorStandings[0]?.points || 1;
  const sourceLabel = loading
    ? "LOADING OFFICIAL STANDINGS…"
    : standings?.source === "jolpica"
    ? `OFFICIAL FIA CLASSIFICATION${standings.round ? ` · AFTER ROUND ${standings.round}` : ""}`
    : "OFFLINE — CACHED FINAL POINTS (WINS/PODIUMS UNAVAILABLE)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Championship Bar ── */}
      <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">FIA FORMULA ONE WORLD CHAMPIONSHIP · {year}</div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>CHAMPIONSHIP STANDINGS</h1>
          <div style={{ marginTop: 6, fontSize: 10, color: "#777782", fontFamily: "IBM Plex Mono, monospace" }}>
            {sourceLabel}
          </div>
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
              <span>{year} SEASON DRIVER STANDINGS & POINTS SHARE</span>
            </div>
            <strong>{driverStandings.length} DRIVERS</strong>
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
                {driverStandings.map((d) => {
                  const teamCol = teamColour(d.team);
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
                            <span style={{ color: "#777", fontSize: 10 }}>
                              {d.driverNumber ? `#${d.driverNumber} · ` : ""}
                              {d.driverName}
                            </span>
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
              <span>{year} TEAM POINTS & PODIUM SHARE</span>
            </div>
            <strong>{constructorStandings.length} TEAMS</strong>
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
                {!loading && constructorStandings.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "24px 16px", color: "#777", textAlign: "center" }}>
                      {year < 1958
                        ? "The Constructors' Championship was first awarded in 1958."
                        : "Constructor standings unavailable."}
                    </td>
                  </tr>
                )}
                {constructorStandings.map((c) => {
                  const teamCol = teamColour(c.team);
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

      {/* ── CALENDAR TAB ── */}
      {tab === "calendar" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>{year} FORMULA 1 CALENDAR</h2>
              <span>OFFICIAL GRAND PRIX SCHEDULE ({calendar.length} ROUNDS)</span>
            </div>
            <strong>{calendar.length} ROUNDS</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #22222a", color: "#777782", textAlign: "left", height: 38 }}>
                  <th style={{ padding: "0 16px", width: 50 }}>RND</th>
                  <th style={{ padding: "0 16px" }}>GRAND PRIX</th>
                  <th style={{ padding: "0 16px" }}>LOCATION</th>
                  <th style={{ padding: "0 16px" }}>COUNTRY</th>
                  <th style={{ padding: "0 16px" }}>DATE</th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>FORMAT</th>
                </tr>
              </thead>
              <tbody>
                {calendar.map((r) => (
                  <tr key={r.round} style={{ borderBottom: "1px solid #14141a", height: 42 }}>
                    <td style={{ padding: "0 16px", color: "#e10600", fontWeight: 700 }}>
                      R{r.round}
                    </td>
                    <td style={{ padding: "0 16px", fontWeight: 600, color: "#fff" }}>
                      {r.event}
                    </td>
                    <td style={{ padding: "0 16px", color: "#aaa" }}>
                      {r.location}
                    </td>
                    <td style={{ padding: "0 16px", color: "#888" }}>
                      {r.country}
                    </td>
                    <td style={{ padding: "0 16px", color: "#888" }}>
                      {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "0 16px", textAlign: "right" }}>
                      <span
                        style={{
                          background: r.format === "sprint_qualifying" ? "rgba(245, 197, 24, 0.15)" : "rgba(255,255,255,0.05)",
                          color: r.format === "sprint_qualifying" ? "#f5c518" : "#888",
                          padding: "2px 6px",
                          borderRadius: 2,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        {r.format === "sprint_qualifying" ? "SPRINT" : "CONVENTIONAL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
