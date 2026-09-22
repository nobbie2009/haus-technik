import { networkCableLength } from "../../network/cables";
import { isTvKind, tvDefaults, portName } from "../../network/tv";
import { networkPorts } from "../../network/model";
import { newId } from "../../utils/uuid";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook, networkLabels, type Housebook } from "../../housebook/model";
import { Field, updateBook } from "./shared";
import { poeDefaults } from "../../network/poe";
export function NetworkPanel({
  tvOnly = false,
  onDrawPath,
}: {
  tvOnly?: boolean;
  onDrawPath?: (id: string) => void;
}) {
  const project = useProjectStore((s) => s.project),
    editor = useEditorStore(),
    book = housebook(project);
  const error = useProjectStore((s) => s.error);
  const [name, setName] = useState(tvOnly ? "SAT-Schüssel" : "Netzwerkdose"),
    [kind, setKind] = useState<Housebook["networkNodes"][number]["kind"]>(tvOnly ? "satDish" : "socket");
  const [ports, setPorts] = useState(tvOnly ? 4 : 2),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [editing, setEditing] = useState<string | null>(null);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [fromPort, setFromPort] = useState(1),
    [toPort, setToPort] = useState(1),
    [cable, setCable] = useState(tvOnly ? "Koax 75 Ohm" : "Cat 6A"),
    [label, setLabel] = useState(tvOnly ? "SAT-01" : "NET-01"),
    [allowance, setAllowance] = useState(0);
  const [measurementName, setMeasurementName] = useState("Messpunkt"),
    [sourceId, setSourceId] = useState(""),
    [signalDbm, setSignalDbm] = useState(-60),
    [measurementNotes, setMeasurementNotes] = useState("");
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const nodes = book.networkNodes.filter((n) => !tvOnly || isTvKind(n.kind));
  const wifiSources = book.networkNodes.filter((n) => ["router", "accessPoint", "repeater"].includes(n.kind));
  return (
    <section>
      {tvOnly && error && <p role="alert">{error}</p>}
      <h3>{tvOnly ? "TV / SAT und Koaxanschlüsse" : "Netzwerk und Portbelegung"}</h3>
      <p>
        {tvOnly
          ? "SAT-Schüsseln mit LNB, Multischalter, Dosen und Empfänger dokumentieren. Orange Linien zeigen Koaxverbindungen. Anschlussnamen und Gerätedaten rechts im Plan bearbeiten."
          : "Netzwerkdosen, Patchpanel und aktive Geräte mit eindeutigen Ports dokumentieren. Verbindungen erscheinen violett im Plan."}{" "}
        Längen folgen dem Leitungsweg, sonst der Luftlinie, zuzüglich Etagenhöhe und Zuschlag.
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
                poe: previous?.kind === kind ? previous.poe : poeDefaults(kind, ports),
              };
              if (isTvKind(kind))
                Object.assign(node, {
                  tv: previous?.kind === kind && previous.tv ? previous.tv : tvDefaults(kind),
                });
              if (previous) Object.assign(previous, node);
              else b.networkNodes.push(node);
              if (!node.poe) delete (previous ?? node).poe;
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
            <select
              value={kind}
              onChange={(e) => {
                const value = e.target.value as typeof kind;
                setKind(value);
                setPorts(networkPorts[value]);
                if (tvOnly && !editing) setName(networkLabels[value]);
              }}
            >
              {Object.entries(networkLabels)
                .filter(([id]) => !tvOnly || isTvKind(id))
                .map(([id, label]) => (
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
        {nodes.map((n) => (
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
                  b.wifiMeasurements = b.wifiMeasurements.filter((v) => v.sourceId !== n.id);
                })
              }
            >
              Löschen
            </button>
          </li>
        ))}
      </ul>
      {!tvOnly && (
        <>
          <h4>WLAN-Reichweite messen</h4>
          <p>
            Messpunkte an der letzten Planposition ablegen und dem sendenden Router, Access Point oder
            Repeater zuordnen. Der Empfangswert wird in dBm gespeichert.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateBook("WLAN-Messpunkt anlegen", (b) => {
                b.wifiMeasurements.push({
                  id: newId(),
                  name: measurementName,
                  floorId: editor.floorId,
                  position: { ...editor.cursor },
                  sourceId,
                  signalDbm,
                  notes: measurementNotes,
                });
              });
            }}
          >
            <div className="book-grid">
              <Field label="Messpunktname">
                <input
                  required
                  value={measurementName}
                  onChange={(e) => setMeasurementName(e.target.value)}
                />
              </Field>
              <Field label="WLAN-Sender">
                <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">Wählen …</option>
                  {wifiSources.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Signalstärke (dBm)">
                <input
                  type="number"
                  min="-120"
                  max="0"
                  required
                  value={signalDbm}
                  onChange={(e) => setSignalDbm(Number(e.target.value))}
                />
              </Field>
              <Field label="Notiz">
                <input value={measurementNotes} onChange={(e) => setMeasurementNotes(e.target.value)} />
              </Field>
            </div>
            <button disabled={!sourceId}>Messpunkt an letzter Planposition speichern</button>
          </form>
          <ul className="book-list">
            {book.wifiMeasurements.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.name}</strong> ·{" "}
                  {book.networkNodes.find((n) => n.id === m.sourceId)?.name ?? "Sender gelöscht"} ·{" "}
                  {m.signalDbm} dBm · {project.floors[m.floorId]?.name ?? "Etage gelöscht"}
                </span>
                <button
                  onClick={() =>
                    updateBook("WLAN-Messpunkt löschen", (b) => {
                      b.wifiMeasurements = b.wifiMeasurements.filter((v) => v.id !== m.id);
                    })
                  }
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h4>{editingLink ? "Verbindung bearbeiten" : "Ports verbinden"}</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            updateBook("Kabelverbindung speichern", (b) => {
              const next = {
                id: editingLink ?? newId(),
                name: label,
                from,
                to,
                fromPort,
                toPort,
                cableType: cable,
                allowance,
                medium: isTvKind(b.networkNodes.find((n) => n.id === from)?.kind ?? "")
                  ? ("coax" as const)
                  : ("ethernet" as const),
              };
              const existing = b.networkLinks.find((l) => l.id === editingLink);
              if (existing) Object.assign(existing, next);
              else b.networkLinks.push(next);
            })
          )
            setEditingLink(null);
        }}
      >
        <div className="book-grid">
          <Field label="Von Gerät">
            <select
              required
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setFromPort(1);
              }}
            >
              <option value="">Wählen …</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Von Port">
            {tvOnly ? (
              <select required value={fromPort} onChange={(e) => setFromPort(Number(e.target.value))}>
                {Array.from({ length: nodes.find((n) => n.id === from)?.ports ?? 0 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {portName(
                      nodes.find((n) => n.id === from)!,
                      i + 1,
                    )}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                required
                value={fromPort}
                onChange={(e) => setFromPort(Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Zu Gerät">
            <select
              required
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setToPort(1);
              }}
            >
              <option value="">Wählen …</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zu Port">
            {tvOnly ? (
              <select required value={toPort} onChange={(e) => setToPort(Number(e.target.value))}>
                {Array.from({ length: nodes.find((n) => n.id === to)?.ports ?? 0 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {portName(
                      nodes.find((n) => n.id === to)!,
                      i + 1,
                    )}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                required
                value={toPort}
                onChange={(e) => setToPort(Number(e.target.value))}
              />
            )}
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
        <button>{editingLink ? "Verbindung speichern" : "Ports verbinden"}</button>
        {editingLink && (
          <button type="button" onClick={() => setEditingLink(null)}>
            Bearbeiten abbrechen
          </button>
        )}
      </form>
      <ul className="book-list">
        {book.networkLinks
          .filter((l) => !tvOnly || nodes.some((n) => n.id === l.from))
          .map((l) => {
            const a = book.networkNodes.find((n) => n.id === l.from)!,
              b = book.networkNodes.find((n) => n.id === l.to)!;
            const length = networkCableLength(project, a, b, l);
            return (
              <li key={l.id}>
                <span>
                  {l.name}: {a.name}:{isTvKind(a.kind) ? portName(a, l.fromPort) : l.fromPort} → {b.name}:
                  {isTvKind(b.kind) ? portName(b, l.toPort) : l.toPort} · {l.cableType} ·{" "}
                  {(length / 1000).toFixed(2)} m
                </span>
                {tvOnly && onDrawPath && (
                  <button
                    disabled={a.floorId !== b.floorId}
                    title={
                      a.floorId !== b.floorId
                        ? "Etagenverbindung: direkte Strecke mit Höhenanteil und Zuschlag"
                        : "Zwischenpunkte im Plan setzen"
                    }
                    onClick={() => onDrawPath(l.id)}
                  >
                    Leitungsweg zeichnen
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingLink(l.id);
                    setFrom(l.from);
                    setTo(l.to);
                    setFromPort(l.fromPort);
                    setToPort(l.toPort);
                    setCable(l.cableType);
                    setLabel(l.name);
                    setAllowance(l.allowance);
                  }}
                >
                  Kabel bearbeiten
                </button>
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
