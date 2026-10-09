import type { SessionDriver, SessionLap } from "../types";
import { TEAM_COLOURS, getTyreColour, getTyreShort } from "../types";
import { formatLapTime, formatSector } from "../data/loader";

interface Props {
  drivers: SessionDriver[];
  laps: SessionLap[];
  sessionCode: string;
  onSelectDriver: (abbr: string) => void;
  selectedDriver: string;
  year?: number;
}

export default function SessionResults({
  drivers,
  laps,
  sessionCode,
  onSelectDriver,
  selectedDriver,
  year,
}: Props) {
  const isRace = sessionCode === "R" || sessionCode === "S";

  // Best lap per driver
  const bestLap = new Map<string, SessionLap>();
  for (const lap of laps) {
    if (!lap.LapTime || lap.Deleted) continue;
    const prev = bestLap.get(lap.Driver);
    if (!prev || lap.LapTime < prev.LapTime!) bestLap.set(lap.Driver, lap);
  }

  // Sort drivers: by position for race, by best lap for qualifying
  const sorted = [...drivers].sort((a, b) => {
    if (isRace) return (a.position ?? 99) - (b.position ?? 99);
    const aLap = bestLap.get(a.abbreviation);
    const bLap = bestLap.get(b.abbreviation);
    if (!aLap) return 1;
    if (!bLap) return -1;
    return aLap.LapTime! - bLap.LapTime!;
  });

  const bestOverall = [...bestLap.values()].reduce<SessionLap | null>(
    (acc, l) => (!acc || (l.LapTime ?? Infinity) < (acc.LapTime ?? Infinity) ? l : acc),
    null
  );

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-title">
        <div>
          <h2>
            {isRace ? "RACE CLASSIFICATION" : sessionCode === "Q" ? "QUALIFYING" : "RESULTS"}
          </h2>
          <span>
            {sorted.length} DRIVERS · CLICK TO ANALYSE TELEMETRY
          </span>
        </div>
        {bestOverall && (
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: "#55555b",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 7,
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              FASTEST LAP
            </div>
            <div
              style={{
                color: "#9b59b6",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {bestOverall.Driver} · {formatLapTime(bestOverall.LapTime)}
            </div>
          </div>
        )}
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 60px 1fr 90px 80px 80px 80px 50px",
          padding: "0 17px",
          height: 32,
          alignItems: "center",
          borderBottom: "1px solid #19191c",
        }}
      >
        {["POS", "DRIVER", "TEAM", "BEST LAP", "S1", "S2", "S3", "TYRE"].map(
          (h) => (
            <div
              key={h}
              style={{
                color: "#4f4f54",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 7,
                letterSpacing: "0.1em",
              }}
            >
              {h}
            </div>
          )
        )}
      </div>

      {/* Rows */}
      <div className="classification">
        {sorted.map((d, idx) => {
          const lap = bestLap.get(d.abbreviation);
          const teamCol = TEAM_COLOURS[d.team] ?? "#666";
          const isSel = d.abbreviation === selectedDriver;
          const isFastest =
            lap && bestOverall && lap.LapTime === bestOverall.LapTime;
          const tyreCol = getTyreColour(lap?.Compound, year);

          return (
            <div
              key={d.abbreviation}
              onClick={() => onSelectDriver(d.abbreviation)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 60px 1fr 90px 80px 80px 80px 50px",
                padding: "0 17px",
                height: 46,
                alignItems: "center",
                borderBottom: "1px solid #19191c",
                borderLeft: isSel ? `2px solid ${teamCol}` : "2px solid transparent",
                background: isSel ? "rgba(255,255,255,0.03)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {/* Position */}
              <div
                style={{
                  color: idx === 0 ? "#f5c518" : "#55555b",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {d.position ?? idx + 1}
              </div>

              {/* Driver */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 3,
                    height: 22,
                    background: teamCol,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "#eeeeef",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {d.abbreviation}
                </span>
              </div>

              {/* Team */}
              <div
                style={{
                  color: "#67676d",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {d.team}
              </div>

              {/* Best lap */}
              <div
                style={{
                  color: isFastest ? "#9b59b6" : "#eeeeef",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 10,
                  fontWeight: isFastest ? 700 : 400,
                }}
              >
                {formatLapTime(lap?.LapTime)}
              </div>

              {/* Sectors */}
              {[lap?.Sector1Time, lap?.Sector2Time, lap?.Sector3Time].map(
                (s, si) => (
                  <div
                    key={si}
                    style={{
                      color: "#77777d",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 9,
                    }}
                  >
                    {formatSector(s)}
                  </div>
                )
              )}

              {/* Tyre */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: tyreCol,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: tyreCol,
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 8,
                    fontWeight: 700,
                  }}
                >
                  {getTyreShort(lap?.Compound)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
