import { useMemo } from "react";
import type { TrackPoint, Turn } from "../types";

interface Props {
  trackPoints: TrackPoint[];
  turns: Turn[];
  /** Index into trackPoints array for the live car position */
  carIndex: number;
  trackLength: number;
}

function projectPoints(pts: TrackPoint[]) {
  if (!pts || pts.length === 0) return { projected: [], minX: 0, maxX: 1, minY: 0, maxY: 1 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as any;
    const x = p.x ?? p.X ?? 0;
    const y = p.y ?? p.Y ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (minX === Infinity || isNaN(minX)) { minX = 0; maxX = 1; minY = 0; maxY = 1; }
  return { projected: pts, minX, maxX, minY, maxY };
}

function toSvg(
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  W: number,
  H: number,
  pad: number
): [number, number] {
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((W - 2 * pad) / rangeX, (H - 2 * pad) / rangeY);
  const cx = (W - rangeX * scale) / 2;
  const cy = (H - rangeY * scale) / 2;
  return [cx + (x - minX) * scale, cy + (maxY - y) * scale];
}

export default function TrackMap({ trackPoints, turns, carIndex, trackLength }: Props) {
  const W = 500;
  const H = 420;
  const PAD = 28;

  const { projected, minX, maxX, minY, maxY } = useMemo(
    () => projectPoints(trackPoints),
    [trackPoints]
  );

  const svgPoints = useMemo(
    () =>
      projected.map((p: any) =>
        toSvg(p.x ?? p.X ?? 0, p.y ?? p.Y ?? 0, minX, maxX, minY, maxY, W, H, PAD)
      ),
    [projected, minX, maxX, minY, maxY]
  );

  const polylineStr = svgPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const turnSvgPositions = useMemo(
    () =>
      (turns || []).map((t: any) => ({
        ...t,
        sx: toSvg(
          t.telemetry_x ?? t.x ?? 0,
          t.telemetry_y ?? t.y ?? 0,
          minX,
          maxX,
          minY,
          maxY,
          W,
          H,
          PAD
        ),
      })),
    [turns, minX, maxX, minY, maxY]
  );

  const carPt = svgPoints.length > 0 ? svgPoints[Math.max(0, Math.min(carIndex, svgPoints.length - 1))] : null;

  // Sector colours (rough 3-sector split)
  const sec1End = trackLength * 0.33;
  const sec2End = trackLength * 0.66;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      className="track-chart"
      style={{ display: "block" }}
    >
      {/* Background gradient */}
      <defs>
        <radialGradient id="trackGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e10600" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#070707" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#trackGlow)" />

      {/* Sector highlight bands */}
      {svgPoints.length > 2 && (() => {
        const pts = trackPoints;
        const s1Idx = pts.findIndex((p) => p.distance >= sec1End);
        const s2Idx = pts.findIndex((p) => p.distance >= sec2End);
        const s1 = s1Idx > 0 ? s1Idx : Math.floor(pts.length / 3);
        const s2 = s2Idx > 0 ? s2Idx : Math.floor((pts.length * 2) / 3);
        const seg1 = svgPoints.slice(0, s1 + 1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const seg2 = svgPoints.slice(s1, s2 + 1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const seg3 = svgPoints.slice(s2).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        return (
          <>
            {/* Shadow / glow */}
            <polyline points={polylineStr} fill="none" stroke="rgba(225,6,0,0.12)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            {/* S1 — red */}
            <polyline points={seg1} fill="none" stroke="#e10600" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            {/* S2 — yellow */}
            <polyline points={seg2} fill="none" stroke="#f5c518" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            {/* S3 — purple */}
            <polyline points={seg3} fill="none" stroke="#9b59b6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          </>
        );
      })()}

      {/* Start/finish line */}
      {svgPoints.length > 0 && (() => {
        const [sx, sy] = svgPoints[0];
        return (
          <g>
            <line x1={sx - 8} y1={sy - 2} x2={sx + 8} y2={sy + 2} stroke="white" strokeWidth="2.5" />
            <text x={sx + 12} y={sy + 4} fill="#fff" fontSize="7" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.05em">SF</text>
          </g>
        );
      })()}

      {/* Turn markers */}
      {turnSvgPositions.map((t) => {
        const [sx, sy] = t.sx;
        const n = t.number;
        // Offset label outward
        const offsetX = sx < W / 2 ? -12 : 8;
        const offsetY = sy < H / 2 ? -8 : 14;
        return (
          <g key={n}>
            <circle cx={sx} cy={sy} r={6} fill="#0c0c0e" stroke="#636368" strokeWidth="1.2" />
            <text
              x={sx + offsetX}
              y={sy + offsetY}
              fill="#aaaaaF"
              fontSize="7"
              fontFamily="IBM Plex Mono, monospace"
              fontWeight="600"
              textAnchor="middle"
            >
              T{String(n).padStart(2, "0")}
            </text>
          </g>
        );
      })}

      {/* Car position */}
      {carPt && !isNaN(carPt[0]) && !isNaN(carPt[1]) && (
        <g filter="url(#glow)">
          <circle cx={carPt[0]} cy={carPt[1]} r={10} fill="none" stroke="white" strokeWidth="1" opacity="0.4" />
          <circle cx={carPt[0]} cy={carPt[1]} r={6} fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
          <circle cx={carPt[0]} cy={carPt[1]} r={4} fill="#e10600" stroke="white" strokeWidth="1.5" />
        </g>
      )}

      {/* Sector legend */}
      <g>
        <rect x="12" y={H - 22} width="7" height="7" fill="#e10600" />
        <text x="22" y={H - 15} fill="#888" fontSize="7" fontFamily="IBM Plex Mono, monospace">S1</text>
        <rect x="40" y={H - 22} width="7" height="7" fill="#f5c518" />
        <text x="50" y={H - 15} fill="#888" fontSize="7" fontFamily="IBM Plex Mono, monospace">S2</text>
        <rect x="68" y={H - 22} width="7" height="7" fill="#9b59b6" />
        <text x="78" y={H - 15} fill="#888" fontSize="7" fontFamily="IBM Plex Mono, monospace">S3</text>
      </g>
    </svg>
  );
}
