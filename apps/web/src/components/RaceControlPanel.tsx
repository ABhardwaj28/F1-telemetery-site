import type { RaceControlMessage } from "../types";
import { FLAG_COLOURS } from "../types";

interface Props {
  messages: RaceControlMessage[];
}

const CATEGORY_ICONS: Record<string, string> = {
  Flag: "🏁",
  SafetyCar: "🚗",
  Drs: "📡",
  Steward: "⚖️",
  Other: "📢",
};

export default function RaceControlPanel({ messages }: Props) {
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
      <div className="panel-title">
        <div>
          <h2>RACE CONTROL</h2>
          <span>{messages.length} MESSAGES</span>
        </div>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {unique.map((m, i) => {
          const flagCol = m.Flag ? FLAG_COLOURS[m.Flag] ?? "#666" : "#444";
          const isFlag = m.Category === "Flag";
          const isSC =
            m.Message.includes("SAFETY CAR") ||
            m.Message.includes("VIRTUAL SAFETY CAR");

          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 20px 1fr 50px",
                gap: 10,
                padding: "10px 17px",
                borderBottom: "1px solid #19191c",
                alignItems: "flex-start",
                background: isSC
                  ? "rgba(245, 197, 24, 0.04)"
                  : "transparent",
              }}
            >
              {/* Lap */}
              <div
                style={{
                  color: "#55555b",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 8,
                  paddingTop: 1,
                }}
              >
                {m.Lap != null ? `LAP ${m.Lap}` : "—"}
              </div>

              {/* Flag dot */}
              <div style={{ paddingTop: 3 }}>
                {isFlag ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: flagCol,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 9 }}>
                    {CATEGORY_ICONS[m.Category] ?? "·"}
                  </span>
                )}
              </div>

              {/* Message */}
              <div
                style={{
                  color: isSC
                    ? "#f5c518"
                    : isFlag && m.Flag === "RED"
                    ? "#e10600"
                    : "#ccccce",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 9,
                  lineHeight: 1.5,
                  fontWeight: isSC || (isFlag && m.Flag === "RED") ? 600 : 400,
                }}
              >
                {m.Message}
                {m.RacingNumber && (
                  <span style={{ color: "#55555b" }}> · #{m.RacingNumber}</span>
                )}
              </div>

              {/* Sector */}
              <div
                style={{
                  color: "#55555b",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 7,
                  textAlign: "right",
                  paddingTop: 1,
                }}
              >
                {m.Sector ? `S${m.Sector}` : m.Scope ?? ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
