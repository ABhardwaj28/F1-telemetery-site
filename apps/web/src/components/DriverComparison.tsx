import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CircuitData,
  LapTelemetry,
  SessionDriver,
  SessionLap,
} from "../types";
import { TEAM_COLOURS, TYRE_COLOURS, formatLapTime } from "../data/loader";

interface DriverComparisonProps {
  circuit: CircuitData | null;
  drivers: SessionDriver[];
  driverA: string;
  lapA: number;
  telemetryA: LapTelemetry | null;
  driverB: string;
  lapB: number;
  telemetryB: LapTelemetry | null;
  availableLapsA: SessionLap[];
  availableLapsB: SessionLap[];
  onSelectDriverA: (driver: string) => void;
  onSelectLapA: (lap: number) => void;
  onSelectDriverB: (driver: string) => void;
  onSelectLapB: (lap: number) => void;
}

export default function DriverComparison({
  circuit,
  drivers,
  driverA,
  lapA,
  telemetryA,
  driverB,
  lapB,
  telemetryB,
  availableLapsA,
  availableLapsB,
  onSelectDriverA,
  onSelectLapA,
  onSelectDriverB,
  onSelectLapB,
}: DriverComparisonProps) {
  const [cursorDist, setCursorDist] = useState<number | null>(null);
  const [visibleChannel, setVisibleChannel] = useState<"all" | "speed" | "inputs" | "delta">("all");
  const [layoutMode, setLayoutMode] = useState<"overlay" | "split">("overlay");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ── Horizontal Telemetry Zoom & Pan ──
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panDist, setPanDist] = useState<number>(0);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; startPan: number } | null>(null);

  const teamA = drivers.find((d) => d.abbreviation === driverA)?.team ?? "";
  const teamB = drivers.find((d) => d.abbreviation === driverB)?.team ?? "";

  // Vibrant high-contrast distinct colors
  const colorA = TEAM_COLOURS[teamA] ?? "#FF8000";
  const rawColorB = TEAM_COLOURS[teamB] ?? "#00E5FF";
  const colorB =
    driverA === driverB || teamA === teamB || colorA === rawColorB
      ? "#00E5FF"
      : rawColorB;

  const ptsA = useMemo(() => telemetryA?.telemetry.data ?? [], [telemetryA]);
  const ptsB = useMemo(() => telemetryB?.telemetry.data ?? [], [telemetryB]);

  const trackLength =
    circuit?.length_m ?? (ptsA.length ? ptsA[ptsA.length - 1].Distance : 5000);
  const turns = circuit?.turns ?? [];

  // Viewport distance calculations
  const windowSize = useMemo(() => {
    return trackLength / zoomLevel;
  }, [trackLength, zoomLevel]);

  const viewStart = useMemo(() => {
    if (zoomLevel <= 1) return 0;
    return Math.max(0, Math.min(trackLength - windowSize, panDist));
  }, [zoomLevel, trackLength, windowSize, panDist]);

  const viewEnd = useMemo(() => {
    if (zoomLevel <= 1) return trackLength;
    return Math.min(trackLength, viewStart + windowSize);
  }, [zoomLevel, trackLength, viewStart, windowSize]);

  // Zoom setter with centering around cursor or target distance
  const handleSetZoom = useCallback(
    (newZoom: number, centerDist?: number) => {
      const clampedZoom = Math.max(1, Math.min(8, newZoom));
      if (clampedZoom === 1) {
        setZoomLevel(1);
        setPanDist(0);
        return;
      }
      const newWin = trackLength / clampedZoom;
      const center = centerDist ?? cursorDist ?? (viewStart + viewEnd) / 2;
      const newPan = Math.max(0, Math.min(trackLength - newWin, center - newWin / 2));
      setZoomLevel(clampedZoom);
      setPanDist(newPan);
    },
    [trackLength, cursorDist, viewStart, viewEnd]
  );

  const handlePanBy = useCallback(
    (deltaMeters: number) => {
      if (zoomLevel <= 1) return;
      setPanDist((prev) => Math.max(0, Math.min(trackLength - windowSize, prev + deltaMeters)));
    },
    [zoomLevel, trackLength, windowSize]
  );

  const handleFocusTurn = useCallback(
    (turnDist: number) => {
      const targetZoom = Math.max(3, zoomLevel);
      const newWin = trackLength / targetZoom;
      const newPan = Math.max(0, Math.min(trackLength - newWin, turnDist - newWin / 2));
      setZoomLevel(targetZoom);
      setPanDist(newPan);
      setCursorDist(turnDist);
    },
    [trackLength, zoomLevel]
  );

  // ── Telemetry interpolation helpers ──
  // Linearly interpolate a value from a sorted telemetry array at a given distance.
  // This is the key to cross-density sync: both datasets are sampled at the same
  // distance regardless of how many raw points each has.
  const interpolateAt = useCallback(
    (pts: typeof ptsA, dist: number, field: keyof (typeof pts)[0]): number => {
      if (!pts.length) return 0;
      if (dist <= pts[0].Distance) return pts[0][field] as number;
      if (dist >= pts[pts.length - 1].Distance) return pts[pts.length - 1][field] as number;
      let lo = 0;
      let hi = pts.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].Distance <= dist) lo = mid;
        else hi = mid;
      }
      const t = (dist - pts[lo].Distance) / (pts[hi].Distance - pts[lo].Distance || 1);
      return (pts[lo][field] as number) + t * ((pts[hi][field] as number) - (pts[lo][field] as number));
    },
    []
  );

  // O(log n) binary search for nearest brake value (avoids O(n²) .reduce scan)
  const nearestBrake = useCallback((pts: typeof ptsA, dist: number): boolean => {
    if (!pts.length) return false;
    if (dist <= pts[0].Distance) return pts[0].Brake;
    if (dist >= pts[pts.length - 1].Distance) return pts[pts.length - 1].Brake;
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].Distance <= dist) lo = mid;
      else hi = mid;
    }
    // Pick whichever neighbour is closer
    return Math.abs(pts[lo].Distance - dist) <= Math.abs(pts[hi].Distance - dist)
      ? pts[lo].Brake
      : pts[hi].Brake;
  }, []);

  // Simultaneous animation timer — use actual average speed derived from lap data
  // so the cursor moves at the real pace of the car, not a hardcoded 68 m/s constant.
  const avgSpeedMs = useMemo(() => {
    // Average speed in m/s: trackLength / lap_time
    const lapTimeA = telemetryA?.lap_time ?? 0;
    const lapTimeB = telemetryB?.lap_time ?? 0;
    const lapTime = lapTimeA && lapTimeB ? Math.min(lapTimeA, lapTimeB) : (lapTimeA || lapTimeB || 90);
    return lapTime > 0 ? trackLength / lapTime : trackLength / 90;
  }, [trackLength, telemetryA, telemetryB]);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        const moveDist = avgSpeedMs * deltaSec * playbackSpeed;
        setCursorDist((prev) => {
          const current = prev ?? 0;
          const next = current + moveDist;
          if (next >= trackLength) {
            if (zoomLevel > 1) setPanDist(0);
            return 0; // loop
          }
          // If zoomed in, advance viewport so the cursor stays visible
          if (zoomLevel > 1) {
            setPanDist((currPan) => {
              const curEnd = currPan + windowSize;
              if (next > curEnd - windowSize * 0.15) {
                return Math.min(trackLength - windowSize, next - windowSize * 0.35);
              }
              if (next < currPan) {
                return Math.max(0, next - windowSize * 0.1);
              }
              return currPan;
            });
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, trackLength, avgSpeedMs, zoomLevel, windowSize]);

  // Delta points — built on a unified distance grid sampled from whichever
  // dataset is denser. Time values are linearly interpolated at each sample
  // point so a 5000-pt quali trace vs a 1000-pt race trace stays in sync.
  const deltaPoints = useMemo(() => {
    if (!ptsA.length || !ptsB.length) return [];

    // Use the denser dataset's distance samples as the common grid
    const samples = ptsA.length >= ptsB.length ? ptsA : ptsB;

    return samples.map((sample) => {
      const dist = sample.Distance;
      const timeA = interpolateAt(ptsA, dist, "Time");
      const timeB = interpolateAt(ptsB, dist, "Time");
      return {
        distance: dist,
        delta: timeA - timeB,
        speedA: interpolateAt(ptsA, dist, "Speed"),
        speedB: interpolateAt(ptsB, dist, "Speed"),
        throttleA: interpolateAt(ptsA, dist, "Throttle"),
        throttleB: interpolateAt(ptsB, dist, "Throttle"),
        brakeA: nearestBrake(ptsA, dist),
        brakeB: nearestBrake(ptsB, dist),
        gearA: Math.round(interpolateAt(ptsA, dist, "nGear")),
        gearB: Math.round(interpolateAt(ptsB, dist, "nGear")),
      };
    });
  }, [ptsA, ptsB, interpolateAt, nearestBrake]);

  // SVG dimensions
  const W = 960;
  const H_SPEED = layoutMode === "split" ? 170 : 240;
  const H_SPEED_SPLIT_TOTAL = 350;
  const H_DELTA = 90;
  const H_THROTTLE = 90;
  const H_GEAR = 70;
  const PAD = { top: 20, right: 30, bottom: 20, left: 60 };

  const totalHeight = useMemo(() => {
    if (layoutMode === "split") {
      if (visibleChannel === "speed") return H_SPEED_SPLIT_TOTAL;
      if (visibleChannel === "delta") return H_DELTA;
      if (visibleChannel === "inputs") return H_THROTTLE + H_GEAR;
      return H_SPEED_SPLIT_TOTAL + H_DELTA + H_THROTTLE + H_GEAR;
    }
    if (visibleChannel === "speed") return H_SPEED;
    if (visibleChannel === "delta") return H_DELTA;
    if (visibleChannel === "inputs") return H_THROTTLE + H_GEAR;
    return H_SPEED + H_DELTA + H_THROTTLE + H_GEAR;
  }, [visibleChannel, layoutMode, H_SPEED, H_SPEED_SPLIT_TOTAL]);

  const maxSpeed = useMemo(() => {
    const sA = ptsA.map((p) => p.Speed);
    const sB = ptsB.map((p) => p.Speed);
    const max = Math.max(...sA, ...sB, 320);
    return Math.max(340, Math.ceil((max + 10) / 20) * 20);
  }, [ptsA, ptsB]);

  const scaleX = useCallback(
    (dist: number) => {
      const range = viewEnd - viewStart || 1;
      return PAD.left + ((dist - viewStart) / range) * (W - PAD.left - PAD.right);
    },
    [viewStart, viewEnd]
  );

  const distanceTicks = useMemo(() => {
    const range = viewEnd - viewStart;
    let step = 500;
    if (range <= 500) step = 50;
    else if (range <= 1000) step = 100;
    else if (range <= 2500) step = 250;

    const ticks: number[] = [];
    const firstTick = Math.ceil(viewStart / step) * step;
    for (let d = firstTick; d <= viewEnd; d += step) {
      ticks.push(d);
    }
    return ticks;
  }, [viewStart, viewEnd]);
  const scaleSpeedY = useCallback(
    (speed: number, height: number = H_SPEED) =>
      height - PAD.bottom - (speed / maxSpeed) * (height - PAD.top - PAD.bottom),
    [maxSpeed, H_SPEED]
  );

  // Delta scale with dynamic sensitivity
  const maxDelta = Math.max(0.2, 1.2 / Math.min(3, zoomLevel));
  const scaleDeltaY = (d: number) => {
    const clamped = Math.max(-maxDelta, Math.min(maxDelta, d));
    const midY = (H_DELTA - PAD.top - PAD.bottom) / 2 + PAD.top;
    return midY - (clamped / maxDelta) * ((H_DELTA - PAD.top - PAD.bottom) / 2);
  };

  const scaleThrottleY = (th: number) =>
    H_THROTTLE - PAD.bottom - (th / 100) * (H_THROTTLE - PAD.top - PAD.bottom);
  const scaleGearY = (g: number) =>
    H_GEAR - PAD.bottom - (g / 8) * (H_GEAR - PAD.top - PAD.bottom);

  // Speed paths (thin, high-precision)
  const speedPathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX, scaleSpeedY]);

  const speedPathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX, scaleSpeedY]);

  // Split view paths
  const speedPathSplitA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed, 160).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX, scaleSpeedY]);

  const speedPathSplitB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleSpeedY(p.Speed, 160).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX, scaleSpeedY]);

  // Delta path
  const deltaPath = useMemo(() => {
    if (!deltaPoints.length) return "";
    return deltaPoints
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.distance).toFixed(1)} ${scaleDeltaY(p.delta).toFixed(1)}`
      )
      .join(" ");
  }, [deltaPoints, scaleX]);

  // Throttle paths
  const throttlePathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleThrottleY(p.Throttle).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX]);

  const throttlePathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleThrottleY(p.Throttle).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX]);

  // Gear paths (stepped)
  const gearPathA = useMemo(() => {
    if (!ptsA.length) return "";
    return ptsA
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleGearY(p.nGear).toFixed(1)}`
      )
      .join(" ");
  }, [ptsA, scaleX]);

  const gearPathB = useMemo(() => {
    if (!ptsB.length) return "";
    return ptsB
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(p.Distance).toFixed(1)} ${scaleGearY(p.nGear).toFixed(1)}`
      )
      .join(" ");
  }, [ptsB, scaleX]);

  // Turn apex analysis
  const turnAnalysis = useMemo(() => {
    if (!turns.length || !ptsA.length) return [];
    return turns.map((t) => {
      const windowA = ptsA.filter((p) => Math.abs(p.Distance - t.distance) < 55);
      const minA = windowA.length
        ? Math.min(...windowA.map((p) => p.Speed))
        : t.speed;

      const windowB = ptsB.filter((p) => Math.abs(p.Distance - t.distance) < 55);
      const minB = windowB.length
        ? Math.min(...windowB.map((p) => p.Speed))
        : t.speed;

      return {
        turn: t.number,
        distance: Math.round(t.distance),
        speedA: Math.round(minA),
        speedB: Math.round(minB),
        deltaSpeed: Math.round(minA - minB),
      };
    });
  }, [turns, ptsA, ptsB]);

  // Hover scrubbing & Drag-to-pan handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingPan && dragStartRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dxPx = e.clientX - dragStartRef.current.mouseX;
      const plotWidthPx = rect.width * ((W - PAD.left - PAD.right) / W);
      const metersPerPx = windowSize / (plotWidthPx || 1);
      const deltaMeters = -dxPx * metersPerPx;
      const newPan = Math.max(
        0,
        Math.min(trackLength - windowSize, dragStartRef.current.startPan + deltaMeters)
      );
      setPanDist(newPan);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const svgX = relX * W;
    const clampedSvgX = Math.max(PAD.left, Math.min(W - PAD.right, svgX));
    const dist =
      viewStart + ((clampedSvgX - PAD.left) / (W - PAD.left - PAD.right)) * (viewEnd - viewStart);
    setCursorDist(dist);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoomLevel > 1) {
      setIsDraggingPan(true);
      dragStartRef.current = { mouseX: e.clientX, startPan: panDist };
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPan(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const svgX = relX * W;
      const clampedSvgX = Math.max(PAD.left, Math.min(W - PAD.right, svgX));
      const mouseDist =
        viewStart + ((clampedSvgX - PAD.left) / (W - PAD.left - PAD.right)) * (viewEnd - viewStart);

      const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
      const targetZoom = Math.max(1, Math.min(8, Number((zoomLevel * zoomFactor).toFixed(1))));
      handleSetZoom(targetZoom, mouseDist);
    }
  };

  // Scrubber click handler for track minimap
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickDist = clickRatio * trackLength;
    if (zoomLevel <= 1) {
      setCursorDist(clickDist);
    } else {
      const newPan = Math.max(0, Math.min(trackLength - windowSize, clickDist - windowSize / 2));
      setPanDist(newPan);
      setCursorDist(clickDist);
    }
  };

  // Reset cursor & zoom to full lap whenever telemetry changes (new lap loaded)
  useEffect(() => {
    setCursorDist(null);
    setIsPlaying(false);
    setZoomLevel(1);
    setPanDist(0);
  }, [telemetryA, telemetryB]);

  // Cursor readout: use interpolation so both drivers are evaluated at the
  // *exact same distance* even when their telemetry densities differ.
  const cursorDist_ = cursorDist ?? (ptsA.length ? ptsA[0].Distance : 0);

  const cursorPointA = useMemo(() => {
    if (!ptsA.length) return null;
    const dist = cursorDist_;
    return {
      Distance: dist,
      Speed: interpolateAt(ptsA, dist, "Speed"),
      Throttle: interpolateAt(ptsA, dist, "Throttle"),
      Time: interpolateAt(ptsA, dist, "Time"),
      nGear: Math.round(interpolateAt(ptsA, dist, "nGear")),
      Brake: nearestBrake(ptsA, dist),
      RPM: interpolateAt(ptsA, dist, "RPM"),
      DRS: Math.round(interpolateAt(ptsA, dist, "DRS")),
      X: interpolateAt(ptsA, dist, "X"),
      Y: interpolateAt(ptsA, dist, "Y"),
      Z: interpolateAt(ptsA, dist, "Z"),
    };
  }, [cursorDist_, ptsA, interpolateAt, nearestBrake]);

  const cursorPointB = useMemo(() => {
    if (!ptsB.length) return null;
    const dist = cursorDist_;
    return {
      Distance: dist,
      Speed: interpolateAt(ptsB, dist, "Speed"),
      Throttle: interpolateAt(ptsB, dist, "Throttle"),
      Time: interpolateAt(ptsB, dist, "Time"),
      nGear: Math.round(interpolateAt(ptsB, dist, "nGear")),
      Brake: nearestBrake(ptsB, dist),
      RPM: interpolateAt(ptsB, dist, "RPM"),
      DRS: Math.round(interpolateAt(ptsB, dist, "DRS")),
      X: interpolateAt(ptsB, dist, "X"),
      Y: interpolateAt(ptsB, dist, "Y"),
      Z: interpolateAt(ptsB, dist, "Z"),
    };
  }, [cursorDist_, ptsB, interpolateAt, nearestBrake]);

  const lapDataA = useMemo(
    () => availableLapsA.find((l) => l.LapNumber === lapA) ?? (availableLapsA[0] || null),
    [availableLapsA, lapA]
  );

  const lapDataB = useMemo(
    () => availableLapsB.find((l) => l.LapNumber === lapB) ?? (availableLapsB[0] || null),
    [availableLapsB, lapB]
  );

  const bestLapA = useMemo(
    () =>
      availableLapsA.find((l) => l.IsPersonalBest) ??
      (availableLapsA.length
        ? [...availableLapsA].sort((a, b) => (a.LapTime ?? 999) - (b.LapTime ?? 999))[0]
        : null),
    [availableLapsA]
  );

  const bestLapB = useMemo(
    () =>
      availableLapsB.find((l) => l.IsPersonalBest) ??
      (availableLapsB.length
        ? [...availableLapsB].sort((a, b) => (a.LapTime ?? 999) - (b.LapTime ?? 999))[0]
        : null),
    [availableLapsB]
  );

  // Auto-sync lap selection when driver or available laps change so telemetry is always in sync
  useEffect(() => {
    if (availableLapsA.length > 0 && !availableLapsA.some((l) => l.LapNumber === lapA)) {
      const best = availableLapsA.find((l) => l.IsPersonalBest) ?? availableLapsA[0];
      if (best) onSelectLapA(best.LapNumber);
    }
  }, [availableLapsA, lapA, onSelectLapA]);

  useEffect(() => {
    if (availableLapsB.length > 0 && !availableLapsB.some((l) => l.LapNumber === lapB)) {
      const best = availableLapsB.find((l) => l.IsPersonalBest) ?? availableLapsB[0];
      if (best) onSelectLapB(best.LapNumber);
    }
  }, [availableLapsB, lapB, onSelectLapB]);

  const topSpeedA = ptsA.length ? Math.max(...ptsA.map((p) => p.Speed)) : 0;
  const topSpeedB = ptsB.length ? Math.max(...ptsB.map((p) => p.Speed)) : 0;
  const timeA = lapDataA?.LapTime ?? telemetryA?.lap_time ?? 0;
  const timeB = lapDataB?.LapTime ?? telemetryB?.lap_time ?? 0;
  const lapTimeDelta = timeA && timeB ? Number((timeA - timeB).toFixed(3)) : 0;

  const currentDist = cursorDist_;

  // Sector times calculations
  const s1A = lapDataA?.Sector1Time ?? null;
  const s1B = lapDataB?.Sector1Time ?? null;
  const s1Delta = s1A != null && s1B != null ? Number((s1A - s1B).toFixed(3)) : null;

  const s2A = lapDataA?.Sector2Time ?? null;
  const s2B = lapDataB?.Sector2Time ?? null;
  const s2Delta = s2A != null && s2B != null ? Number((s2A - s2B).toFixed(3)) : null;

  const s3A = lapDataA?.Sector3Time ?? null;
  const s3B = lapDataB?.Sector3Time ?? null;
  const s3Delta = s3A != null && s3B != null ? Number((s3A - s3B).toFixed(3)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Bar Selectors with Driver Colors & Quick Buttons ── */}
      <div className="panel" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Driver A */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  width: 5,
                  height: 48,
                  background: colorA,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colorA}88`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: colorA,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 14, height: 2, background: colorA, display: "inline-block" }} />
                  DRIVER A ({driverA}) — SOLID TRACE
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <select
                    className="f1-select"
                    value={driverA}
                    onChange={(e) => onSelectDriverA(e.target.value)}
                    style={{ borderColor: colorA, background: "#111", color: "#ffffff", minWidth: 130 }}
                  >
                    {drivers.map((d) => (
                      <option key={d.abbreviation} value={d.abbreviation} style={{ background: "#111", color: "#ffffff" }}>
                        {d.abbreviation} ({d.team})
                      </option>
                    ))}
                  </select>
                  <select
                    className="f1-select"
                    value={lapA}
                    onChange={(e) => onSelectLapA(Number(e.target.value))}
                    style={{ background: "#111", color: "#ffffff", minWidth: 160 }}
                  >
                    {availableLapsA.length > 0 ? (
                      <>
                        {!availableLapsA.some((l) => l.LapNumber === lapA) && (
                          <option key="syncing-a" value={lapA} disabled style={{ background: "#111", color: "#888" }}>
                            Lap {lapA} (Syncing...)
                          </option>
                        )}
                        {availableLapsA.map((l) => (
                          <option key={l.LapNumber} value={l.LapNumber} style={{ background: "#111", color: "#fff" }}>
                            Lap {l.LapNumber} · {formatLapTime(l.LapTime)}{l.IsPersonalBest ? " ★ (PB)" : ""}{l.Compound ? ` [${l.Compound[0]}]` : ""}
                          </option>
                        ))}
                      </>
                    ) : (
                      Array.from({ length: 57 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} style={{ background: "#111", color: "#fff" }}>
                          Lap {n}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {/* Quick lap shortcuts Driver A */}
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {bestLapA && (
                    <button
                      onClick={() => onSelectLapA(bestLapA.LapNumber)}
                      style={{
                        background: lapA === bestLapA.LapNumber ? `${colorA}33` : "#14141c",
                        border: `1px solid ${lapA === bestLapA.LapNumber ? colorA : "#2a2a38"}`,
                        color: lapA === bestLapA.LapNumber ? colorA : "#a0a0ab",
                        padding: "2px 6px",
                        fontSize: 9,
                        fontFamily: "IBM Plex Mono, monospace",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                      title={`Fastest Lap: Lap ${bestLapA.LapNumber} (${formatLapTime(bestLapA.LapTime)})`}
                    >
                      ★ PB (L{bestLapA.LapNumber})
                    </button>
                  )}
                  <button
                    onClick={() => onSelectLapA(1)}
                    style={{
                      background: lapA === 1 ? `${colorA}33` : "#14141c",
                      border: `1px solid ${lapA === 1 ? colorA : "#2a2a38"}`,
                      color: lapA === 1 ? colorA : "#a0a0ab",
                      padding: "2px 6px",
                      fontSize: 9,
                      fontFamily: "IBM Plex Mono, monospace",
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    LAP 1
                  </button>
                  {availableLapsA.length > 1 && (
                    <button
                      onClick={() => onSelectLapA(availableLapsA[availableLapsA.length - 1].LapNumber)}
                      style={{
                        background: lapA === availableLapsA[availableLapsA.length - 1].LapNumber ? `${colorA}33` : "#14141c",
                        border: `1px solid ${lapA === availableLapsA[availableLapsA.length - 1].LapNumber ? colorA : "#2a2a38"}`,
                        color: lapA === availableLapsA[availableLapsA.length - 1].LapNumber ? colorA : "#a0a0ab",
                        padding: "2px 6px",
                        fontSize: 9,
                        fontFamily: "IBM Plex Mono, monospace",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      FINAL (L{availableLapsA[availableLapsA.length - 1].LapNumber})
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 16,
                color: "#dedee0",
                fontWeight: 800,
                fontFamily: "IBM Plex Mono, monospace",
                alignSelf: "center",
              }}
            >
              VS
            </div>

            {/* Driver B */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  width: 5,
                  height: 48,
                  background: colorB,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${colorB}88`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: colorB,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 2,
                      borderTop: `2px dashed ${colorB}`,
                      display: "inline-block",
                    }}
                  />
                  DRIVER B ({driverB}) — DASHED TRACE
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <select
                    className="f1-select"
                    value={driverB}
                    onChange={(e) => onSelectDriverB(e.target.value)}
                    style={{ borderColor: colorB, background: "#111", color: "#fff", minWidth: 130 }}
                  >
                    {drivers.map((d) => (
                      <option key={d.abbreviation} value={d.abbreviation} style={{ background: "#111", color: "#fff" }}>
                        {d.abbreviation} ({d.team})
                      </option>
                    ))}
                  </select>
                  <select
                    className="f1-select"
                    value={lapB}
                    onChange={(e) => onSelectLapB(Number(e.target.value))}
                    style={{ background: "#111", color: "#fff", minWidth: 160 }}
                  >
                    {availableLapsB.length > 0 ? (
                      <>
                        {!availableLapsB.some((l) => l.LapNumber === lapB) && (
                          <option key="syncing-b" value={lapB} disabled style={{ background: "#111", color: "#888" }}>
                            Lap {lapB} (Syncing...)
                          </option>
                        )}
                        {availableLapsB.map((l) => (
                          <option key={l.LapNumber} value={l.LapNumber} style={{ background: "#111", color: "#fff" }}>
                            Lap {l.LapNumber} · {formatLapTime(l.LapTime)}{l.IsPersonalBest ? " ★ (PB)" : ""}{l.Compound ? ` [${l.Compound[0]}]` : ""}
                          </option>
                        ))}
                      </>
                    ) : (
                      Array.from({ length: 57 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} style={{ background: "#111", color: "#fff" }}>
                          Lap {n}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {/* Quick lap shortcuts Driver B */}
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {bestLapB && (
                    <button
                      onClick={() => onSelectLapB(bestLapB.LapNumber)}
                      style={{
                        background: lapB === bestLapB.LapNumber ? `${colorB}33` : "#14141c",
                        border: `1px solid ${lapB === bestLapB.LapNumber ? colorB : "#2a2a38"}`,
                        color: lapB === bestLapB.LapNumber ? colorB : "#a0a0ab",
                        padding: "2px 6px",
                        fontSize: 9,
                        fontFamily: "IBM Plex Mono, monospace",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                      title={`Fastest Lap: Lap ${bestLapB.LapNumber} (${formatLapTime(bestLapB.LapTime)})`}
                    >
                      ★ PB (L{bestLapB.LapNumber})
                    </button>
                  )}
                  <button
                    onClick={() => onSelectLapB(1)}
                    style={{
                      background: lapB === 1 ? `${colorB}33` : "#14141c",
                      border: `1px solid ${lapB === 1 ? colorB : "#2a2a38"}`,
                      color: lapB === 1 ? colorB : "#a0a0ab",
                      padding: "2px 6px",
                      fontSize: 9,
                      fontFamily: "IBM Plex Mono, monospace",
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    LAP 1
                  </button>
                  {availableLapsB.length > 1 && (
                    <button
                      onClick={() => onSelectLapB(availableLapsB[availableLapsB.length - 1].LapNumber)}
                      style={{
                        background: lapB === availableLapsB[availableLapsB.length - 1].LapNumber ? `${colorB}33` : "#14141c",
                        border: `1px solid ${lapB === availableLapsB[availableLapsB.length - 1].LapNumber ? colorB : "#2a2a38"}`,
                        color: lapB === availableLapsB[availableLapsB.length - 1].LapNumber ? colorB : "#a0a0ab",
                        padding: "2px 6px",
                        fontSize: 9,
                        fontFamily: "IBM Plex Mono, monospace",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      FINAL (L{availableLapsB[availableLapsB.length - 1].LapNumber})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Overlay vs Split, Playback, Channels */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* View Mode: Overlay vs Split */}
            <div style={{ display: "flex", border: "1px solid #2a2a35", borderRadius: 4, overflow: "hidden" }}>
              <button
                onClick={() => setLayoutMode("overlay")}
                style={{
                  background: layoutMode === "overlay" ? "#282834" : "#111116",
                  color: layoutMode === "overlay" ? "#ffffff" : "#a0a0ab",
                  border: "none",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                OVERLAY
              </button>
              <button
                onClick={() => setLayoutMode("split")}
                style={{
                  background: layoutMode === "split" ? "#282834" : "#111116",
                  color: layoutMode === "split" ? "#ffffff" : "#a0a0ab",
                  border: "none",
                  borderLeft: "1px solid #2a2a35",
                  padding: "6px 12px",
                  fontSize: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                SPLIT TRACKS
              </button>
            </div>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? "#e10600" : "#1a1a22",
                color: "#ffffff",
                border: "1px solid #333340",
                padding: "6px 14px",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: "IBM Plex Mono, monospace",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
            </button>

            {/* Speed Multiplier */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="f1-select"
              style={{ padding: "4px 8px", fontSize: 10, background: "#111", color: "#fff" }}
            >
              <option value={0.5} style={{ background: "#111", color: "#fff" }}>0.5x</option>
              <option value={1} style={{ background: "#111", color: "#fff" }}>1.0x Realtime</option>
              <option value={2} style={{ background: "#111", color: "#fff" }}>2.0x Fast</option>
              <option value={4} style={{ background: "#111", color: "#fff" }}>4.0x Ultra</option>
            </select>

            {/* Horizontal Track Zoom Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#111116", border: "1px solid #2a2a35", borderRadius: 4, padding: "2px 6px" }}>
              <span style={{ fontSize: 9, color: zoomLevel > 1 ? "#00E5FF" : "#ffffff", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>ZOOM:</span>
              {[1, 2, 3, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSetZoom(s)}
                  style={{
                    background: zoomLevel === s ? "#e10600" : "transparent",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 2,
                    padding: "2px 6px",
                    fontSize: 9,
                    fontFamily: "IBM Plex Mono, monospace",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                  title={s === 1 ? "1x Full Lap View" : `Zoom into ${s}x telemetry view`}
                >
                  {s}x
                </button>
              ))}
              {zoomLevel > 1 && (
                <>
                  <button
                    onClick={() => handlePanBy(-windowSize * 0.25)}
                    style={{
                      background: "#1e1e28",
                      color: "#ffffff",
                      border: "1px solid #333342",
                      borderRadius: 2,
                      padding: "2px 5px",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontWeight: 700,
                    }}
                    title="Pan Left (earlier in lap)"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => handlePanBy(windowSize * 0.25)}
                    style={{
                      background: "#1e1e28",
                      color: "#ffffff",
                      border: "1px solid #333342",
                      borderRadius: 2,
                      padding: "2px 5px",
                      fontSize: 9,
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontWeight: 700,
                    }}
                    title="Pan Right (later in lap)"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => handleSetZoom(1)}
                    style={{
                      background: "rgba(225, 6, 0, 0.15)",
                      color: "#ff6b6b",
                      border: "1px solid rgba(225, 6, 0, 0.4)",
                      borderRadius: 2,
                      padding: "2px 5px",
                      fontSize: 8,
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontWeight: 700,
                    }}
                    title="Reset to 1x full lap"
                  >
                    RESET
                  </button>
                </>
              )}
            </div>

            {/* Channels Filter */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "speed", "inputs", "delta"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setVisibleChannel(ch)}
                  style={{
                    background: visibleChannel === ch ? "#e10600" : "#131318",
                    color: visibleChannel === ch ? "#ffffff" : "#dedee6",
                    border: "1px solid #252530",
                    padding: "6px 10px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                    cursor: "pointer",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {ch === "inputs" ? "THROTTLE / GEAR" : ch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Telemetry Stream Mode Indicator Banner */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #1f1f28",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 10,
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: telemetryA?.isCompressed ? "#FFD700" : "#00E5FF",
                boxShadow: telemetryA?.isCompressed
                  ? "0 0 8px #FFD700"
                  : "0 0 8px #00E5FF",
              }}
            />
            <strong
              style={{
                color: telemetryA?.isCompressed ? "#FFD700" : "#00E5FF",
                letterSpacing: "0.05em",
              }}
            >
              {telemetryA?.isCompressed
                ? `📦 RACE TELEMETRY — COMPRESSED STREAM (LAP ${lapA} vs LAP ${lapB})`
                : `⚡ HIGH-PRECISION 50Hz TELEMETRY — RAW SENSITIVITY (LAP ${lapA} vs LAP ${lapB})`}
            </strong>
          </div>

          <div style={{ display: "flex", gap: 14, color: "#888" }}>
            <span>{driverA} LAP {lapA}: <strong style={{ color: colorA }}>{formatLapTime(timeA)}</strong></span>
            <span>{driverB} LAP {lapB}: <strong style={{ color: colorB }}>{formatLapTime(timeB)}</strong></span>
            <span>POINTS: <strong style={{ color: "#aaa" }}>{ptsA.length} / {ptsB.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Head to Head Selected Lap Metrics & Performance Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {/* Card 1: Lap Time Delta */}
        <div
          className="panel"
          style={{
            padding: "14px 18px",
            borderLeft: `4px solid ${colorA}`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        >
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", display: "flex", justifyContent: "space-between" }}>
            <span>LAP TIME DELTA</span>
            <span>L{lapA} vs L{lapB}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorA,
              }}
            >
              {formatLapTime(timeA)}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: lapTimeDelta < 0 ? colorA : lapTimeDelta > 0 ? colorB : "#dedee0",
              }}
            >
              {timeA && timeB
                ? lapTimeDelta === 0
                  ? "EVEN (0.000s)"
                  : `${lapTimeDelta > 0 ? "+" : ""}${lapTimeDelta.toFixed(3)}s`
                : "—"}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorB,
              }}
            >
              {formatLapTime(timeB)}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "#777" }}>
            <span>{driverA} {lapDataA?.IsPersonalBest ? "★ PB" : ""}</span>
            <span style={{ color: lapTimeDelta < 0 ? colorA : colorB, fontWeight: 700 }}>
              {timeA && timeB ? (lapTimeDelta < 0 ? `${driverA} FASTER` : lapTimeDelta > 0 ? `${driverB} FASTER` : "TIED") : "CALCULATING"}
            </span>
            <span>{driverB} {lapDataB?.IsPersonalBest ? "★ PB" : ""}</span>
          </div>
        </div>

        {/* Card 2: Sector Times Breakdown */}
        <div className="panel" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", marginBottom: 6 }}>
            SECTOR BREAKDOWN (S1 / S2 / S3)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}>
            {/* S1 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>S1</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{s1A ? `${s1A.toFixed(3)}s` : "—"}</span>
              <span style={{ fontSize: 9, color: s1Delta != null ? (s1Delta < 0 ? colorA : s1Delta > 0 ? colorB : "#888") : "#666" }}>
                {s1Delta != null ? `${s1Delta > 0 ? "+" : ""}${s1Delta.toFixed(3)}s` : "—"}
              </span>
              <span style={{ color: colorB, fontWeight: 600 }}>{s1B ? `${s1B.toFixed(3)}s` : "—"}</span>
            </div>
            {/* S2 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>S2</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{s2A ? `${s2A.toFixed(3)}s` : "—"}</span>
              <span style={{ fontSize: 9, color: s2Delta != null ? (s2Delta < 0 ? colorA : s2Delta > 0 ? colorB : "#888") : "#666" }}>
                {s2Delta != null ? `${s2Delta > 0 ? "+" : ""}${s2Delta.toFixed(3)}s` : "—"}
              </span>
              <span style={{ color: colorB, fontWeight: 600 }}>{s2B ? `${s2B.toFixed(3)}s` : "—"}</span>
            </div>
            {/* S3 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>S3</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{s3A ? `${s3A.toFixed(3)}s` : "—"}</span>
              <span style={{ fontSize: 9, color: s3Delta != null ? (s3Delta < 0 ? colorA : s3Delta > 0 ? colorB : "#888") : "#666" }}>
                {s3Delta != null ? `${s3Delta > 0 ? "+" : ""}${s3Delta.toFixed(3)}s` : "—"}
              </span>
              <span style={{ color: colorB, fontWeight: 600 }}>{s3B ? `${s3B.toFixed(3)}s` : "—"}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Speed Trap & Speeds */}
        <div className="panel" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em", marginBottom: 6 }}>
            SPEED TRAPS (KM/H)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>MAX TRAP (ST)</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{lapDataA?.SpeedST ? `${lapDataA.SpeedST.toFixed(0)}` : topSpeedA.toFixed(0)}</span>
              <span style={{ color: "#555" }}>vs</span>
              <span style={{ color: colorB, fontWeight: 600 }}>{lapDataB?.SpeedST ? `${lapDataB.SpeedST.toFixed(0)}` : topSpeedB.toFixed(0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>FINISH LINE (FL)</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{lapDataA?.SpeedFL ? `${lapDataA.SpeedFL.toFixed(0)}` : "—"}</span>
              <span style={{ color: "#555" }}>vs</span>
              <span style={{ color: colorB, fontWeight: 600 }}>{lapDataB?.SpeedFL ? `${lapDataB.SpeedFL.toFixed(0)}` : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#777" }}>INTER 1 (I1)</span>
              <span style={{ color: colorA, fontWeight: 600 }}>{lapDataA?.SpeedI1 ? `${lapDataA.SpeedI1.toFixed(0)}` : "—"}</span>
              <span style={{ color: "#555" }}>vs</span>
              <span style={{ color: colorB, fontWeight: 600 }}>{lapDataB?.SpeedI1 ? `${lapDataB.SpeedI1.toFixed(0)}` : "—"}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tyre Compound & Stint */}
        <div
          className="panel"
          style={{
            padding: "14px 18px",
            borderLeft: `4px solid ${colorB}`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        >
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            TYRE COMPOUND & STINT
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: TYRE_COLOURS[lapDataA?.Compound ?? telemetryA?.compound ?? ""] ?? "#eee",
                }}
              >
                {lapDataA?.Compound ?? telemetryA?.compound ?? "SOFT"}
              </div>
              <div style={{ fontSize: 9, color: "#777", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
                L{lapDataA?.TyreLife ?? telemetryA?.tyre_life ?? 1} · STINT {lapDataA?.Stint ?? 1}
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#555", fontFamily: "IBM Plex Mono, monospace" }}>vs</div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: TYRE_COLOURS[lapDataB?.Compound ?? telemetryB?.compound ?? ""] ?? "#eee",
                }}
              >
                {lapDataB?.Compound ?? telemetryB?.compound ?? "SOFT"}
              </div>
              <div style={{ fontSize: 9, color: "#777", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
                L{lapDataB?.TyreLife ?? telemetryB?.tyre_life ?? 1} · STINT {lapDataB?.Stint ?? 1}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "#666" }}>
            <span>{lapDataA?.PitInTime ? "IN-LAP" : lapDataA?.PitOutTime ? "OUT-LAP" : "FLYING"}</span>
            <span>{lapDataB?.PitInTime ? "IN-LAP" : lapDataB?.PitOutTime ? "OUT-LAP" : "FLYING"}</span>
          </div>
        </div>

        {/* Card 5: Live Cursor Telemetry */}
        <div className="panel" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
            LIVE SPEED ({currentDist.toFixed(0)}m)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorA,
              }}
            >
              {cursorPointA?.Speed.toFixed(0) ?? 0} km/h
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  (cursorPointA?.Speed ?? 0) >= (cursorPointB?.Speed ?? 0)
                    ? colorA
                    : colorB,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 700,
              }}
            >
              {((cursorPointA?.Speed ?? 0) - (cursorPointB?.Speed ?? 0) > 0 ? "+" : "") +
                ((cursorPointA?.Speed ?? 0) - (cursorPointB?.Speed ?? 0)).toFixed(0)}{" "}
              km/h
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono, monospace",
                color: colorB,
              }}
            >
              {cursorPointB?.Speed.toFixed(0) ?? 0} km/h
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>
            <span style={{ color: colorA }}>G{cursorPointA?.nGear ?? 8} · {cursorPointA?.Throttle.toFixed(0) ?? 0}% TH</span>
            <span style={{ color: "#666" }}>vs</span>
            <span style={{ color: colorB }}>G{cursorPointB?.nGear ?? 8} · {cursorPointB?.Throttle.toFixed(0) ?? 0}% TH</span>
          </div>
        </div>
      </div>

      {/* ── Multi-Channel Overlaid / Split SVG Graphs ── */}
      <div className="panel" style={{ padding: "20px 24px" }}>
        <div
          className="panel-title"
          style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <h2>{layoutMode === "overlay" ? "OVERLAID TELEMETRY TRACES" : "SEPARATE SYNCHRONIZED TRACKS"}</h2>
            <span>
              {layoutMode === "overlay"
                ? "DISTINCT THIN SOLID (DRIVER A) & THIN DASHED (DRIVER B) TRACES"
                : "DEDICATED SYNCHRONIZED LANES FOR DRIVER A & DRIVER B"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 2.5,
                  background: colorA,
                  borderRadius: 1,
                  boxShadow: `0 0 6px ${colorA}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: colorA,
                  fontWeight: 700,
                }}
              >
                {driverA} (Solid)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 2.5,
                  borderTop: `2px dashed ${colorB}`,
                  boxShadow: `0 0 6px ${colorB}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  color: colorB,
                  fontWeight: 700,
                }}
              >
                {driverB} (Dashed)
              </span>
            </div>
          </div>
        </div>

        {/* ── Interactive Track Overview / Zoom Scrubber ── */}
        <div
          style={{
            marginBottom: 14,
            background: "#0c0c10",
            border: "1px solid #22222d",
            borderRadius: 6,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
              fontFamily: "IBM Plex Mono, monospace",
              marginBottom: 8,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#888898" }}>TRACK NAVIGATOR:</span>
              <strong style={{ color: zoomLevel > 1 ? "#00E5FF" : "#ffffff", letterSpacing: "0.04em" }}>
                {zoomLevel > 1
                  ? `🔍 ZOOM ${zoomLevel}x · VIEWING ${Math.round(viewStart)}m – ${Math.round(viewEnd)}m (${Math.round(windowSize)}m SPAN)`
                  : `1x FULL LAP VIEW (${Math.round(trackLength)}m)`}
              </strong>
              {zoomLevel > 1 && (
                <span
                  style={{
                    fontSize: 9,
                    color: "#ff8000",
                    background: "rgba(255, 128, 0, 0.12)",
                    border: "1px solid rgba(255, 128, 0, 0.3)",
                    padding: "2px 6px",
                    borderRadius: 3,
                    fontWeight: 700,
                  }}
                >
                  CLICK TRACK OR DRAG GRAPH TO PAN
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, color: "#888", alignItems: "center" }}>
              <span>0m</span>
              <span>CURSOR: <strong style={{ color: "#fff" }}>{cursorDist != null ? `${Math.round(cursorDist)}m` : "—"}</strong></span>
              <span>{Math.round(trackLength)}m</span>
              {zoomLevel > 1 && (
                <button
                  onClick={() => handleSetZoom(1)}
                  style={{
                    background: "rgba(225, 6, 0, 0.2)",
                    border: "1px solid #e10600",
                    color: "#fff",
                    borderRadius: 3,
                    padding: "2px 6px",
                    fontSize: 9,
                    fontFamily: "IBM Plex Mono, monospace",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  RESET (1x)
                </button>
              )}
            </div>
          </div>

          {/* Mini Track Scrubber Strip */}
          <div
            onClick={handleScrubberClick}
            style={{
              position: "relative",
              height: 28,
              background: "#14141c",
              border: "1px solid #282836",
              borderRadius: 4,
              cursor: "pointer",
              overflow: "hidden",
            }}
            title="Click anywhere to jump viewport to that section of the track"
          >
            {/* Corner ticks on mini scrubber */}
            {turns.map((t) => {
              const leftPct = (t.distance / trackLength) * 100;
              return (
                <div
                  key={t.number}
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "#2f2f42",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 1,
                      left: 2,
                      fontSize: 8,
                      color: "#666678",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontWeight: 700,
                      userSelect: "none",
                    }}
                  >
                    T{t.number}
                  </span>
                </div>
              );
            })}

            {/* Highlighted active zoom viewport window */}
            <div
              style={{
                position: "absolute",
                left: `${(viewStart / trackLength) * 100}%`,
                width: `${Math.max(2, (windowSize / trackLength) * 100)}%`,
                top: 0,
                bottom: 0,
                background: zoomLevel > 1 ? "rgba(225, 6, 0, 0.25)" : "rgba(0, 229, 255, 0.15)",
                borderLeft: `2px solid ${zoomLevel > 1 ? "#e10600" : "#00E5FF"}`,
                borderRight: `2px solid ${zoomLevel > 1 ? "#e10600" : "#00E5FF"}`,
                boxShadow: zoomLevel > 1 ? "0 0 10px rgba(225,6,0,0.4)" : "none",
                cursor: zoomLevel > 1 ? "grab" : "pointer",
                transition: isDraggingPan ? "none" : "left 0.1s, width 0.1s",
              }}
            />

            {/* Cursor indicator line */}
            {cursorDist !== null && (
              <div
                style={{
                  position: "absolute",
                  left: `${(cursorDist / trackLength) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#ffffff",
                  boxShadow: "0 0 4px #fff",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${totalHeight}`}
          width="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            if (!isPlaying) setCursorDist(null);
          }}
          onWheel={handleWheel}
          style={{
            cursor: zoomLevel > 1 ? (isDraggingPan ? "grabbing" : "grab") : "crosshair",
            overflow: "visible",
            userSelect: "none",
          }}
        >
          <defs>
            <filter id="glowA">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={colorA} floodOpacity="0.5" />
            </filter>
            <filter id="glowB">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={colorB} floodOpacity="0.5" />
            </filter>
            <clipPath id="chartPlotClip">
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={totalHeight - PAD.top - PAD.bottom}
              />
            </clipPath>
          </defs>

          {/* ── 1. SPEED CHANNEL (OVERLAY MODE) ── */}
          {layoutMode === "overlay" && (visibleChannel === "all" || visibleChannel === "speed") && (
            <g>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_SPEED - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              {/* Y-axis speed labels */}
              {[100, 150, 200, 250, 300, 350].filter((s) => s <= maxSpeed).map((s) => {
                const y = scaleSpeedY(s);
                return (
                  <g key={s}>
                    <line
                      x1={PAD.left}
                      y1={y}
                      x2={W - PAD.right}
                      y2={y}
                      stroke="#222230"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y + 3}
                      fill="#b0b0c2"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {s}
                    </text>
                  </g>
                );
              })}

              {/* Turn markers */}
              {turns
                .filter((t) => t.distance >= viewStart - 60 && t.distance <= viewEnd + 60)
                .map((t) => {
                  const x = scaleX(t.distance);
                  return (
                    <g
                      key={t.number}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusTurn(t.distance);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <line
                        x1={x}
                        y1={PAD.top}
                        x2={x}
                        y2={H_SPEED - PAD.bottom}
                        stroke="#444458"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <rect
                        x={x - 12}
                        y={PAD.top - 16}
                        width={24}
                        height={14}
                        rx={2}
                        fill="#181822"
                        stroke="#3a3a4c"
                      />
                      <text
                        x={x}
                        y={PAD.top - 6}
                        fill="#00E5FF"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="700"
                      >
                        T{t.number}
                      </text>
                    </g>
                  );
                })}

              {/* Clipped traces and markers */}
              <g clipPath="url(#chartPlotClip)">
                {/* Driver A: Crisp Thin Solid Line */}
                <path
                  d={speedPathA}
                  fill="none"
                  stroke={colorA}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowA)"
                />

                {/* Driver B: Crisp Thin Dashed Line */}
                <path
                  d={speedPathB}
                  fill="none"
                  stroke={colorB}
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowB)"
                />

                {/* Live ghost markers on curves */}
                {cursorPointA && cursorPointA.Distance >= viewStart && cursorPointA.Distance <= viewEnd && (
                  <circle
                    cx={scaleX(cursorPointA.Distance)}
                    cy={scaleSpeedY(cursorPointA.Speed)}
                    r={4.5}
                    fill={colorA}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
                {cursorPointB && cursorPointB.Distance >= viewStart && cursorPointB.Distance <= viewEnd && (
                  <rect
                    x={scaleX(cursorPointB.Distance) - 4}
                    y={scaleSpeedY(cursorPointB.Speed) - 4}
                    width={8}
                    height={8}
                    transform={`rotate(45, ${scaleX(cursorPointB.Distance)}, ${scaleSpeedY(cursorPointB.Speed)})`}
                    fill={colorB}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
              </g>

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#ffffff"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="700"
              >
                SPEED (KM/H) · SOLID: {driverA} | DASHED: {driverB}
              </text>
            </g>
          )}

          {/* ── 1. SPEED CHANNEL (SPLIT DUAL TRACKS MODE) ── */}
          {layoutMode === "split" && (visibleChannel === "all" || visibleChannel === "speed") && (
            <g>
              {/* Panel Driver A */}
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={130}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />
              <g clipPath="url(#chartPlotClip)">
                <path
                  d={speedPathSplitA}
                  fill="none"
                  stroke={colorA}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  filter="url(#glowA)"
                />
                {cursorPointA && cursorPointA.Distance >= viewStart && cursorPointA.Distance <= viewEnd && (
                  <circle
                    cx={scaleX(cursorPointA.Distance)}
                    cy={scaleSpeedY(cursorPointA.Speed, 160)}
                    r={4.5}
                    fill={colorA}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
              <text x={PAD.left + 8} y={PAD.top + 14} fill={colorA} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                {driverA} SPEED ({cursorPointA?.Speed.toFixed(0)} KM/H)
              </text>

              {/* Panel Driver B */}
              <g transform="translate(0, 150)">
                <rect
                  x={PAD.left}
                  y={PAD.top}
                  width={W - PAD.left - PAD.right}
                  height={130}
                  fill="#0a0a0d"
                  stroke="#1c1c24"
                />
                <g clipPath="url(#chartPlotClip)">
                  <path
                    d={speedPathSplitB}
                    fill="none"
                    stroke={colorB}
                    strokeWidth="1.8"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                    filter="url(#glowB)"
                  />
                  {cursorPointB && cursorPointB.Distance >= viewStart && cursorPointB.Distance <= viewEnd && (
                    <rect
                      x={scaleX(cursorPointB.Distance) - 4}
                      y={scaleSpeedY(cursorPointB.Speed, 160) - 4}
                      width={8}
                      height={8}
                      transform={`rotate(45, ${scaleX(cursorPointB.Distance)}, ${scaleSpeedY(cursorPointB.Speed, 160)})`}
                      fill={colorB}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
                <text x={PAD.left + 8} y={PAD.top + 14} fill={colorB} fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                  {driverB} SPEED ({cursorPointB?.Speed.toFixed(0)} KM/H)
                </text>
              </g>
            </g>
          )}

          {/* ── 2. DELTA TIME CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "delta") && (
            <g transform={`translate(0, ${visibleChannel === "all" ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) : 0})`}>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_DELTA - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              {/* Zero baseline */}
              <line
                x1={PAD.left}
                y1={scaleDeltaY(0)}
                x2={W - PAD.right}
                y2={scaleDeltaY(0)}
                stroke="#666678"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(0) + 3}
                fill="#ffffff"
                fontSize="9"
                fontWeight="700"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                0.0s
              </text>
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(1) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                +1.0s
              </text>
              <text
                x={PAD.left - 8}
                y={scaleDeltaY(-1) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                -1.0s
              </text>

              {/* Delta line */}
              <g clipPath="url(#chartPlotClip)">
                <path d={deltaPath} fill="none" stroke="#f5c518" strokeWidth="1.8" />
              </g>

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#ffffff"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="700"
              >
                TIME DELTA (Δt = {driverA} - {driverB})
              </text>
            </g>
          )}

          {/* ── 3. THROTTLE & BRAKE CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "inputs") && (
            <g
              transform={`translate(0, ${
                visibleChannel === "all"
                  ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) + H_DELTA
                  : 0
              })`}
            >
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_THROTTLE - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              <line
                x1={PAD.left}
                y1={scaleThrottleY(100)}
                x2={W - PAD.right}
                y2={scaleThrottleY(100)}
                stroke="#222230"
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 8}
                y={scaleThrottleY(100) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                100%
              </text>
              <text
                x={PAD.left - 8}
                y={scaleThrottleY(0) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                0%
              </text>

              {/* Throttle traces: Solid A vs Dashed B */}
              <g clipPath="url(#chartPlotClip)">
                <path d={throttlePathA} fill="none" stroke={colorA} strokeWidth="1.6" opacity="0.9" />
                <path d={throttlePathB} fill="none" stroke={colorB} strokeWidth="1.6" strokeDasharray="5 2.5" opacity="0.9" />
              </g>

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#ffffff"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="700"
              >
                THROTTLE % (SOLID: {driverA} | DASHED: {driverB})
              </text>
            </g>
          )}

          {/* ── 4. GEAR CHANNEL ── */}
          {(visibleChannel === "all" || visibleChannel === "inputs") && (
            <g
              transform={`translate(0, ${
                visibleChannel === "all"
                  ? (layoutMode === "split" ? H_SPEED_SPLIT_TOTAL : H_SPEED) + H_DELTA + H_THROTTLE
                  : H_THROTTLE
              })`}
            >
              <rect
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={H_GEAR - PAD.top - PAD.bottom}
                fill="#0a0a0d"
                stroke="#1c1c24"
              />

              <text
                x={PAD.left - 8}
                y={scaleGearY(8) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                G8
              </text>
              <text
                x={PAD.left - 8}
                y={scaleGearY(1) + 3}
                fill="#b0b0c2"
                fontSize="8"
                textAnchor="end"
                fontFamily="IBM Plex Mono, monospace"
              >
                G1
              </text>

              {/* Gear traces: Solid A vs Dashed B */}
              <g clipPath="url(#chartPlotClip)">
                <path d={gearPathA} fill="none" stroke={colorA} strokeWidth="1.6" />
                <path d={gearPathB} fill="none" stroke={colorB} strokeWidth="1.6" strokeDasharray="5 2.5" />
              </g>

              <text
                x={PAD.left + 8}
                y={PAD.top + 14}
                fill="#ffffff"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fontWeight="700"
              >
                GEAR SELECTION
              </text>
            </g>
          )}

          {/* ── Dynamic Distance X-Axis Marks & Grid Lines ── */}
          <g>
            {distanceTicks.map((d) => {
              const x = scaleX(d);
              if (x < PAD.left || x > W - PAD.right) return null;
              return (
                <g key={d}>
                  <line
                    x1={x}
                    y1={PAD.top}
                    x2={x}
                    y2={totalHeight - PAD.bottom}
                    stroke="#191924"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={x}
                    y1={totalHeight - PAD.bottom}
                    x2={x}
                    y2={totalHeight - PAD.bottom + 5}
                    stroke="#55556a"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={totalHeight - PAD.bottom + 15}
                    fill="#888899"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {d}m
                  </text>
                </g>
              );
            })}
          </g>

          {/* ── Simultaneous Hover/Play Cursor Bar ── */}
          {cursorDist !== null && cursorDist >= viewStart && cursorDist <= viewEnd && (
            <line
              x1={scaleX(cursorDist)}
              y1={PAD.top}
              x2={scaleX(cursorDist)}
              y2={totalHeight - PAD.bottom}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}

          {/* ── Tooltip Bubble ── */}
          {cursorDist !== null && cursorDist >= viewStart && cursorDist <= viewEnd && cursorPointA && cursorPointB && (
            <g
              transform={`translate(${Math.min(
                W - 200,
                Math.max(PAD.left + 10, scaleX(cursorDist) - 95)
              )}, ${PAD.top + 10})`}
            >
              <rect
                width="190"
                height="78"
                rx="6"
                fill="#101015"
                stroke="#2a2a35"
                opacity="0.96"
                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.7))"
              />
              <text x="12" y="16" fill="#dedee8" fontSize="9" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
                DISTANCE: {cursorDist.toFixed(0)}m / {trackLength.toFixed(0)}m
              </text>
              <text
                x="12"
                y="38"
                fill={colorA}
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                — {driverA}: {cursorPointA.Speed.toFixed(0)} km/h · G{cursorPointA.nGear} · {cursorPointA.Throttle.toFixed(0)}% TH
              </text>
              <text
                x="12"
                y="58"
                fill={colorB}
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                - - {driverB}: {cursorPointB.Speed.toFixed(0)} km/h · G{cursorPointB.nGear} · {cursorPointB.Throttle.toFixed(0)}% TH
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Turn Apex Speed Comparison Table ── */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>CORNER MINIMUM SPEED BREAKDOWN</h2>
            <span>APEX SPEED DELTAS ACROSS ALL {turns.length} CORNERS</span>
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              fontFamily: "IBM Plex Mono, monospace",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #22222a",
                  color: "#777782",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 16px" }}>CORNER</th>
                <th style={{ padding: "8px 16px" }}>DISTANCE</th>
                <th style={{ padding: "8px 16px", color: colorA }}>{driverA} (SOLID) APEX</th>
                <th style={{ padding: "8px 16px", color: colorB }}>{driverB} (DASHED) APEX</th>
                <th style={{ padding: "8px 16px" }}>DELTA</th>
                <th style={{ padding: "8px 16px" }}>ADVANTAGE</th>
                <th style={{ padding: "8px 16px", textAlign: "right" }}>INSPECT</th>
              </tr>
            </thead>
            <tbody>
              {turnAnalysis.map((t) => {
                const diff = t.speedA - t.speedB;
                const adv = diff > 0 ? driverA : diff < 0 ? driverB : "EQUAL";
                const advColor = diff > 0 ? colorA : diff < 0 ? colorB : "#888";
                const isNear = cursorDist !== null && Math.abs(cursorDist - t.distance) < 40;
                return (
                  <tr
                    key={t.turn}
                    onClick={() => handleFocusTurn(t.distance)}
                    style={{
                      borderBottom: "1px solid #14141a",
                      cursor: "pointer",
                      background: isNear ? "rgba(0, 229, 255, 0.08)" : "transparent",
                      transition: "background 0.15s",
                    }}
                    title={`Click to zoom directly into Turn ${t.turn} (${t.distance}m)`}
                  >
                    <td style={{ padding: "8px 16px", fontWeight: 700, color: "#eee" }}>
                      T{t.turn}
                    </td>
                    <td style={{ padding: "8px 16px", color: "#777" }}>{t.distance}m</td>
                    <td style={{ padding: "8px 16px", color: colorA, fontWeight: 600 }}>
                      {t.speedA} km/h
                    </td>
                    <td style={{ padding: "8px 16px", color: colorB, fontWeight: 600 }}>
                      {t.speedB} km/h
                    </td>
                    <td
                      style={{
                        padding: "8px 16px",
                        color: diff >= 0 ? "#34d399" : "#e10600",
                        fontWeight: 700,
                      }}
                    >
                      {diff > 0 ? `+${diff}` : diff} km/h
                    </td>
                    <td style={{ padding: "8px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: `${advColor}22`,
                          color: advColor,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {adv}
                      </span>
                    </td>
                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusTurn(t.distance);
                        }}
                        style={{
                          background: "#161622",
                          border: "1px solid #2e2e42",
                          color: "#00E5FF",
                          borderRadius: 3,
                          padding: "3px 8px",
                          fontSize: 9,
                          fontFamily: "IBM Plex Mono, monospace",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🔍 ZOOM T{t.turn}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
