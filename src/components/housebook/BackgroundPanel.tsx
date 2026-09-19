import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook, type Background } from "../../housebook/model";
import { readPlanImage } from "../../housebook/images";
import { Field, updateBook } from "./shared";
export function BackgroundPanel() {
  const project = useProjectStore((s) => s.project),
    floorId = useEditorStore((s) => s.floorId);
  const current = housebook(project).backgrounds[floorId];
  const [draft, setDraft] = useState<Background | null>(current ? structuredClone(current) : null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]),
    [known, setKnown] = useState(1000);
  return (
    <section>
      <h3>Grundrissvorlage · {project.floors[floorId]?.name}</h3>
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
            <Field label="Bekannte Strecke (mm)">
              <input type="number" min="1" value={known} onChange={(e) => setKnown(Number(e.target.value))} />
            </Field>
            <button
              disabled={points.length !== 2 || known <= 0}
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
                    b.backgrounds[floorId] = draft;
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
                    delete b.backgrounds[floorId];
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
