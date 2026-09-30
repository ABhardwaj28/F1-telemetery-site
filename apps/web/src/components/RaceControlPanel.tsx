import type { RaceControlMessage } from "../types";
import { FLAG_COLOURS, SESSION_NAME } from "../types";

interface Props {
  messages: RaceControlMessage[];
  year?: number;
  event?: string;
  sessionCode?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Flag: "🏁",
  SafetyCar: "🚗",
  Drs: "📡",
  Steward: "⚖️",
  Investigation: "🔍",
  Penalty: "⚠️",
  Weather: "🌧️",
  DriverRetirement: "🛑",
  TrackLimits: "📏",
  CarEvent: "🔧",
  Other: "📢",
};

export default function RaceControlPanel({
  messages,
  year = 2025,
  event = "Monaco Grand Prix",
  sessionCode = "R",
}: Props) {
  const isPreDigital = year < 1994;

  const eraTag = year >= 2010
    ? "FIA ELECTRONIC RACE CONTROL TELEMETRY FEED"
    : year >= 1994
    ? "FIA ARCHIVAL DIRECTIVES & TIMING STEWARDS LOG"
    : "HISTORICAL STEWARD BULLETINS & MARSHAL FLAG REPORTS";

  if (!messages || messages.length === 0) {
    return (
      <div className="panel" style={{ marginTop: 12, padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🚦</span>
          <div>
            <h2 style={{ fontSize: 18, color: "#ffffff", margin: 0 }}>RACE CONTROL DATA UNAVAILABLE</h2>
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
            {isPreDigital ? "VINTAGE ERA: PHYSICAL MARSHAL FLAGS ONLY" : "NO RECORDED INCIDENTS"}
          </div>
          <p style={{ margin: 0, color: "#b0b0be" }}>
            {isPreDigital
              ? `Electronic Race Control directive feeds and real-time steward telemetry channels did not exist in ${year}. Track marshals communicated via physical flags and landline radios around the circuit.`
              : `No official FIA race control messages or incidents were logged for this session.`}
          </p>
        </div>
      </div>
    );
  }

  // Deduplicate + reverse chronological
  const seen = new Set<string>();
  const unique = [...messages].reverse().filter((m) => {
    const key = `${m.Time}-${m.Message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-title" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2>RACE CONTROL DIRECTIVES & INCIDENTS</h2>
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
            {year} · {event} · {SESSION_NAME[sessionCode] ?? sessionCode} · {unique.length} DIRECTIVES
          </span>
        </div>
      </div>

      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {unique.map((m, i) => {
          const flagCol = m.Flag ? FLAG_COLOURS[m.Flag] ?? "#666" : "#444";
          const isFlag = m.Category === "Flag";
          const isSC =
            m.Message.includes("SAFETY CAR") ||
            m.Message.includes("VIRTUAL SAFETY CAR") ||
            m.Category === "SafetyCar";
          const isRed = isFlag && m.Flag === "RED";
          const isPenalty = m.Category === "Penalty" || m.Status === "PENALTY";

          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "65px 24px 1fr 65px",
                gap: 12,
                padding: "12px 18px",
                borderBottom: "1px solid #1a1a20",
                alignItems: "center",
                background: isRed
                  ? "rgba(225, 6, 0, 0.08)"
                  : isSC
                  ? "rgba(245, 197, 24, 0.05)"
                  : isPenalty
                  ? "rgba(255, 128, 0, 0.06)"
                  : "transparent",
              }}
            >
              {/* Lap / Time */}
              <div>
                <div
                  style={{
                    color: "#ffffff",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {m.Lap != null ? `LAP ${m.Lap}` : "PRE"}
                </div>
                <div
                  style={{
                    color: "#777782",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 8,
                  }}
                >
                  {m.Time}
                </div>
              </div>

              {/* Icon / Flag dot */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {isFlag && m.Flag ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: flagCol,
                      boxShadow: `0 0 6px ${flagCol}`,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 12 }}>
                    {CATEGORY_ICONS[m.Category] ?? "📢"}
                  </span>
                )}
              </div>

              {/* Message */}
              <div>
                <div
                  style={{
                    color: isRed
                      ? "#ff4d4d"
                      : isSC
                      ? "#f5c518"
                      : isPenalty
                      ? "#ff9f43"
                      : "#ffffff",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 10,
                    lineHeight: 1.4,
                    fontWeight: isSC || isRed || isPenalty ? 700 : 500,
                  }}
                >
                  {m.Message}
                </div>
                {m.RacingNumber && (
                  <span style={{ color: "#a0a0ab", fontSize: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                    DRIVER #{m.RacingNumber}
                  </span>
                )}
              </div>

              {/* Scope / Sector */}
              <div
                style={{
                  color: "#a0a0ab",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 8,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {m.Sector ? `SECTOR ${m.Sector}` : m.Scope ?? "TRACK"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
