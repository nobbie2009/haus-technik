import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "./shared";
import { useProjectStore } from "../../stores/projectStore";
import { asset } from "../../housebook/model";
import { wallObjects, mountOnWall } from "../../housebook/wallElevation";
export function WallElevationDialog({ wallId, onClose }: { wallId: string; onClose: () => void }) {
  const p = useProjectStore((s) => s.project),
    wall = p.walls[wallId]!;
  const [id, setId] = useState(""),
    [x, setX] = useState(500),
    [height, setHeight] = useState(300),
    [side, setSide] = useState<1 | -1>(1),
    [message, setMessage] = useState("");
  const a = p.points[wall.startPointId]!.position,
    b = p.points[wall.endPointId]!.position,
    length = Math.hypot(b.x - a.x, b.y - a.y),
    items = wallObjects(p, wallId);
  const selected = items.find((i) => i.id === id),
    locked = p.layers[wall.layerId]?.locked || !!(selected && p.layers[selected.layerId]?.locked);
  const choose = (key: string) => {
    setId(key);
    const m = asset(items.find((i) => i.id === key)!).mounting;
    if (m?.wallId === wallId) {
      setX(m.distance);
      setHeight(m.height);
      setSide(m.offset < 0 ? -1 : 1);
    }
  };
  const save = (distance = x, h = height) => {
    const ok = useProjectStore
      .getState()
      .commit("Wandansicht: Montagepunkt setzen", (d) => mountOnWall(d, wallId, id, distance, h, side));
    setMessage(
      ok ? "Montagepunkt gespeichert." : (useProjectStore.getState().error ?? "Speichern fehlgeschlagen."),
    );
  };
  const sx = (distance: number) => (side === 1 ? distance : length - distance);
  return (
    <Modal title="Wandansicht" className="housebook-dialog" onClose={onClose}>
      <p>
        Wand von vorne: {Math.round(length)} × {wall.height} mm. Objekt auswählen und Montagepunkt antippen
        oder Maße eingeben. A bezeichnet den Wandanfang. Änderungen übernehmen die Position in den Grundriss.
      </p>
      <div className="book-grid">
        <Field label="Wandseite">
          <select value={side} onChange={(e) => setSide(Number(e.target.value) as 1 | -1)}>
            <option value={1}>Linke Wandseite, A nach B</option>
            <option value={-1}>Rechte Wandseite, B nach A</option>
          </select>
        </Field>
        <Field label="Objekt in Wandansicht">
          <select
            value={id}
            onChange={(e) => {
              if (e.target.value) choose(e.target.value);
              else setId("");
            }}
          >
            <option value="">Vorhandenes Objekt auswählen</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <svg
        data-testid="wall-elevation"
        role="img"
        aria-label="Wandansicht mit Montagepunkten"
        viewBox={`-150 -150 ${length + 300} ${wall.height + 300}`}
        style={{ width: "100%", maxHeight: 430, touchAction: "pan-y", background: "#f3f7f5" }}
        onPointerUp={(e) => {
          if (!id || locked) return;
          const matrix = e.currentTarget.getScreenCTM();
          if (!matrix) return;
          const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
          if (point.x < 0 || point.x > length || point.y < 0 || point.y > wall.height) return;
          const distance = Math.round(side === 1 ? point.x : length - point.x),
            h = Math.round(wall.height - point.y);
          setX(distance);
          setHeight(h);
          save(distance, h);
        }}
      >
        <rect width={length} height={wall.height} fill="white" stroke="#526965" strokeWidth={20} />
        <text x={sx(0)} y={-40} fontSize={100}>
          A
        </text>
        <text x={sx(length)} y={-40} fontSize={100}>
          B
        </text>
        {[...Object.values(p.doors), ...Object.values(p.windows)]
          .filter((o) => o.wallId === wallId)
          .map((o) => (
            <rect
              key={o.id}
              x={sx(o.position) - o.width / 2}
              y={wall.height - ("sillHeight" in o ? o.sillHeight : 0) - o.height}
              width={o.width}
              height={o.height}
              fill={"sillHeight" in o ? "#dae9ee" : "#eee9df"}
              stroke="#526965"
              strokeWidth={10}
            />
          ))}
        {items
          .filter((i) => {
            const m = asset(i).mounting;
            return m?.wallId === wallId && (m.offset < 0 ? -1 : 1) === side;
          })
          .map((i) => {
            const m = asset(i).mounting!;
            return (
              <g
                key={i.id}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  choose(i.id);
                }}
              >
                <circle
                  cx={sx(m.distance)}
                  cy={wall.height - m.height}
                  r={60}
                  fill={i.id === id ? "#c04a00" : "#087e68"}
                />
                <text x={sx(m.distance) + 80} y={wall.height - m.height} fontSize={90}>
                  {i.name} · {Math.round(m.height)} mm
                </text>
              </g>
            );
          })}
      </svg>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="book-grid">
          <Field label="Montageabstand ab A (mm)">
            <input
              required
              type="number"
              min={0}
              max={length}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
            />
          </Field>
          <Field label="Montagehöhe ab Boden (mm)">
            <input
              required
              type="number"
              min={0}
              max={wall.height}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </Field>
        </div>
        <button disabled={!id || locked}>Montagepunkt speichern</button>
      </form>
      <p>
        Symbole kennzeichnen den Bezugspunkt, nicht den vollständigen Umriss des Geräts. Fenster und Türen
        werden maßstäblich dargestellt. Neue Geräte zunächst im Grundriss platzieren.
      </p>
      {message && <p role="status">{message}</p>}
    </Modal>
  );
}
