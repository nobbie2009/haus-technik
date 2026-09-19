import { useState } from "react";
import { Copy, Trash2, Move } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { moveSelection } from "../../editor/actions/edit";
import { duplicateSelected, deleteSelected } from "../../editor/interaction/commands";
import { parseLength } from "../../utils/units";

export function SelectionActions({ locked }: { locked: boolean }) {
  const [dx, setDx] = useState("0 mm");
  const [dy, setDy] = useState("0 mm");
  const unit = useProjectStore((s) => s.project.units.display);
  return (
    <>
      <div className="property-section">
        <div className="section-caption">
          <Move size={13} /> VERSCHIEBEN UM
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const delta = { x: parseLength(dx, unit), y: parseLength(dy, unit) };
              useProjectStore
                .getState()
                .commit("Auswahl verschieben", (draft) =>
                  moveSelection(draft, useEditorStore.getState().selection, delta),
                );
            } catch {
              useProjectStore.setState({ error: "Bitte gültige Verschiebemaße eingeben." });
            }
          }}
        >
          <div className="field-row">
            <label className="field">
              Δ X<input value={dx} disabled={locked} onChange={(event) => setDx(event.target.value)} />
            </label>
            <label className="field">
              Δ Y<input value={dy} disabled={locked} onChange={(event) => setDy(event.target.value)} />
            </label>
          </div>
          <button type="submit" className="full-width" disabled={locked}>
            Verschieben
          </button>
        </form>
      </div>
      <div className="selection-actions">
        <button onClick={duplicateSelected} disabled={locked}>
          <Copy size={14} /> Duplizieren
        </button>
        <button
          className="danger"
          onClick={deleteSelected}
          disabled={locked}
          title="Löscht auch abhängige Objekte · Strg+Z stellt sie wieder her"
        >
          <Trash2 size={14} /> Löschen
        </button>
      </div>
    </>
  );
}
