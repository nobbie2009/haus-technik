import { newId } from "../../utils/uuid";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook, networkLabels, type Housebook } from "../../housebook/model";
import { Field, updateBook } from "./shared";
export function NetworkPanel() {
  const project = useProjectStore((s) => s.project),
    editor = useEditorStore(),
    book = housebook(project);
  const [name, setName] = useState("Netzwerkdose"),
    [kind, setKind] = useState<Housebook["networkNodes"][number]["kind"]>("socket");
  const [ports, setPorts] = useState(2),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [editing, setEditing] = useState<string | null>(null);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [fromPort, setFromPort] = useState(1),
    [toPort, setToPort] = useState(1),
    [cable, setCable] = useState("Cat 6A"),
    [label, setLabel] = useState("NET-01"),
    [allowance, setAllowance] = useState(0);
  return (
    <section>
      <h3>Netzwerk und Portbelegung</h3>
      <p>
        Netzwerkdosen, Patchpanel und aktive Geräte mit eindeutigen Ports dokumentieren. Verbindungen
        erscheinen violett im Plan. Längen sind Luftlinien einschließlich Etagenhöhe und Zuschlag.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const id = editing ?? newId();
          if (
            updateBook(editing ? "Netzwerkgerät ändern" : "Netzwerkgerät anlegen", (b) => {
              const previous = b.networkNodes.find((n) => n.id === id);
              const node = {
                id,
                name,
                kind,
                ports,
                position: { x, y },
                floorId: previous?.floorId ?? editor.floorId,
              };
              if (previous) Object.assign(previous, node);
              else b.networkNodes.push(node);
            })
          )
            setEditing(null);
        }}
      >
        <div className="book-grid">
          <Field label="Netzwerkname">
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Geräteart">
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {Object.entries(networkLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Anzahl Ports">
            <input
              type="number"
              min="1"
              max="256"
              required
              value={ports}
              onChange={(e) => setPorts(Number(e.target.value))}
            />
          </Field>
          <Field label="Position X (mm)">
            <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
          </Field>
          <Field label="Position Y (mm)">
            <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
          </Field>
        </div>
        <div className="book-actions">
          <button>{editing ? "Netzwerkgerät speichern" : "Netzwerkgerät hinzufügen"}</button>
          <button
            type="button"
            onClick={() => {
              setX(editor.cursor.x);
              setY(editor.cursor.y);
            }}
          >
            Letzte Planposition übernehmen
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(null)}>
              Bearbeiten abbrechen
            </button>
          )}
        </div>
      </form>
      <ul className="book-list">
        {book.networkNodes.map((n) => (
          <li key={n.id}>
            <span>
              <strong>{n.name}</strong> · {networkLabels[n.kind]} · {n.ports} Ports ·{" "}
              {project.floors[n.floorId]?.name ?? "Etage gelöscht"}
            </span>
            <button
              onClick={() => {
                setEditing(n.id);
                setName(n.name);
                setKind(n.kind);
                setPorts(n.ports);
                setX(n.position.x);
                setY(n.position.y);
              }}
            >
              Bearbeiten
            </button>
            <button
              onClick={() =>
                updateBook("Netzwerkgerät samt Verbindungen löschen", (b) => {
                  b.networkNodes = b.networkNodes.filter((v) => v.id !== n.id);
                  b.networkLinks = b.networkLinks.filter((v) => v.from !== n.id && v.to !== n.id);
                })
              }
            >
              Löschen
            </button>
          </li>
        ))}
      </ul>
      <h4>Ports verbinden</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateBook("Netzwerkverbindung anlegen", (b) => {
            b.networkLinks.push({
              id: newId(),
              name: label,
              from,
              to,
              fromPort,
              toPort,
              cableType: cable,
              allowance,
            });
          });
        }}
      >
        <div className="book-grid">
          <Field label="Von Gerät">
            <select required value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Wählen …</option>
              {book.networkNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Von Port">
            <input
              type="number"
              min="1"
              required
              value={fromPort}
              onChange={(e) => setFromPort(Number(e.target.value))}
            />
          </Field>
          <Field label="Zu Gerät">
            <select required value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Wählen …</option>
              {book.networkNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zu Port">
            <input
              type="number"
              min="1"
              required
              value={toPort}
              onChange={(e) => setToPort(Number(e.target.value))}
            />
          </Field>
          <Field label="Kabelkennzeichnung">
            <input required value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Kabeltyp">
            <input required value={cable} onChange={(e) => setCable(e.target.value)} />
          </Field>
          <Field label="Längenzuschlag (mm)">
            <input
              type="number"
              min="0"
              value={allowance}
              onChange={(e) => setAllowance(Number(e.target.value))}
            />
          </Field>
        </div>
        <button>Ports verbinden</button>
      </form>
      <ul className="book-list">
        {book.networkLinks.map((l) => {
          const a = book.networkNodes.find((n) => n.id === l.from)!,
            b = book.networkNodes.find((n) => n.id === l.to)!;
          const length =
            Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) +
            Math.abs(
              (project.floors[a.floorId]?.elevation ?? 0) - (project.floors[b.floorId]?.elevation ?? 0),
            ) +
            l.allowance;
          return (
            <li key={l.id}>
              <span>
                {l.name}: {a.name}:{l.fromPort} → {b.name}:{l.toPort} · {l.cableType} ·{" "}
                {(length / 1000).toFixed(2)} m
              </span>
              <button
                onClick={() =>
                  updateBook("Netzwerkverbindung lösen", (book) => {
                    book.networkLinks = book.networkLinks.filter((v) => v.id !== l.id);
                  })
                }
              >
                Lösen
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
