import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "./shared";
import { TextField } from "../Fields";
import { useProjectStore } from "../../stores/projectStore";
import { readPlanImage } from "../../housebook/images";
import { download } from "../../housebook/export";
import {
  wallPhotos,
  setWallPhotos,
  editWallPhoto,
  photoTraceLength,
  traceTypes,
  wallPhotoSvg,
  type PhotoPoint,
  type WallPhoto,
  type TraceType,
} from "../../housebook/wallPhotos";
import { newId } from "../../utils/uuid";
import { WallPhotoCanvas } from "./WallPhotoCanvas";

export function WallPhotoDialog({ wallId, onClose }: { wallId: string; onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    commit = useProjectStore((s) => s.commit);
  const canUndo = useProjectStore((s) => s.past.length > 0),
    canRedo = useProjectStore((s) => s.future.length > 0);
  const photos = wallPhotos(project, wallId),
    locked = !project.walls[wallId] || project.layers[project.walls[wallId]!.layerId]!.locked;
  const [photoId, setPhotoId] = useState(photos[0]?.id ?? ""),
    [mode, setMode] = useState<"select" | "draw" | "calibrate">("select");
  const [points, setPoints] = useState<PhotoPoint[]>([]),
    [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(""),
    [type, setType] = useState<TraceType>("electrical"),
    [notes, setNotes] = useState("");
  const [known, setKnown] = useState(1000),
    [zoom, setZoom] = useState(1),
    [x, setX] = useState(50),
    [y, setY] = useState(50);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false),
    [closing, setClosing] = useState(false);
  const photo = photos.find((p) => p.id === photoId) ?? photos[0],
    trace = photo?.traces.find((t) => t.id === selected);
  const reset = () => {
    setPoints([]);
    setMode("select");
    setSelected(null);
    setError("");
    setClosing(false);
  };
  const edit = (label: string, change: (photo: WallPhoto) => void) => {
    if (!photo) return false;
    const ok = commit(label, (p) => editWallPhoto(p, wallId, photo.id, change));
    setError(ok ? "" : (useProjectStore.getState().error ?? "Änderung fehlgeschlagen."));
    return ok;
  };
  const addPoint = (point: PhotoPoint) => {
    if (locked || mode === "select" || (mode === "calibrate" && points.length >= 2)) return;
    if (![point.x, point.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) {
      setError("Punktkoordinaten müssen zwischen 0 und 100 Prozent liegen.");
      return;
    }
    setPoints((ps) => [...ps, point]);
    setError("");
  };
  const startDraw = (existing = false) => {
    setMode("draw");
    setPoints([]);
    setSelected(existing ? selected : null);
    setName(existing ? (trace?.name ?? "") : "");
    setType(existing ? (trace?.type ?? "electrical") : type);
    setNotes(existing ? (trace?.notes ?? "") : "");
    setError("");
  };
  return (
    <Modal
      title="Wandfotos und Leitungsverläufe"
      className="wall-photo-dialog"
      onClose={() => {
        if (busy) return;
        if (points.length) setClosing(true);
        else onClose();
      }}
    >
      <p>
        Fotos einer Wandseite sammeln und Leitungsverläufe direkt darauf markieren. Angaben bleiben im Projekt
        gespeichert.
      </p>
      {locked && (
        <p className="locked-note">Wandebene gesperrt · Fotos und Verläufe sind schreibgeschützt.</p>
      )}
      <div className="book-actions">
        <button
          disabled={!canUndo || busy || points.length > 0}
          onClick={() => {
            useProjectStore.getState().undo();
            reset();
          }}
        >
          Rückgängig
        </button>
        <button
          disabled={!canRedo || busy || points.length > 0}
          onClick={() => {
            useProjectStore.getState().redo();
            reset();
          }}
        >
          Wiederholen
        </button>
      </div>
      <div className="book-grid">
        <Field label="Wandfoto hinzufügen">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={locked || busy || points.length > 0}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const image = await readPlanImage(file),
                  id = newId();
                if (
                  !commit("Wandfoto hinzufügen", (p) =>
                    setWallPhotos(p, wallId, [
                      ...wallPhotos(p, wallId),
                      {
                        id,
                        name: file.name.slice(0, 150),
                        side: "",
                        notes: "",
                        data: image.data,
                        pixelWidth: image.width,
                        pixelHeight: image.height,
                        calibration: null,
                        traces: [],
                      },
                    ]),
                  )
                )
                  throw new Error(
                    useProjectStore.getState().error ?? "Foto konnte nicht gespeichert werden.",
                  );
                setPhotoId(id);
                setZoom(1);
                reset();
                setDeleting(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Foto konnte nicht gelesen werden.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
        {photo && (
          <Field label="Wandfoto auswählen">
            <select
              value={photo.id}
              disabled={busy || points.length > 0}
              onChange={(e) => {
                setPhotoId(e.target.value);
                setZoom(1);
                reset();
                setDeleting(false);
              }}
            >
              {photos.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                  {p.side ? ` · ${p.side}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {busy && <p role="status">Foto wird verkleinert und gespeichert …</p>}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {closing && (
        <div className="info-card" role="alert">
          <p>Die begonnenen Punkte sind noch nicht gespeichert.</p>
          <div className="book-actions">
            <button onClick={onClose}>Punkte verwerfen und schließen</button>
            <button onClick={() => setClosing(false)}>Weiterzeichnen</button>
          </div>
        </div>
      )}
      {photo ? (
        <>
          <details>
            <summary>Fotodaten und Wandseite</summary>
            <div className="book-grid" key={photo.id}>
              <TextField
                label="Fototitel"
                value={photo.name}
                disabled={locked}
                onCommit={(name) =>
                  edit("Fototitel ändern", (p) => {
                    p.name = name;
                  })
                }
              />
              <TextField
                label="Wandseite / Raum"
                value={photo.side}
                disabled={locked}
                hint="Zum Beispiel Küchenseite, Blick von der Tür"
                onCommit={(side) =>
                  edit("Wandseite beschreiben", (p) => {
                    p.side = side;
                  })
                }
              />
              <TextField
                label="Fotonotiz"
                value={photo.notes}
                disabled={locked}
                onCommit={(notes) =>
                  edit("Fotonotiz ändern", (p) => {
                    p.notes = notes;
                  })
                }
              />
            </div>
          </details>
          <div className="book-actions wall-photo-tools">
            <button
              disabled={locked || points.length > 0}
              aria-pressed={mode === "draw"}
              onClick={() => startDraw()}
            >
              Neuen Verlauf zeichnen
            </button>
            <button
              disabled={locked || points.length > 0}
              aria-pressed={mode === "calibrate"}
              onClick={() => {
                setMode("calibrate");
                setPoints([]);
                setSelected(null);
              }}
            >
              Referenzstrecke markieren
            </button>
            <Field label="Fotozoom">
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                {[1, 1.5, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n * 100} %
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p role="status">
            {mode === "draw"
              ? `Verlauf: ${points.length} Punkte. Eckpunkte antippen, dann Verlauf speichern.`
              : mode === "calibrate"
                ? `Referenz: ${points.length} von 2 Punkten. Danach bekannte Strecke eingeben.`
                : "Einen Verlauf im Foto oder in der Liste auswählen. Vergrößerte Fotos per Finger oder mit den Bildlaufleisten verschieben."}
          </p>
          <WallPhotoCanvas
            key={photo.id}
            photo={photo}
            mode={locked ? "select" : mode}
            points={points}
            zoom={zoom}
            selected={selected}
            onPoint={addPoint}
            onSelect={setSelected}
          />
          {mode !== "select" && (
            <fieldset disabled={locked} className="book-fieldset">
              <div className="book-actions">
                <button disabled={!points.length} onClick={() => setPoints((ps) => ps.slice(0, -1))}>
                  Letzten Punkt entfernen
                </button>
                <button onClick={reset}>Zeichnung abbrechen</button>
              </div>
              <details>
                <summary>Punkt per Koordinaten setzen</summary>
                <div className="book-grid">
                  <Field label="Punkt X (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={x}
                      onChange={(e) => setX(Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Punkt Y (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={y}
                      onChange={(e) => setY(Number(e.target.value))}
                    />
                  </Field>
                </div>
                <button onClick={() => addPoint({ x: x / 100, y: y / 100 })}>Punkt hinzufügen</button>
              </details>
              {mode === "draw" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (points.length < 2) return;
                    if (
                      edit("Fotoverlauf speichern", (p) => {
                        const entry = {
                          id: selected ?? newId(),
                          name: name.trim() || `${traceTypes[type].label} ${p.traces.length + 1}`,
                          type,
                          notes,
                          points,
                        };
                        const index = p.traces.findIndex((t) => t.id === selected);
                        if (index >= 0) p.traces[index] = entry;
                        else p.traces.push(entry);
                      })
                    )
                      reset();
                  }}
                >
                  <div className="book-grid">
                    <Field label="Verlaufsname">
                      <input
                        maxLength={150}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Zum Beispiel Zuleitung Küchensteckdosen"
                      />
                    </Field>
                    <Field label="Leitungsart im Foto">
                      <select value={type} onChange={(e) => setType(e.target.value as TraceType)}>
                        {Object.entries(traceTypes).map(([key, t]) => (
                          <option key={key} value={key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Verlaufsnotiz">
                      <input maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Field>
                  </div>
                  <button type="submit" className="primary" disabled={points.length < 2}>
                    Verlauf speichern
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (points.length !== 2) return;
                    if (
                      edit("Fotoreferenz speichern", (p) => {
                        p.calibration = { points: [points[0]!, points[1]!], distanceMm: known };
                      })
                    )
                      reset();
                  }}
                >
                  <Field label="Bekannte Fotostrecke (mm)">
                    <input
                      required
                      type="number"
                      min="1"
                      max="1000000"
                      step="any"
                      value={known}
                      onChange={(e) => setKnown(Number(e.target.value))}
                    />
                  </Field>
                  <button type="submit" disabled={points.length !== 2}>
                    Referenz speichern
                  </button>
                </form>
              )}
            </fieldset>
          )}
          <p className="field-hint">
            {photo.calibration
              ? "Längen sind Näherungen aus der Fotoreferenz. Perspektive und verdeckte Abschnitte können abweichen."
              : "Ohne Referenzstrecke werden keine realen Längen angegeben."}{" "}
            Fotoverläufe sind unabhängig von den Leitungen im Grundriss.
          </p>
          {photo.calibration && (
            <button
              disabled={locked || points.length > 0}
              onClick={() =>
                edit("Fotoreferenz entfernen", (p) => {
                  p.calibration = null;
                })
              }
            >
              Referenz entfernen
            </button>
          )}
          <h3>Verläufe auf diesem Foto</h3>
          <ul className="book-list">
            {photo.traces.map((t) => {
              const length = photoTraceLength(photo, t);
              return (
                <li key={t.id}>
                  <button
                    disabled={points.length > 0}
                    aria-pressed={selected === t.id}
                    onClick={() => {
                      setMode("select");
                      setSelected(t.id);
                    }}
                  >
                    {t.name} · {traceTypes[t.type].label}
                  </button>
                  {length !== null && <span>ca. {(length / 1000).toFixed(2)} m (Foto)</span>}
                </li>
              );
            })}
          </ul>
          {!photo.traces.length && <p>Noch keine Verläufe eingezeichnet.</p>}
          {trace && mode === "select" && (
            <div className="info-card" key={trace.id}>
              <TextField
                label="Gespeicherter Verlaufsname"
                value={trace.name}
                disabled={locked}
                onCommit={(name) =>
                  edit("Fotoverlauf beschriften", (p) => {
                    p.traces.find((t) => t.id === trace.id)!.name = name;
                  })
                }
              />
              <TextField
                label="Gespeicherte Verlaufsnotiz"
                value={trace.notes}
                disabled={locked}
                onCommit={(notes) =>
                  edit("Fotoverlauf beschreiben", (p) => {
                    p.traces.find((t) => t.id === trace.id)!.notes = notes;
                  })
                }
              />
              <div className="book-actions">
                <button disabled={locked} onClick={() => startDraw(true)}>
                  Verlauf neu zeichnen
                </button>
                <button
                  disabled={locked}
                  onClick={() => {
                    if (
                      edit("Fotoverlauf löschen", (p) => {
                        p.traces = p.traces.filter((t) => t.id !== trace.id);
                      })
                    )
                      setSelected(null);
                  }}
                >
                  Verlauf löschen
                </button>
              </div>
            </div>
          )}
          <div className="book-actions">
            <button
              disabled={points.length > 0}
              onClick={() => download(wallPhotoSvg(photo), "wandfoto-mit-verlaeufen.svg", "image/svg+xml")}
            >
              Wandfoto als SVG exportieren
            </button>
            <button disabled={locked || busy || points.length > 0} onClick={() => setDeleting(true)}>
              Wandfoto löschen
            </button>
          </div>
          {deleting && (
            <div className="info-card">
              <p>Dieses Foto samt eingezeichneten Verläufen löschen?</p>
              <div className="book-actions">
                <button
                  disabled={locked}
                  onClick={() => {
                    if (
                      commit("Wandfoto löschen", (p) =>
                        setWallPhotos(
                          p,
                          wallId,
                          wallPhotos(p, wallId).filter((v) => v.id !== photo.id),
                        ),
                      )
                    ) {
                      setDeleting(false);
                      reset();
                    }
                  }}
                >
                  Foto und Verläufe löschen
                </button>
                <button onClick={() => setDeleting(false)}>Foto behalten</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p>Noch keine Fotos an dieser Wand. Füge ein möglichst frontal aufgenommenes Foto hinzu.</p>
      )}
    </Modal>
  );
}
