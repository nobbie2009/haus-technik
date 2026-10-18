import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { editableDimensions } from "../geometry/editableDimensions";
import { formatLength, parseLength } from "../utils/units";
import { resizeWall } from "../editor/actions/edit";
import { insertWallOffset } from "../editor/actions/topology";
import { Modal } from "./dialogs/Modal";

export function WallDimensionEditor() {
  const editor = useEditorStore();
  const { project, commit } = useProjectStore();
  const [wallId, setWallId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [fixed, setFixed] = useState<"start" | "end">("start");
  const [mode, setMode] = useState<"length" | "offset">("length");
  const [offset, setOffset] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const keyboard = useRef<HTMLInputElement>(null);
  const unit = project.units.display;
  useEffect(() => {
    if (!wallId) keyboard.current?.blur();
  }, [wallId]);
  const wall = wallId ? project.walls[wallId] : undefined;
  if (editor.category !== "building" || editor.tool !== "select" || editor.spacePressed) return null;
  const labels = editableDimensions(project, editor.floorId, editor.viewport, editor.showMeasurements);
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      {/* iPadOS öffnet die Tastatur nur bei Fokus innerhalb der Tippgeste; der Dialog übernimmt sie danach. */}
      <input ref={keyboard} className="keyboard-proxy" inputMode="decimal" aria-hidden="true" tabIndex={-1} />
      {!editor.dragOffset &&
        labels
          .filter(
            (label) =>
              label.x > 0 && label.y > 0 && label.x < editor.size.width && label.y < editor.size.height,
          )
          .map((label) => (
            <button
              key={`${label.wallId}-${label.key}`}
              className="editable-wall-dimension"
              data-wall-id={label.wallId}
              aria-label={`Wandmaß ${formatLength(label.length, project.units.display)} bearbeiten`}
              title="Wandmaß anklicken und genaue Länge eingeben"
              style={{
                left: label.x,
                top: label.y,
                transform: `translate(-50%, -50%) rotate(${label.angle}deg)`,
              }}
              onClick={() => {
                keyboard.current?.focus({ preventScroll: true });
                setWallId(label.wallId);
                setMode("length");
                setOffset(formatLength(0, unit));
                setWidth("");
                setDepth("");
                setValue(formatLength(label.length, unit));
                setFixed("start");
                setError("");
                useEditorStore.setState({ selection: [{ kind: "walls", id: label.wallId }] });
              }}
            />
          ))}
      {wall && wall.floorId === editor.floorId && (
        <Modal title="Wandmaß ändern" onClose={() => setWallId(null)} initialFocusRef={input}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const applied =
                  mode === "length"
                    ? (() => {
                        const length = parseLength(value, unit);
                        if (length < 1) throw new Error("Die Länge muss mindestens 1 mm betragen.");
                        return commit("Wandmaß ändern", (draft) => resizeWall(draft, wall.id, length, fixed));
                      })()
                    : (() => {
                        const values = [offset, width, depth].map((text) => parseLength(text, unit));
                        return commit("Wandversatz einfügen", (draft) =>
                          insertWallOffset(draft, wall.id, fixed, values[0]!, values[1]!, values[2]!),
                        );
                      })();
                if (applied) setWallId(null);
                else setError(useProjectStore.getState().error ?? "Das Maß konnte nicht übernommen werden.");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Ungültiges Maß.");
              }
            }}
          >
            <label className="field">
              Änderung
              <select
                aria-label="Art der Änderung"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as "length" | "offset");
                  setError("");
                }}
              >
                <option value="length">Wandlänge ändern</option>
                <option value="offset">Versatz einfügen (z. B. Schornstein, Nische)</option>
              </select>
            </label>
            {mode === "length" ? (
              <label className="field">
                Neue Wandlänge ({unit})
                <input
                  aria-label="Neue Wandlänge"
                  ref={input}
                  inputMode="decimal"
                  value={value}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            ) : (
              <div className="field-row">
                {(
                  [
                    ["Abstand", offset, setOffset],
                    ["Breite", width, setWidth],
                    ["Tiefe", depth, setDepth],
                  ] as const
                ).map(([label, current, update], index) => (
                  <label className="field" key={label}>
                    {label} ({unit})
                    <input
                      aria-label={`Versatz ${label}`}
                      ref={index === 0 ? input : undefined}
                      inputMode="decimal"
                      value={current}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => update(event.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="field">
              {mode === "length" ? "Fester Endpunkt" : "Abstand messen ab"}
              <select
                aria-label="Fester Endpunkt"
                value={fixed}
                onChange={(event) => setFixed(event.target.value as "start" | "end")}
              >
                <option value="start">Anfangspunkt</option>
                <option value="end">Endpunkt</option>
              </select>
            </label>
            {mode === "length" ? (
              <p>
                Wandachsmaß, zum Beispiel 4,25 m oder 425 cm. Nur der andere Endpunkt wird entlang der Wand
                verschoben; angeschlossene Wände folgen am gemeinsamen Punkt.
              </p>
            ) : (
              <p>
                Die Wand erhält an dieser Stelle einen rechteckigen Versatz. Positive Tiefe ragt in den Raum
                (Schornstein, Vorsprung), negative nach außen (Nische). Abstand 0 setzt den Versatz direkt in
                die Raumecke. Die übrigen Raumecken bleiben stehen.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="book-actions">
              <button type="submit">Maß übernehmen</button>
              <button type="button" onClick={() => setWallId(null)}>
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
