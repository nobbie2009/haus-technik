import type { Vec2 } from "../../models/common";
export function GpsPreview({
  points,
  current,
  radius,
  closed,
}: {
  points: Vec2[];
  current: Vec2 | null;
  radius: number;
  closed: boolean;
}) {
  const all = [
    ...points,
    ...(current
      ? [
          { x: current.x - radius, y: current.y - radius },
          { x: current.x + radius, y: current.y + radius },
        ]
      : []),
  ];
  if (!all.length) return null;
  const minX = Math.min(...all.map((p) => p.x)),
    maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y)),
    maxY = Math.max(...all.map((p) => p.y));
  const scale = Math.min(280 / Math.max(1000, maxX - minX), 140 / Math.max(1000, maxY - minY));
  const x = (p: Vec2) => 160 + (p.x - (minX + maxX) / 2) * scale,
    y = (p: Vec2) => 90 - (p.y - (minY + maxY) / 2) * scale;
  return (
    <svg
      className="gps-preview"
      viewBox="0 0 320 180"
      role="img"
      aria-label="GPS-Vorschau mit aufgenommenen Punkten und Unsicherheitskreis"
    >
      {current && (
        <circle
          cx={x(current)}
          cy={y(current)}
          r={radius * scale}
          fill="#176fba15"
          stroke="#176fba"
          strokeDasharray="4 4"
        />
      )}
      <polyline
        points={[...points, ...(closed && points.length > 2 ? [points[0]!] : [])]
          .map((p) => `${x(p)},${y(p)}`)
          .join(" ")}
        fill="none"
        stroke="#47805a"
        strokeWidth="2"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(p)} cy={y(p)} r="4" fill="#47805a" />
          <text x={x(p) + 6} y={y(p) - 6} fontSize="12">
            P{i + 1}
          </text>
        </g>
      ))}
      {current && <circle cx={x(current)} cy={y(current)} r="5" fill="#176fba" />}
    </svg>
  );
}
