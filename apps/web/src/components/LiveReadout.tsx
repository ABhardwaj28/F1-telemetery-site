import { TYRE_COLOURS } from "../types";
import type { TelemetryPoint } from "../types";

interface Props {
  point: TelemetryPoint | null;
  lapTime: number;
  compound: string;
  tyreLife: number;
  lap: number;
}

function nearestTurn(dist: number, turns: { number: number; distance: number }[]) {
  if (!turns.length) return null;
  let best = turns[0];
  let bestDelta = Math.abs(turns[0].distance - dist);
  for (const t of turns) {
    const d = Math.abs(t.distance - dist);
    if (d < bestDelta) {
      bestDelta = d;
      best = t;
    }
  }
  return best;
}

interface LiveReadoutProps extends Props {
  turns: { number: number; distance: number }[];
}

export default function LiveReadout({ point, lapTime, compound, tyreLife, lap, turns }: LiveReadoutProps) {
  const nt = point ? nearestTurn(point.Distance, turns) : null;
  const tyreCol = TYRE_COLOURS[compound] ?? "#888";

  const cells = [
    {
      label: "DISTANCE",
      value: point ? `${point.Distance.toFixed(0)} m` : "— m",
      accent: false,
    },
    {
      label: "SPEED",
      value: point ? `${point.Speed.toFixed(0)} km/h` : "—",
      accent: false,
    },
    {
      label: "THROTTLE",
      value: point ? `${point.Throttle.toFixed(0)}%` : "—",
      accent: point ? point.Throttle > 80 : false,
    },
    {
      label: "BRAKE",
      value: point ? (point.Brake ? "ON" : "OFF") : "—",
      accent: point ? point.Brake : false,
      accentColor: "#e10600",
    },
    {
      label: "GEAR",
      value: point ? String(point.nGear) : "—",
      accent: false,
    },
    {
      label: "RPM",
      value: point ? Math.round(point.RPM).toLocaleString() : "—",
      accent: false,
    },
    {
      label: "DRS",
      value: point ? (point.DRS > 0 ? "OPEN" : "CLOSED") : "—",
      accent: point ? point.DRS > 0 : false,
      accentColor: "#34d399",
    },
    {
      label: "TURN",
      value: nt ? `T${String(nt.number).padStart(2, "0")}` : "—",
      accent: false,
    },
  ];

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      {/* Header */}
      <div className="panel-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2>LIVE READOUT</h2>
          <span>LAP {lap} · HOVER SPEED TRACE TO SCRUB</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {/* Lap time */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#55555b", fontFamily: "IBM Plex Mono, monospace", fontSize: 7, letterSpacing: "0.1em", marginBottom: 4 }}>LAP TIME</div>
            <div style={{ color: "#eeeeef", fontFamily: "IBM Plex Mono, monospace", fontSize: 15 }}>
              {lapTime ? `${Math.floor(lapTime / 60)}:${(lapTime % 60).toFixed(3).padStart(6, "0")}` : "—"}
            </div>
          </div>
          {/* Tyre */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#55555b", fontFamily: "IBM Plex Mono, monospace", fontSize: 7, letterSpacing: "0.1em", marginBottom: 4 }}>TYRE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: tyreCol, display: "inline-block" }} />
              <span style={{ color: tyreCol, fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700 }}>{compound}</span>
              <span style={{ color: "#55555b", fontFamily: "IBM Plex Mono, monospace", fontSize: 8 }}>({tyreLife}L)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="readout-grid">
        {cells.map((c) => (
          <div className="readout" key={c.label}>
            <span>{c.label}</span>
            <strong
              style={
                c.accent
                  ? { color: (c as { accentColor?: string }).accentColor ?? "#e10600" }
                  : {}
              }
            >
              {c.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
