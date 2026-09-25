import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field, updateBook } from "../housebook/shared";
import { housebook } from "../../housebook/model";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { newId } from "../../utils/uuid";
export const signalColor = (dbm: number) => (dbm >= -60 ? "#16835f" : dbm >= -75 ? "#b87916" : "#b33e35");
export function WifiSurvey({ onClose }: { onClose: () => void }) {
  const p = useProjectStore((s) => s.project),
    editor = useEditorStore(),
    book = housebook(p);
  const [source, setSource] = useState("");
  const [position, setPosition] = useState({ ...editor.cursor });
  const [name, setName] = useState("Messpunkt"),
    [signal, setSignal] = useState(-65);
  const [down, setDown] = useState(""),
    [up, setUp] = useState(""),
    [id, setId] = useState("");
  const [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const all = book.wifiMeasurements.filter((m) => m.floorId === editor.floorId);
  const measures = all.filter((m) => !source || m.sourceId === source);
  const pts = [
    ...Object.values(p.points)
      .filter((n) => n.floorId === editor.floorId)
      .map((n) => n.position),
    ...all.map((m) => m.position),
  ];
  const xs = pts.length ? pts.map((v) => v.x) : [0, 8000],
    ys = pts.length ? pts.map((v) => v.y) : [-6000, 0];
  const minX = Math.min(...xs) - 1000,
    maxX = Math.max(...xs) + 1000;
  const minY = Math.min(...ys) - 1000,
    maxY = Math.max(...ys) + 1000;
  const width = maxX - minX,
    height = maxY - minY;
  return (
    <Modal title="WLAN-Messkarte" onClose={onClose}>
      <p>
        Messwerte aus deinem WLAN-Messwerkzeug eintragen. Ein Browser kann die WLAN-Signalstärke nicht selbst
        auslesen. Die farbigen Kreise zeigen ausschließlich Messstellen, keine berechnete Funkabdeckung.
      </p>
      <Field label="Messgeschoss">
        <select
          value={editor.floorId}
          onChange={(e) => {
            editor.setFloor(e.target.value);
            setId("");
          }}
        >
          {p.floorOrder.map((f) => (
            <option key={f} value={f}>
              {p.floors[f]?.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Access Point / Sender">
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Alle Sender anzeigen</option>
          {book.networkNodes
            .filter((n) => ["router", "accessPoint", "repeater"].includes(n.kind))
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
        </select>
      </Field>
      <svg
        role="img"
        aria-label="WLAN-Messstellen im Grundriss"
        viewBox={`${minX} ${-maxY} ${width} ${height}`}
        style={{ width: "100%", height: 300, background: "#f3f7f5", touchAction: "manipulation" }}
        onClick={(e) => {
          const matrix = e.currentTarget.getScreenCTM();
          if (!matrix) return;
          const v = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
          setPosition({ x: Math.round(v.x), y: Math.round(-v.y) });
          setId("");
        }}
      >
        {Object.values(p.walls)
          .filter((w) => w.floorId === editor.floorId)
          .map((w) => {
            const a = p.points[w.startPointId]!.position,
              b = p.points[w.endPointId]!.position;
            return (
              <line
                key={w.id}
                x1={a.x}
                y1={-a.y}
                x2={b.x}
                y2={-b.y}
                stroke="#596966"
                strokeWidth={w.thickness}
              />
            );
          })}
        {measures.map((m) => (
          <g key={m.id}>
            <circle
              cx={m.position.x}
              cy={-m.position.y}
              r={width / 45}
              fill={signalColor(m.signalDbm)}
              opacity={0.7}
            />
            <text
              x={m.position.x}
              y={-m.position.y - width / 35}
              fontSize={Math.max(width / 35, height / 24)}
            >
              {m.signalDbm} dBm
            </text>
          </g>
        ))}
        <circle
          cx={position.x}
          cy={-position.y}
          r={width / 70}
          fill="none"
          stroke="#152e48"
          strokeWidth={width / 400}
        />
      </svg>
      <p>
        Grün: ab −60 dBm · Gelb: −75 bis unter −60 dBm · Rot: unter −75 dBm. Punkt in der Karte wählen oder
        Koordinaten eingeben.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!source) {
            setError("Bitte einen Sender wählen.");
            return;
          }
          const ok = updateBook("WLAN-Messung speichern", (b) => {
            const item = {
              id: id || newId(),
              name,
              floorId: editor.floorId,
              position,
              sourceId: source,
              signalDbm: signal,
              notes,
              measuredAt: new Date().toISOString(),
              ...(down !== "" ? { downloadMbps: Number(down) } : {}),
              ...(up !== "" ? { uploadMbps: Number(up) } : {}),
            };
            b.wifiMeasurements = [...b.wifiMeasurements.filter((m) => m.id !== item.id), item];
          });
          setError(
            ok ? "Messung gespeichert." : (useProjectStore.getState().error ?? "Speichern fehlgeschlagen."),
          );
          if (ok) setId("");
        }}
      >
        <div className="book-grid">
          <Field label="Messstelle">
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Empfang (dBm)">
            <input
              type="number"
              min={-120}
              max={0}
              required
              value={signal}
              onChange={(e) => setSignal(Number(e.target.value))}
            />
          </Field>
          {(["x", "y"] as const).map((axis) => (
            <Field key={axis} label={`Messposition ${axis.toUpperCase()} (mm)`}>
              <input
                type="number"
                value={position[axis]}
                onChange={(e) => setPosition({ ...position, [axis]: Number(e.target.value) })}
              />
            </Field>
          ))}
          <Field label="Download (Mbit/s)">
            <input
              type="number"
              min={0}
              max={100000}
              step="any"
              value={down}
              onChange={(e) => setDown(e.target.value)}
            />
          </Field>
          <Field label="Upload (Mbit/s)">
            <input
              type="number"
              min={0}
              max={100000}
              step="any"
              value={up}
              onChange={(e) => setUp(e.target.value)}
            />
          </Field>
          <Field label="Messbedingungen / Notiz">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <button>{id ? "Messung aktualisieren" : "Neue Messung speichern"}</button>
      </form>
      {error && <p role="status">{error}</p>}
      <ul className="book-list">
        {measures.map((m) => (
          <li key={m.id}>
            <span>
              <strong>{m.name}</strong> · {m.signalDbm} dBm · ↓ {m.downloadMbps ?? "–"} / ↑{" "}
              {m.uploadMbps ?? "–"} Mbit/s ·{" "}
              {m.measuredAt ? new Date(m.measuredAt).toLocaleString("de-DE") : "Messzeit unbekannt"}
            </span>
            <button
              onClick={() => {
                setId(m.id);
                setName(m.name);
                setPosition(m.position);
                setSource(m.sourceId);
                setSignal(m.signalDbm);
                setDown(m.downloadMbps?.toString() ?? "");
                setUp(m.uploadMbps?.toString() ?? "");
                setNotes(m.notes);
              }}
            >
              Bearbeiten
            </button>
            <button
              onClick={() =>
                updateBook("WLAN-Messung löschen", (b) => {
                  b.wifiMeasurements = b.wifiMeasurements.filter((v) => v.id !== m.id);
                })
              }
            >
              Löschen
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
