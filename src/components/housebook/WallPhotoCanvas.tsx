import { useRef } from "react";
import { traceTypes, type WallPhoto, type PhotoPoint } from "../../housebook/wallPhotos";

export function WallPhotoCanvas({
  photo,
  points,
  mode,
  zoom,
  selected,
  onPoint,
  onSelect,
}: {
  photo: WallPhoto;
  points: PhotoPoint[];
  mode: "select" | "draw" | "calibrate" | "reference";
  zoom: number;
  selected: string | null;
  onPoint: (point: PhotoPoint) => void;
  onSelect: (id: string) => void;
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    multiple = useRef(false);
  const coords = (ps: PhotoPoint[]) =>
    ps.map((p) => `${p.x * photo.pixelWidth},${p.y * photo.pixelHeight}`).join(" ");
  const size = Math.max(12, photo.pixelWidth / 65),
    stroke = Math.max(3, photo.pixelWidth / 350);
  return (
    <div className="wall-photo-scroll">
      <svg
        className="wall-photo-canvas"
        data-testid="wall-photo-canvas"
        role="img"
        aria-label={`Wandfoto ${photo.name} mit Leitungsverläufen`}
        viewBox={`0 0 ${photo.pixelWidth} ${photo.pixelHeight}`}
        style={{ width: `${zoom * 100}%` }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size > 1) multiple.current = true;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          if (!pointers.current.size) multiple.current = false;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") pointers.current.delete(e.pointerId);
        }}
        onPointerUp={(e) => {
          const start = pointers.current.get(e.pointerId),
            blocked = multiple.current;
          pointers.current.delete(e.pointerId);
          if (!pointers.current.size) multiple.current = false;
          if (!start || blocked || Math.hypot(start.x - e.clientX, start.y - e.clientY) > 8) return;
          if (mode === "select") {
            const id = (e.target as Element).closest("[data-trace]")?.getAttribute("data-trace");
            if (id) onSelect(id);
            return;
          }
          const box = e.currentTarget.getBoundingClientRect();
          onPoint({
            x: Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)),
            y: Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)),
          });
        }}
      >
        <image href={photo.data} width={photo.pixelWidth} height={photo.pixelHeight} />
        {(photo.references ?? []).map((r) => (
          <g key={r.id}>
            <circle
              cx={r.point.x * photo.pixelWidth}
              cy={r.point.y * photo.pixelHeight}
              r={stroke * 3}
              fill="white"
              stroke="#6351aa"
              strokeWidth={stroke}
            />
            <text
              x={r.point.x * photo.pixelWidth + size}
              y={r.point.y * photo.pixelHeight}
              fontSize={size}
              fill="#6351aa"
              stroke="white"
              strokeWidth={2}
              paintOrder="stroke"
            >
              {r.name}
            </text>
          </g>
        ))}
        {photo.traces.map((t) => (
          <g key={t.id} data-trace={t.id}>
            <polyline points={coords(t.points)} fill="none" stroke="white" strokeWidth={stroke + 3} />
            <polyline
              points={coords(t.points)}
              fill="none"
              stroke={traceTypes[t.type].color}
              strokeWidth={selected === t.id ? stroke + 3 : stroke}
              strokeDasharray={t.type === "return" ? `${stroke * 3} ${stroke * 2}` : undefined}
            />
            <polyline points={coords(t.points)} fill="none" stroke="transparent" strokeWidth={stroke * 7} />
            <text
              x={Math.max(
                2,
                Math.min(photo.pixelWidth - size * 10, t.points[0]!.x * photo.pixelWidth + size / 2),
              )}
              y={Math.max(size, t.points[0]!.y * photo.pixelHeight - size / 2)}
              fontSize={size}
              fontFamily="sans-serif"
              fill={traceTypes[t.type].color}
              stroke="white"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {t.name}
            </text>
          </g>
        ))}
        {photo.calibration && mode !== "calibrate" && (
          <polyline
            points={coords(photo.calibration.points)}
            fill="none"
            stroke="#167863"
            strokeWidth={stroke}
            strokeDasharray={`${stroke * 2} ${stroke * 2}`}
          />
        )}
        {points.length > 0 && (
          <g pointerEvents="none">
            <polyline points={coords(points)} fill="none" stroke="white" strokeWidth={stroke + 3} />
            <polyline points={coords(points)} fill="none" stroke="#167863" strokeWidth={stroke} />
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x * photo.pixelWidth}
                  cy={p.y * photo.pixelHeight}
                  r={stroke * 2}
                  fill="white"
                  stroke="#167863"
                  strokeWidth={stroke}
                />
                <text
                  x={p.x * photo.pixelWidth + size / 2}
                  y={p.y * photo.pixelHeight + size}
                  fontSize={size}
                  fill="#167863"
                  stroke="white"
                  strokeWidth={2}
                  paintOrder="stroke"
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
