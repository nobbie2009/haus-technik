import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook, type Background } from "../../housebook/model";
import { readPlanImage } from "../../housebook/images";
import { Field, updateBook } from "./shared";
import { site } from "../../site/model";
import { alignAerial } from "../../site/aerial";
export function BackgroundPanel({ aerial = false }: { aerial?: boolean }) {
  const project = useProjectStore((s) => s.project),
    floorId = useEditorStore((s) => s.floorId);
  const current = (aerial ? housebook(project).aerials : housebook(project).backgrounds)?.[floorId];
  const referencePoints = Object.values(site(project).elements)
    .filter((e) => e.floorId === floorId)
    .flatMap((e) =>
      e.vertices.map((position, i) => ({ id: `${e.id}:${i}`, name: `${e.name} · P${i + 1}`, position })),
    );
  const [draft, setDraft] = useState<Background | null>(current ? structuredClone(current) : null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]),
    [known, setKnown] = useState(1000);
  const [anchors, setAnchors] = useState(["", ""]);
  return (
    <section>
      <h3>
        {aerial ? "Luftbild-Unterlage" : "Grundrissvorlage"} · {project.floors[floorId]?.name}
      </h3>
      {aerial && (
        <p>
          Ein eigenes Luftbild oder ein zur Nutzung freigegebenes Orthofoto importieren. Es bleibt getrennt
          von der Grundrissvorlage im Projekt gespeichert. Bildquelle und Aufnahmezeit unten notieren.
        </p>
      )}
      <p>
        Eine Bilddatei oder PDF-Seite hinterlegen. Zwei Punkte auf der Vorschau markieren und die tatsächliche
        Strecke in Millimetern eingeben. Alternativ die Gesamtbreite direkt setzen.
      </p>
      <div className="book-grid">
        <Field label="PDF-Seite">
          <input
            type="number"
            min="1"
            value={page}
            onChange={(e) => setPage(Math.max(1, Number(e.target.value)))}
          />
        </Field>
        <Field label="Vorlage importieren">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const image = await readPlanImage(file, page);
                setDraft({
                  name: file.name,
                  data: image.data,
                  pixelWidth: image.width,
                  pixelHeight: image.height,
                  width: 10000,
                  position: { x: 0, y: 0 },
                  opacity: 0.35,
                  visible: true,
                });
                setPoints([]);
              } catch (error) {
                setError(error instanceof Error ? error.message : "Import fehlgeschlagen.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
      </div>
      {busy && <p role="status">Vorlage wird gelesen …</p>}
      {error && <p role="alert">{error}</p>}
      {draft && (
        <>
          <button
            type="button"
            className="calibration-image"
            aria-label="Kalibrierpunkt auf Vorlage setzen"
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect(),
                point = {
                  x: ((e.clientX - box.left) / box.width) * draft.pixelWidth,
                  y: ((e.clientY - box.top) / box.height) * draft.pixelHeight,
                };
              setPoints((old) => (old.length === 2 ? [point] : [...old, point]));
            }}
          >
            <img src={draft.data} alt={`Vorlage ${draft.name}`} />
            {points.map((p, i) => (
              <span
                key={i}
                style={{
                  left: `${(p.x / draft.pixelWidth) * 100}%`,
                  top: `${(p.y / draft.pixelHeight) * 100}%`,
                }}
              >
                {i + 1}
              </span>
            ))}
          </button>
          <div className="book-grid">
            {aerial && (
              <>
                {[0, 1].map((i) => (
                  <Field key={i} label={`Planpunkt für Bildpunkt ${i + 1}`}>
                    <select
                      value={anchors[i]}
                      onChange={(e) => setAnchors(anchors.map((v, j) => (j === i ? e.target.value : v)))}
                    >
                      <option value="">Referenzpunkt wählen</option>
                      {referencePoints.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
                <button
                  disabled={points.length !== 2 || anchors.some((a) => !a)}
                  onClick={() => {
                    try {
                      setDraft(
                        alignAerial(
                          draft,
                          points,
                          anchors.flatMap((id) =>
                            referencePoints.filter((p) => p.id === id).map((p) => p.position),
                          ),
                        ),
                      );
                      setError("");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Ausrichten fehlgeschlagen.");
                    }
                  }}
                >
                  An zwei Planpunkten ausrichten
                </button>
                <Field label="Bildquelle / Aufnahmezeit">
                  <input
                    value={draft.source ?? ""}
                    onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                  />
                </Field>
                <Field label="Drehung im Uhrzeigersinn (°)">
                  <input
                    type="number"
                    min="-360"
                    max="360"
                    value={draft.rotation ?? 0}
                    onChange={(e) => setDraft({ ...draft, rotation: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Bildecke auf Referenzpunkt setzen">
                  <select
                    value=""
                    onChange={(e) => {
                      const point = referencePoints.find((p) => p.id === e.target.value);
                      if (point) setDraft({ ...draft, position: { ...point.position } });
                    }}
                  >
                    <option value="">Referenzpunkt wählen</option>
                    {referencePoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field label="Bekannte Strecke (mm)">
              <input type="number" min="1" value={known} onChange={(e) => setKnown(Number(e.target.value))} />
            </Field>
            <button
              disabled={points.length !== 2 || known <= 0 || !Number.isFinite(known)}
              onClick={() => {
                const distance = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
                if (distance < 2) {
                  setError("Die Punkte liegen zu nah zusammen.");
                  return;
                }
                setDraft({ ...draft, width: (draft.pixelWidth * known) / distance });
              }}
            >
              Maßstab aus zwei Punkten setzen
            </button>
            <Field label="Gesamtbreite der Vorlage (mm)">
              <input
                type="number"
                min="1"
                value={Math.round(draft.width)}
                onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) })}
              />
            </Field>
            <Field label="Deckkraft">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={draft.opacity}
                onChange={(e) => setDraft({ ...draft, opacity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Linke obere Ecke X (mm)">
              <input
                type="number"
                value={draft.position.x}
                onChange={(e) =>
                  setDraft({ ...draft, position: { ...draft.position, x: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Linke obere Ecke Y (mm)">
              <input
                type="number"
                value={draft.position.y}
                onChange={(e) =>
                  setDraft({ ...draft, position: { ...draft.position, y: Number(e.target.value) } })
                }
              />
            </Field>
          </div>
          <label>
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
            />{" "}
            Vorlage im Plan anzeigen
          </label>
          <div className="book-actions">
            <button
              onClick={() => {
                if (
                  updateBook("Grundrissvorlage speichern", (b) => {
                    if (aerial) {
                      b.aerials ??= {};
                      b.aerials[floorId] = draft;
                    } else b.backgrounds[floorId] = draft;
                  })
                )
                  setError("Vorlage gespeichert.");
              }}
            >
              Vorlage speichern
            </button>
            <button
              onClick={() => {
                if (
                  updateBook("Grundrissvorlage entfernen", (b) => {
                    if (aerial) delete b.aerials?.[floorId];
                    else delete b.backgrounds[floorId];
                  })
                )
                  setDraft(null);
              }}
            >
              Vorlage entfernen
            </button>
          </div>
        </>
      )}
    </section>
  );
}
