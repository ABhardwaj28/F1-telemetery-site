import { useState } from "react";
import type { HistoricalChampion, HistoricalEra } from "../types";

const ERAS: HistoricalEra[] = [
  {
    id: "ground_effect",
    name: "Ground Effect & Venturi Tunnels",
    years: "2022 – 2025",
    regulations: "1.6L V6 Turbo Hybrid + 3D Shaped Venturi Floors + 18-inch Pirelli Tyres",
    keyFeature: "Aerodynamic downforce generated through underbody ground effects to promote closer racing.",
    iconicCars: ["Red Bull RB19 / RB20", "McLaren MCL38", "Ferrari F1-75 / SF-24"],
  },
  {
    id: "turbo_hybrid",
    name: "Turbo-Hybrid Dominance Era",
    years: "2014 – 2021",
    regulations: "1.6L Turbocharged V6 + MGU-K + MGU-H (50%+ Thermal Efficiency)",
    keyFeature: "The most thermally efficient, technologically advanced powertrains in motorsport history.",
    iconicCars: ["Mercedes W11 (Fastest ever F1 car)", "Red Bull RB16B", "Ferrari SF70H"],
  },
  {
    id: "v8_era",
    name: "High-Revving 2.4L V8 Era",
    years: "2006 – 2013",
    regulations: "2.4L Naturally Aspirated V8 (18,000 RPM) + KERS (from 2009) + Blown Diffusers",
    keyFeature: "Blown exhaust diffusers, ultra-responsive high-RPM screamers and the introduction of DRS.",
    iconicCars: ["Red Bull RB9", "Brawn BGP 001", "McLaren MP4-23", "Ferrari F2007"],
  },
  {
    id: "v10_era",
    name: "Golden V10 Era (900+ HP)",
    years: "1995 – 2005",
    regulations: "3.0L Naturally Aspirated V10 (20,000 RPM, ~950 HP)",
    keyFeature: "Unrestricted engine development, tyre wars (Bridgestone vs Michelin), and pure mechanical & aero grip.",
    iconicCars: ["Ferrari F2004 (Lap Record King)", "McLaren MP4-20", "Renault R25", "Williams FW26"],
  },
  {
    id: "classic_era",
    name: "Classic & Turbo Monsters Era",
    years: "1950 – 1994",
    regulations: "1.5L Turbo (1400+ HP in Quali) to 3.5L V12 / V10 Engines",
    keyFeature: "Manual sequential gearboxes, ground effects inception, manual aero wings, and legendary bravery.",
    iconicCars: ["McLaren MP4/4 (15/16 wins in 1988)", "Lotus 72 & 79", "Williams FW14B (Active Suspension)"],
  },
];

const ALL_TIME_CHAMPIONS: HistoricalChampion[] = [
  { year: 2024, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda RBPT", points: 429, wins: 9, poles: 8 },
  { year: 2023, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda RBPT", points: 575, wins: 19, poles: 12 },
  { year: 2022, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Red Bull Powertrains", points: 454, wins: 15, poles: 7 },
  { year: 2021, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda", points: 395.5, wins: 10, poles: 10 },
  { year: 2020, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 347, wins: 11, poles: 10 },
  { year: 2019, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 413, wins: 11, poles: 5 },
  { year: 2018, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 408, wins: 11, poles: 11 },
  { year: 2017, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 363, wins: 9, poles: 11 },
  { year: 2016, driver: "Nico Rosberg", nationality: "GER", team: "Mercedes", engine: "Mercedes", points: 385, wins: 9, poles: 8 },
  { year: 2015, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 381, wins: 10, poles: 11 },
  { year: 2014, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 384, wins: 11, poles: 7 },
  { year: 2013, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 397, wins: 13, poles: 9 },
  { year: 2012, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 281, wins: 5, poles: 6 },
  { year: 2011, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 392, wins: 11, poles: 15 },
  { year: 2010, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 256, wins: 5, poles: 10 },
  { year: 2008, driver: "Lewis Hamilton", nationality: "GBR", team: "McLaren", engine: "Mercedes", points: 98, wins: 5, poles: 7 },
  { year: 2007, driver: "Kimi Räikkönen", nationality: "FIN", team: "Ferrari", engine: "Ferrari", points: 110, wins: 6, poles: 3 },
  { year: 2006, driver: "Fernando Alonso", nationality: "ESP", team: "Renault", engine: "Renault", points: 134, wins: 7, poles: 6 },
  { year: 2005, driver: "Fernando Alonso", nationality: "ESP", team: "Renault", engine: "Renault", points: 133, wins: 7, poles: 6 },
  { year: 2004, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 148, wins: 13, poles: 8 },
];

const ALL_TIME_RECORDS = [
  { record: "Most World Championships", holder: "Michael Schumacher & Lewis Hamilton", value: "7 Titles", detail: "Schumacher (1994-2004), Hamilton (2008-2020)" },
  { record: "Most Grand Prix Victories", holder: "Lewis Hamilton", value: "105 Wins", detail: "350+ Race Starts (30.0% Win Rate)" },
  { record: "Most Pole Positions", holder: "Lewis Hamilton", value: "104 Poles", detail: "Record held across 18 consecutive seasons" },
  { record: "Most Wins in a Single Season", holder: "Max Verstappen", value: "19 Wins (2023)", detail: "86.4% win percentage in a single calendar year" },
  { record: "Most Consecutive GP Wins", holder: "Max Verstappen", value: "10 Wins (2023)", detail: "Miami GP 2023 to Italian GP 2023" },
  { record: "Most Podiums in F1 History", holder: "Lewis Hamilton", value: "201 Podiums", detail: "First driver to surpass 200 podium finishes" },
  { record: "Most Fastest Laps", holder: "Michael Schumacher", value: "77 Laps", detail: "Followed by Lewis Hamilton (67) & Kimi Räikkönen (46)" },
];

export default function HistoricalPanel() {
  const [selectedEra, setSelectedEra] = useState<string>("ground_effect");
  const currentEra = ERAS.find((e) => e.id === selectedEra) ?? ERAS[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Hero ── */}
      <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">FORMULA 1 ARCHIVES · 1950 – 2025</div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>HISTORICAL F1 DATABASE</h1>
        </div>
        <div className="hero-metrics">
          <div className="metric"><span>SEASONS</span><strong>75</strong></div>
          <div className="metric"><span>WORLD CHAMPIONS</span><strong>34</strong></div>
          <div className="metric"><span>GRAND PRIX RACES</span><strong>1,120+</strong></div>
        </div>
      </div>

      {/* ── Era Navigator ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>TECHNICAL REGULATION ERAS</h2>
            <span>SELECT AN ERA TO EXPLORE POWERTRAIN SPECS & ICONIC CARS</span>
          </div>
        </div>

        {/* Era selector tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 20px 16px" }}>
          {ERAS.map((era) => (
            <button
              key={era.id}
              onClick={() => setSelectedEra(era.id)}
              style={{
                background: selectedEra === era.id ? "#e10600" : "#131318",
                color: selectedEra === era.id ? "#fff" : "#999",
                border: "1px solid #252530",
                padding: "8px 16px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {era.name} ({era.years})
            </button>
          ))}
        </div>

        {/* Era detail card */}
        <div style={{ padding: "16px 20px", background: "#0c0c10", borderTop: "1px solid #1c1c24" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#888892", letterSpacing: "0.08em" }}>POWERTRAIN & REGS</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginTop: 4 }}>{currentEra.regulations}</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 8 }}>{currentEra.keyFeature}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#888892", letterSpacing: "0.08em" }}>ICONIC CHAMPIONSHIP CARS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {currentEra.iconicCars.map((c) => (
                  <span key={c} style={{ background: "#1b1b22", padding: "4px 10px", borderRadius: 4, fontSize: 11, color: "#eee", fontFamily: "IBM Plex Mono, monospace" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── All Time Records Grid ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>ALL-TIME FORMULA 1 RECORDS</h2>
            <span>HISTORIC PINNACLES OF PERFORMANCE</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, padding: "16px 20px" }}>
          {ALL_TIME_RECORDS.map((rec) => (
            <div key={rec.record} style={{ background: "#101015", border: "1px solid #1f1f28", borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "#888892", letterSpacing: "0.08em", textTransform: "uppercase" }}>{rec.record}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f5c518", fontFamily: "IBM Plex Mono, monospace", margin: "6px 0 2px" }}>
                {rec.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{rec.holder}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{rec.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── World Champions Roll of Honour ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>MODERN WORLD CHAMPIONS (2004 – 2024)</h2>
            <span>TITLE WINNERS, ENGINE SUPPLIERS & SEASON TOTALS</span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #22222a", color: "#777782", textAlign: "left", height: 38 }}>
                <th style={{ padding: "0 16px", width: 70 }}>SEASON</th>
                <th style={{ padding: "0 16px" }}>WORLD CHAMPION</th>
                <th style={{ padding: "0 16px" }}>TEAM</th>
                <th style={{ padding: "0 16px" }}>ENGINE</th>
                <th style={{ padding: "0 16px", textAlign: "center" }}>WINS</th>
                <th style={{ padding: "0 16px", textAlign: "center" }}>POLES</th>
                <th style={{ padding: "0 16px", textAlign: "right" }}>POINTS</th>
              </tr>
            </thead>
            <tbody>
              {ALL_TIME_CHAMPIONS.map((c) => (
                <tr key={c.year} style={{ borderBottom: "1px solid #14141a", height: 42 }}>
                  <td style={{ padding: "0 16px", fontWeight: 700, color: "#e10600" }}>{c.year}</td>
                  <td style={{ padding: "0 16px", fontWeight: 700, color: "#fff" }}>
                    {c.driver} <span style={{ color: "#777", fontWeight: 400, fontSize: 10 }}>({c.nationality})</span>
                  </td>
                  <td style={{ padding: "0 16px", color: "#aaa" }}>{c.team}</td>
                  <td style={{ padding: "0 16px", color: "#777" }}>{c.engine}</td>
                  <td style={{ padding: "0 16px", textAlign: "center", color: "#fff", fontWeight: 700 }}>{c.wins}</td>
                  <td style={{ padding: "0 16px", textAlign: "center", color: "#bbb" }}>{c.poles}</td>
                  <td style={{ padding: "0 16px", textAlign: "right", color: "#f5c518", fontWeight: 700 }}>{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
