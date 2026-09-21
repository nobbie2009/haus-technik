import { useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { editableDimensions } from "../geometry/editableDimensions";
import { formatLength, parseLength } from "../utils/units";
import { resizeWall } from "../editor/actions/edit";
import { Modal } from "./dialogs/Modal";

export function WallDimensionEditor() {
  const editor = useEditorStore();
  const { project, commit } = useProjectStore();
  const [wallId, setWallId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [fixed, setFixed] = useState<"start" | "end">("start");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
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
                setWallId(label.wallId);
                setValue(formatLength(label.length, project.units.display));
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
                const length = parseLength(value, project.units.display);
                if (length < 1) throw new Error("Die Länge muss mindestens 1 mm betragen.");
                if (commit("Wandmaß ändern", (draft) => resizeWall(draft, wall.id, length, fixed)))
                  setWallId(null);
                else setError(useProjectStore.getState().error ?? "Das Maß konnte nicht übernommen werden.");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Ungültiges Maß.");
              }
            }}
          >
            <label className="field">
              Neue Wandlänge ({project.units.display})
              <input
                aria-label="Neue Wandlänge"
                ref={input}
                value={value}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setValue(event.target.value)}
              />
            </label>
            <label className="field">
              Fester Endpunkt
              <select
                aria-label="Fester Endpunkt"
                value={fixed}
                onChange={(event) => setFixed(event.target.value as "start" | "end")}
              >
                <option value="start">Anfangspunkt</option>
                <option value="end">Endpunkt</option>
              </select>
            </label>
            <p>
              Wandachsmaß, zum Beispiel 4,25 m oder 425 cm. Nur der andere Endpunkt wird entlang der Wand
              verschoben; angeschlossene Wände folgen am gemeinsamen Punkt.
            </p>
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
