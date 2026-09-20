import { newId } from "../../utils/uuid";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { parseLength, formatLength } from "../../utils/units";
import { Modal } from "./Modal";
import { fitView } from "../../editor/interaction/commands";

export function FloorDialog({ floorId, onClose }: { floorId: string | null; onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const existing = floorId ? project.floors[floorId] : null;
  const [name, setName] = useState(
    existing?.name ??
      ["Erdgeschoss", "Obergeschoss", "Dachgeschoss"][project.floorOrder.length] ??
      `Etage ${project.floorOrder.length + 1}`,
  );
  const [elevation, setElevation] = useState(
    formatLength(existing?.elevation ?? project.floorOrder.length * 2800, "m"),
  );
  const [height, setHeight] = useState(formatLength(existing?.defaultRoomHeight ?? 2500, "m"));
  const [error, setError] = useState("");
  return (
    <Modal title={floorId ? "Etage bearbeiten" : "Etage erstellen"} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const id = floorId ?? newId();
            const floorElevation = parseLength(elevation, "m");
            const roomHeight = parseLength(height, "m");
            const ok = useProjectStore
              .getState()
              .commit(floorId ? "Etage bearbeiten" : "Etage erstellen", (draft) => {
                draft.floors[id] = {
                  id,
                  name: name.trim(),
                  elevation: floorElevation,
                  defaultRoomHeight: roomHeight,
                  metadata: existing?.metadata ?? {},
                };
                if (!floorId) draft.floorOrder.push(id);
              });
            if (!ok) {
              setError(useProjectStore.getState().error ?? "Ungültige Etage.");
              return;
            }
            useEditorStore.getState().setFloor(id);
            fitView();
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Ungültige Maße.");
          }
        }}
      >
        <label className="field">
          Name
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="field-row">
          <label className="field">
            Etagenhöhe (m)
            <input value={elevation} onChange={(event) => setElevation(event.target.value)} />
          </label>
          <label className="field">
            Standard-Raumhöhe (m)
            <input value={height} onChange={(event) => setHeight(event.target.value)} />
          </label>
        </div>
        <p className="field-hint">
          Die Etagenhöhe ist die Z-Position, z. B. −2,80 m für den Keller. Die Standard-Raumhöhe gilt für neue
          Räume und Wände.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button className="primary" type="submit">
            {floorId ? "Übernehmen" : "Etage erstellen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
