import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Calendar,
  CalendarRace,
  CircuitData,
  LapTelemetry,
  RaceControlMessage,
  SessionDriver,
  SessionLap,
  TelemetryPoint,
  WeatherPoint,
} from "./types";
import { ALL_SUPPORTED_YEARS, getHistoricalCalendar } from "./data/historicalSeasons";
import { TEAM_COLOURS, TYRE_COLOURS, eventToCircuitSlug, SESSION_NAME } from "./data/loader";
import {
  loadCalendar,
  loadCircuit,
  loadRaceControl,
  loadSessionDrivers,
  loadSessionLaps,
  loadTelemetry,
  loadWeather,
  lapsForDriver,
  formatLapTime,
} from "./data/loader";
import TrackMap from "./components/TrackMap";
import SpeedTrace from "./components/SpeedTrace";
import LiveReadout from "./components/LiveReadout";
import SessionResults from "./components/SessionResults";
import RaceControlPanel from "./components/RaceControlPanel";
import WeatherPanel from "./components/WeatherPanel";
import DriverComparison from "./components/DriverComparison";
import StrategyPanel from "./components/StrategyPanel";
import ChampionshipPanel from "./components/ChampionshipPanel";
import HistoricalPanel from "./components/HistoricalPanel";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Race Explorer", icon: "🏁" },
  { label: "Driver Comparison", icon: "⚔️" },
  { label: "Strategy & Laps", icon: "⏱️" },
  { label: "Race Control", icon: "🚦" },
  { label: "Weather", icon: "🌡" },
  { label: "Championship", icon: "🏆" },
  { label: "Historical F1", icon: "📖" },
];

// ─── Initial State from URL / Storage ─────────────────────────────────────────
function getInitialAppState() {
  if (typeof window === "undefined") {
    return {
      page: "Race Explorer",
      year: 2025,
      raceEvent: null as string | null,
      sessionCode: "R",
      driver: "NOR",
      lap: 1,
      driverB: "VER",
      lapB: 1,
    };
  }

  const params = new URLSearchParams(window.location.search);
  let localData: any = {};
  try {
    const raw = localStorage.getItem("f1_app_state");
    if (raw) localData = JSON.parse(raw);
  } catch {}

  const validPages = [
    "Race Explorer",
    "Driver Comparison",
    "Strategy & Laps",
    "Race Control",
    "Weather",
    "Championship",
    "Historical F1",
  ];
  const rawPage = params.get("tab") || localData.page || "Race Explorer";
  const page = validPages.includes(rawPage) ? rawPage : "Race Explorer";

  const rawYear = params.get("year") ? Number(params.get("year")) : localData.year;
  const year = rawYear && ALL_SUPPORTED_YEARS.includes(rawYear) ? rawYear : 2025;

  const raceEvent = params.get("race") || localData.raceEvent || null;
  const sessionCode = params.get("session") || localData.sessionCode || "R";
  const driver = params.get("driver") || localData.driver || "NOR";
  const lap = params.get("lap") ? Number(params.get("lap")) : (localData.lap || 1);
  const driverB = params.get("driverB") || localData.driverB || "VER";
  const lapB = params.get("lapB") ? Number(params.get("lapB")) : (localData.lapB || 1);

  return { page, year, raceEvent, sessionCode, driver, lap, driverB, lapB };
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const initial = useMemo(() => getInitialAppState(), []);
  const initialCalendar = useMemo(() => getHistoricalCalendar(initial.year), [initial.year]);
  const initialRace = useMemo(() => {
    if (initial.raceEvent) {
      const match =
        initialCalendar.find((r) => r.event.toLowerCase() === initial.raceEvent!.toLowerCase()) ||
        initialCalendar.find((r) => r.event.toLowerCase().includes(initial.raceEvent!.toLowerCase())) ||
        initialCalendar.find((r) => initial.raceEvent!.toLowerCase().includes(r.event.toLowerCase()));
      if (match) return match;
    }
    const monaco = initialCalendar.find((r) => r.event.toLowerCase().includes("monaco"));
    return monaco ?? initialCalendar[0] ?? null;
  }, [initialCalendar, initial.raceEvent]);

  const initialTargetRaceRef = useRef<string | null>(initial.raceEvent);
  const initialTargetDriverRef = useRef<string | null>(initial.driver);
  const initialTargetLapRef = useRef<number | null>(initial.lap);
  const initialTargetDriverBRef = useRef<string | null>(initial.driverB);
  const initialTargetLapBRef = useRef<number | null>(initial.lapB);

  const [page, setPage] = useState(initial.page);

  // ── Selection ──────────────────────────────────────────────────────────
  const [calendar, setCalendar] = useState<Calendar>(initialCalendar);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedRace, setSelectedRace] = useState<CalendarRace | null>(initialRace);
  const [selectedSessionCode, setSelectedSessionCode] = useState(initial.sessionCode);
  const [selectedDriver, setSelectedDriver] = useState(initial.driver);
  const [selectedLap, setSelectedLap] = useState(initial.lap);
  const [selectedDriverB, setSelectedDriverB] = useState(initial.driverB);
  const [selectedLapB, setSelectedLapB] = useState(initial.lapB);
  const [cursorIndex, setCursorIndex] = useState(0);

  // ── Session data ───────────────────────────────────────────────────────
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [sessionLaps, setSessionLaps] = useState<SessionLap[]>([]);
  const [raceControl, setRaceControl] = useState<RaceControlMessage[]>([]);
  const [weather, setWeather] = useState<WeatherPoint[]>([]);

  // ── Telemetry data ─────────────────────────────────────────────────────
  const [circuit, setCircuit] = useState<CircuitData | null>(null);
  const [telemetry, setTelemetry] = useState<LapTelemetry | null>(null);
  const [telemetryB, setTelemetryB] = useState<LapTelemetry | null>(null);
  const [hasTelemetry, setHasTelemetry] = useState(false);

  // ── Loading / error states ─────────────────────────────────────────────
  const [calLoading, setCalLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [telLoading, setTelLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ── Sync URL & LocalStorage on state updates (only after initial load) ───
  useEffect(() => {
    if (calLoading || !selectedRace) return;

    const params = new URLSearchParams();
    params.set("tab", page);
    params.set("year", String(selectedYear));
    params.set("race", selectedRace.event);
    params.set("session", selectedSessionCode);
    params.set("driver", selectedDriver);
    params.set("lap", String(selectedLap));
    params.set("driverB", selectedDriverB);
    params.set("lapB", String(selectedLapB));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);

    try {
      localStorage.setItem(
        "f1_app_state",
        JSON.stringify({
          page,
          year: selectedYear,
          raceEvent: selectedRace.event,
          sessionCode: selectedSessionCode,
          driver: selectedDriver,
          lap: selectedLap,
          driverB: selectedDriverB,
          lapB: selectedLapB,
        })
      );
    } catch {}
  }, [
    page,
    selectedYear,
    selectedRace,
    selectedSessionCode,
    selectedDriver,
    selectedLap,
    selectedDriverB,
    selectedLapB,
    calLoading,
  ]);

  // ── Load calendar when selectedYear changes ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCalLoading(true);

    loadCalendar(selectedYear)
      .then((cal) => {
        if (cancelled) return;
        setCalendar(cal);

        setSelectedRace((prevRace) => {
          if (!cal || cal.length === 0) return null;
          const targetName = initialTargetRaceRef.current || prevRace?.event;
          if (initialTargetRaceRef.current) {
            initialTargetRaceRef.current = null; // consume once
          }
          if (targetName) {
            const match =
              cal.find((r) => r.event.toLowerCase() === targetName.toLowerCase()) ||
              cal.find((r) => r.event.toLowerCase().includes(targetName.toLowerCase())) ||
              cal.find((r) => targetName.toLowerCase().includes(r.event.toLowerCase()));
            if (match) return match;
          }
          const monaco = cal.find((r) => r.event.toLowerCase().includes("monaco"));
          return monaco ?? cal[0] ?? null;
        });
        setCalLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  // ── Load session data when race / session / year changes ───────────────
  useEffect(() => {
    if (!selectedRace) return;
    let cancelled = false;

    setSessionLoading(true);
    setSessionError(null);

    Promise.allSettled([
      loadSessionDrivers(selectedYear, selectedRace.event, selectedSessionCode),
      loadSessionLaps(selectedYear, selectedRace.event, selectedSessionCode),
      loadRaceControl(selectedYear, selectedRace.event, selectedSessionCode),
      loadWeather(selectedYear, selectedRace.event, selectedSessionCode),
    ]).then(([dr, lp, rc, wx]) => {
      if (cancelled) return;

      if (dr.status === "fulfilled") {
        const dList = dr.value;
        setDrivers(dList);

        if (dList.length > 0) {
          const targetA = initialTargetDriverRef.current;
          if (initialTargetDriverRef.current) initialTargetDriverRef.current = null;

          const targetB = initialTargetDriverBRef.current;
          if (initialTargetDriverBRef.current) initialTargetDriverBRef.current = null;

          setSelectedDriver((currA: string) => {
            const desired = targetA || currA;
            const hasA = dList.some((d) => d.abbreviation === desired);
            return hasA ? desired : dList[0].abbreviation;
          });

          setSelectedDriverB((currB: string) => {
            const desired = targetB || currB;
            const hasB = dList.some((d) => d.abbreviation === desired);
            return hasB ? desired : (dList[1]?.abbreviation ?? dList[0].abbreviation);
          });
        }
      }

      if (lp.status === "fulfilled") {
        setSessionLaps(lp.value);
        if (initialTargetLapRef.current) {
          setSelectedLap(initialTargetLapRef.current);
          initialTargetLapRef.current = null;
        }
        if (initialTargetLapBRef.current) {
          setSelectedLapB(initialTargetLapBRef.current);
          initialTargetLapBRef.current = null;
        }
      }

      if (rc.status === "fulfilled") setRaceControl(rc.value);
      if (wx.status === "fulfilled") setWeather(wx.value);
      if (dr.status === "rejected") setSessionError("Session data not available.");

      setSessionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedRace, selectedSessionCode, selectedYear]);

  // ── Load circuit when race changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedRace) {
      setCircuit(null);
      return;
    }
    let cancelled = false;
    const slug = eventToCircuitSlug(selectedRace.event);
    setHasTelemetry(true);

    loadCircuit(slug).then((c) => {
      if (!cancelled) setCircuit(c);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedRace]);

  // ── Load telemetry when driver / lap / session / race changes ──────────
  useEffect(() => {
    if (!selectedRace || !hasTelemetry || !selectedDriver) {
      setTelemetry(null);
      return;
    }
    let cancelled = false;
    const slug = eventToCircuitSlug(selectedRace.event);
    setTelLoading(true);

    loadTelemetry(selectedYear, slug, selectedDriver, selectedLap, selectedSessionCode)
      .then((t) => {
        if (cancelled) return;
        setTelemetry(t);
        setCursorIndex(0);
        setTelLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTelemetry(null);
        setTelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRace, selectedDriver, selectedLap, hasTelemetry, selectedYear, selectedSessionCode]);

  // ── Load telemetry for Driver B ───────────────────────────────────────
  useEffect(() => {
    if (!selectedRace || !hasTelemetry || !selectedDriverB) {
      setTelemetryB(null);
      return;
    }
    let cancelled = false;
    const slug = eventToCircuitSlug(selectedRace.event);

    loadTelemetry(selectedYear, slug, selectedDriverB, selectedLapB, selectedSessionCode)
      .then((t) => {
        if (!cancelled) setTelemetryB(t);
      })
      .catch(() => {
        if (!cancelled) setTelemetryB(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRace, selectedDriverB, selectedLapB, hasTelemetry, selectedYear, selectedSessionCode]);

  // ── Derived ────────────────────────────────────────────────────────────
  const trackLength = circuit?.length_m ?? 3293;
  const trackPoints = circuit?.track ?? [];
  const turns = circuit?.turns ?? [];
  const telemetryPoints: TelemetryPoint[] = useMemo(
    () => telemetry?.telemetry.data ?? [],
    [telemetry]
  );

  const carTrackIndex = useMemo(() => {
    if (!telemetryPoints.length || !trackPoints.length) return 0;
    const dist = telemetryPoints[cursorIndex]?.Distance ?? 0;
    let best = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < trackPoints.length; i++) {
      const d = Math.abs(trackPoints[i].distance - dist);
      if (d < bestDelta) { bestDelta = d; best = i; }
    }
    return best;
  }, [cursorIndex, telemetryPoints, trackPoints]);

  const currentPoint = telemetryPoints[cursorIndex] ?? null;
  const topSpeed = useMemo(() => Math.max(...telemetryPoints.map((p) => p.Speed), 0), [telemetryPoints]);
  const avgSpeed = useMemo(() => {
    if (!telemetryPoints.length) return 0;
    return telemetryPoints.reduce((a, p) => a + p.Speed, 0) / telemetryPoints.length;
  }, [telemetryPoints]);

  // Driver laps for lap selector
  const driverLaps = useMemo(
    () => lapsForDriver(sessionLaps, selectedDriver),
    [sessionLaps, selectedDriver]
  );

  const driverLapsB = useMemo(
    () => lapsForDriver(sessionLaps, selectedDriverB),
    [sessionLaps, selectedDriverB]
  );

  const handleCursorChange = useCallback((i: number) => setCursorIndex(i), []);

  const handleSelectDriver = useCallback((abbr: string) => {
    setSelectedDriver(abbr);
    setSelectedLap(1);
  }, []);

  // ── Session tabs for selected race ────────────────────────────────────
  const sessionTabs = selectedRace?.sessions ?? [];

  // ── Topbar breadcrumb ─────────────────────────────────────────────────
  const breadcrumb = [
    String(selectedYear),
    selectedRace?.event ?? "—",
    SESSION_NAME[selectedSessionCode] ?? selectedSessionCode,
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  function renderRaceExplorer() {
    const circuitSlug = selectedRace ? eventToCircuitSlug(selectedRace.event) : "";
    const teamCol = TEAM_COLOURS[drivers.find((d) => d.abbreviation === selectedDriver)?.team ?? ""] ?? "#e10600";
    const isQuali = selectedSessionCode === "Q" || selectedSessionCode === "SQ" || selectedSessionCode === "Qualifying";
    const lapTag = isQuali
      ? ((selectedLap - 1) % 4 === 0
          ? "OUT-LAP (WARMUP)"
          : (selectedLap - 1) % 4 === 1
          ? "FLYING SHOOTOUT (MAX ATTACK)"
          : (selectedLap - 1) % 4 === 2
          ? "RECHARGE / COOL-DOWN"
          : "FLYING PUSH 2")
      : (selectedLap === 1 ? "RACE START (HEAVY FUEL)" : `RACE STINT · TYRE LIFE ${(selectedLap % 20) + 1}L`);

    return (
      <>
        {/* ── Hero ── */}
        <div className="hero-section">
          <div>
            <div className="eyebrow">
              {selectedYear} / {selectedRace?.event?.toUpperCase() ?? "—"} / {SESSION_NAME[selectedSessionCode] ?? selectedSessionCode}
            </div>
            <h1>
              {selectedRace?.location?.toUpperCase() ?? "—"}
              <span>{selectedRace?.country ?? ""}</span>
            </h1>
            <p>
              {hasTelemetry
                ? `REAL FASTF1 DATA · ${selectedDriver} · LAP ${selectedLap} (${lapTag}) · ${isQuali ? "50Hz RAW UNCOMPRESSED" : "10Hz COMPRESSED"}`
                : `SESSION DATA · ${drivers.length} DRIVERS`}
            </p>
          </div>
          <div className="hero-metrics">
            {hasTelemetry && telemetry ? (
              <>
                <div className="metric">
                  <span>LAP TIME</span>
                  <strong>{formatLapTime(telemetry.lap_time)}</strong>
                </div>
                <div className="metric">
                  <span>TOP SPEED</span>
                  <strong>{topSpeed.toFixed(0)} km/h</strong>
                </div>
                <div className="metric">
                  <span>AVG SPEED</span>
                  <strong>{avgSpeed.toFixed(0)} km/h</strong>
                </div>
                <div className="metric">
                  <span>TYRE</span>
                  <strong style={{ color: TYRE_COLOURS[telemetry.compound] ?? "#888" }}>
                    {telemetry.compound}
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="metric">
                  <span>ROUND</span>
                  <strong>{selectedRace?.round ?? "—"}</strong>
                </div>
                <div className="metric">
                  <span>DATE</span>
                  <strong>
                    {selectedRace?.date
                      ? new Date(selectedRace.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "—"}
                  </strong>
                </div>
                <div className="metric">
                  <span>DRIVERS</span>
                  <strong>{drivers.length || "—"}</strong>
                </div>
                <div className="metric">
                  <span>FORMAT</span>
                  <strong>{selectedRace?.format === "sprint_qualifying" ? "SPRINT" : "CONV"}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {sessionLoading ? (
          <div className="loading-box"><div className="loader" /><span>LOADING SESSION DATA…</span></div>
        ) : sessionError ? (
          <div className="error-box"><strong>NO DATA</strong><span>{sessionError}</span></div>
        ) : (
          <>
            {/* ── Telemetry panels (Monaco only for now) ── */}
            {hasTelemetry && (
              <div className="main-grid">
                {/* Speed trace */}
                <div className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>SPEED TRACE</h2>
                      <span>LAP {selectedLap} · {lapTag} · {isQuali ? "50Hz RAW CAN STREAM" : "10Hz COMPRESSED"}</span>
                    </div>
                    <strong style={{ color: teamCol }}>{selectedDriver}</strong>
                  </div>
                  {telLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 350 }}>
                      <div className="loader" />
                    </div>
                  ) : telemetryPoints.length ? (
                    <SpeedTrace
                      data={telemetryPoints}
                      turns={turns}
                      trackLength={trackLength}
                      onCursorChange={handleCursorChange}
                      cursorIndex={cursorIndex}
                      color={teamCol}
                      sessionCode={selectedSessionCode}
                    />
                  ) : (
                    <div className="empty-state">NO TELEMETRY FOR LAP {selectedLap}</div>
                  )}
                </div>

                {/* Track map */}
                <div className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>TRACK MAP</h2>
                      <span>{circuitSlug.toUpperCase()} · {circuit?.turn_count ?? "—"} TURNS</span>
                    </div>
                    <strong>{circuit ? `${circuit.point_count} PTS` : "—"}</strong>
                  </div>
                  <div className="track-container">
                    {circuit ? (
                      <>
                        <TrackMap
                          trackPoints={trackPoints}
                          turns={turns}
                          carIndex={carTrackIndex}
                          trackLength={trackLength}
                        />
                        <div className="map-info">
                          <div><span>CIRCUIT</span><strong>{circuit.circuit}</strong></div>
                          <div><span>LENGTH</span><strong>{(trackLength / 1000).toFixed(3)} km</strong></div>
                          <div><span>TURNS</span><strong>{circuit.turn_count}</strong></div>
                          <div><span>SOURCE</span><strong>FastF1</strong></div>
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">CIRCUIT DATA LOADING…</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Live Readout (only when telemetry available) ── */}
            {hasTelemetry && (
              <LiveReadout
                point={currentPoint}
                lapTime={telemetry?.lap_time ?? 0}
                compound={telemetry?.compound ?? "—"}
                tyreLife={telemetry?.tyre_life ?? 0}
                lap={selectedLap}
                turns={turns}
              />
            )}

            {/* ── Session results table ── */}
            {drivers.length > 0 && (
              <SessionResults
                drivers={drivers}
                laps={sessionLaps}
                sessionCode={selectedSessionCode}
                selectedDriver={selectedDriver}
                onSelectDriver={handleSelectDriver}
              />
            )}

            {/* ── Session Weather & Race Control Overview on Main Page ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16, marginTop: 16 }}>
              <WeatherPanel
                weather={weather}
                year={selectedYear}
                event={selectedRace?.event}
                sessionCode={selectedSessionCode}
              />
              <RaceControlPanel
                messages={raceControl}
                year={selectedYear}
                event={selectedRace?.event}
                sessionCode={selectedSessionCode}
              />
            </div>
          </>
        )}
      </>
    );
  }

  function renderRaceControl() {
    if (sessionLoading) return <div className="loading-box"><div className="loader" /><span>LOADING…</span></div>;
    return (
      <>
        <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
          <div>
            <div className="eyebrow">{breadcrumb.join(" / ")}</div>
            <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>RACE CONTROL</h1>
          </div>
          <div className="hero-metrics">
            <div className="metric"><span>DIRECTIVES</span><strong>{raceControl.length}</strong></div>
            <div className="metric">
              <span>FLAGS</span>
              <strong>{raceControl.filter((m) => m.Category === "Flag").length}</strong>
            </div>
          </div>
        </div>
        <RaceControlPanel
          messages={raceControl}
          year={selectedYear}
          event={selectedRace?.event}
          sessionCode={selectedSessionCode}
        />
      </>
    );
  }

  function renderWeather() {
    if (sessionLoading) return <div className="loading-box"><div className="loader" /><span>LOADING…</span></div>;
    return (
      <>
        <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
          <div>
            <div className="eyebrow">{breadcrumb.join(" / ")}</div>
            <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>WEATHER</h1>
          </div>
          <div className="hero-metrics">
            <div className="metric"><span>DATA POINTS</span><strong>{weather.length}</strong></div>
            <div className="metric">
              <span>RAIN</span>
              <strong style={{ color: weather.some((w) => w.Rainfall) ? "#3b82f6" : "#34d399" }}>
                {weather.some((w) => w.Rainfall) ? "YES" : "NONE"}
              </strong>
            </div>
          </div>
        </div>
        <WeatherPanel
          weather={weather}
          year={selectedYear}
          event={selectedRace?.event}
          sessionCode={selectedSessionCode}
        />
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case "Race Explorer":
        return renderRaceExplorer();
      case "Driver Comparison":
        return (
          <DriverComparison
            circuit={circuit}
            drivers={drivers}
            driverA={selectedDriver}
            lapA={selectedLap}
            telemetryA={telemetry}
            driverB={selectedDriverB}
            lapB={selectedLapB}
            telemetryB={telemetryB}
            availableLapsA={driverLaps}
            availableLapsB={driverLapsB}
            onSelectDriverA={(d) => setSelectedDriver(d)}
            onSelectLapA={(l) => setSelectedLap(l)}
            onSelectDriverB={(d) => setSelectedDriverB(d)}
            onSelectLapB={(l) => setSelectedLapB(l)}
          />
        );
      case "Strategy & Laps":
        return (
          <StrategyPanel
            drivers={drivers}
            laps={sessionLaps}
            sessionCode={selectedSessionCode}
            selectedDriver={selectedDriver}
            onSelectDriver={handleSelectDriver}
          />
        );
      case "Race Control":
        return renderRaceControl();
      case "Weather":
        return renderWeather();
      case "Championship":
        return <ChampionshipPanel calendar={calendar} year={selectedYear} />;
      case "Historical F1":
        return (
          <HistoricalPanel
            onSelectYear={(yr) => {
              setSelectedYear(yr);
              setPage("Race Explorer");
            }}
          />
        );
      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHELL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="f1-app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="f1-logo">F1</div>
          <div>
            <div className="logo-title">DATA LAB</div>
            <div className="logo-subtitle">TELEMETRY SYSTEM</div>
          </div>
        </div>

        <div className="nav-heading">ANALYSIS</div>
        <nav className="navigation">
          {NAV.map(({ label, icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "nav-item-active" : ""}`}
              onClick={() => setPage(label)}
            >
              <span style={{ fontSize: 13, minWidth: 16 }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* ── Driver quick-select ── */}
        {drivers.length > 0 && hasTelemetry && (
          <>
            <div className="nav-heading" style={{ marginTop: 8 }}>GRID DRIVERS</div>
            <div style={{ padding: "0 9px", maxHeight: 230, overflowY: "auto" }}>
              {drivers.map((d) => {
                const col = TEAM_COLOURS[d.team] ?? "#666";
                return (
                  <button
                    key={d.abbreviation}
                    className={`nav-item ${selectedDriver === d.abbreviation ? "nav-item-active" : ""}`}
                    onClick={() => handleSelectDriver(d.abbreviation)}
                    style={{ fontSize: 11 }}
                  >
                    <span style={{ width: 3, height: 14, background: col, borderRadius: 1, display: "inline-block", flexShrink: 0 }} />
                    {d.abbreviation}
                    <span style={{ marginLeft: "auto", color: "#888892", fontFamily: "IBM Plex Mono, monospace", fontSize: 8 }}>
                      P{d.position ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="sidebar-footer">
          <div className="pipeline-status">
            <span />
            {calLoading ? "LOADING CALENDAR…" : `${calendar.length} EVENTS · ${selectedYear}`}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumb">
            {breadcrumb.map((seg, i) => (
              <span key={i}>
                {i > 0 && <span>/</span>}
                {seg}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Year */}
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = Number(e.target.value);
                setSelectedYear(yr);
                setSelectedLap(1);
                setSelectedLapB(1);
              }}
              style={selStyle}
            >
              {ALL_SUPPORTED_YEARS.map((yr) => (
                <option key={yr} value={yr} style={{ background: "#111113", color: "#dedee0" }}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Race / GP */}
            <select
              value={selectedRace?.event ?? ""}
              onChange={(e) => {
                const race = calendar.find((r) => r.event === e.target.value);
                if (race) {
                  setSelectedRace(race);
                  const validCodes = (race.sessions ?? []).map((s) => s.code);
                  if (!validCodes.includes(selectedSessionCode)) {
                    setSelectedSessionCode(validCodes.includes("R") ? "R" : validCodes[0] ?? "R");
                  }
                  setSelectedLap(1);
                  setSelectedLapB(1);
                }
              }}
              style={{ ...selStyle, minWidth: 200 }}
            >
              {calendar.map((r) => (
                <option key={r.round} value={r.event} style={{ background: "#111113", color: "#dedee0" }}>
                  R{r.round} · {r.event.replace(" Grand Prix", " GP")}
                </option>
              ))}
            </select>

            {/* Session */}
            <select
              value={selectedSessionCode}
              onChange={(e) => {
                setSelectedSessionCode(e.target.value);
                setSelectedLap(1);
                setSelectedLapB(1);
              }}
              style={selStyle}
            >
              {sessionTabs.map((s) => (
                <option key={s.code} value={s.code} style={{ background: "#111113", color: "#dedee0" }}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Driver (only when telemetry available) */}
            {hasTelemetry && drivers.length > 0 && (
              <select
                value={selectedDriver}
                onChange={(e) => handleSelectDriver(e.target.value)}
                style={selStyle}
              >
                {drivers.map((d) => (
                  <option key={d.abbreviation} value={d.abbreviation} style={{ background: "#111113", color: "#dedee0" }}>
                    {d.abbreviation} · {d.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Lap (only when telemetry available) */}
            {hasTelemetry && (
              <select
                value={selectedLap}
                onChange={(e) => setSelectedLap(Number(e.target.value))}
                style={selStyle}
              >
                {driverLaps.length > 0
                  ? driverLaps.map((l) => (
                      <option key={l.LapNumber} value={l.LapNumber} style={{ background: "#111113", color: "#dedee0" }}>
                        Lap {l.LapNumber} · {formatLapTime(l.LapTime)}
                      </option>
                    ))
                  : Array.from({ length: 78 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} style={{ background: "#111113", color: "#dedee0" }}>
                        Lap {n}
                      </option>
                    ))}
              </select>
            )}

            <div className="race-badge">
              <span />
              LIVE DATA
            </div>
          </div>
        </header>

        {/* Page */}
        <div className="page">{renderPage()}</div>
      </main>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  background: "#111113",
  color: "#dedee0",
  border: "1px solid #2a2a2e",
  padding: "0 10px",
  height: 34,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 9,
  outline: "none",
};