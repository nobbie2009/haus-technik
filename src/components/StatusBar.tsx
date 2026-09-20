import { useEditorStore } from "../stores/editorStore";
import { toolLabels } from "../editor/types";
import { useProjectStore } from "../stores/projectStore";
import { formatLength } from "../utils/units";
import { distance } from "../geometry/distance";
import { appFooterText } from "../app/branding";

export function StatusBar() {
  const editor = useEditorStore();
  const unit = useProjectStore((s) => s.project.units.display);
  const anchor = editor.draft.points.at(-1);
  return (
    <>
      <div className="status-bar">
        <span className="status-dot" />
        <span>{toolLabels[editor.tool]}</span>
        <span className="status-separator" />
        <span>X {formatLength(editor.cursor.x, unit)}</span>
        <span>Y {formatLength(editor.cursor.y, unit)}</span>
        {anchor && editor.draft.cursor && (
          <span>L {formatLength(distance(anchor, editor.draft.cursor), unit)}</span>
        )}
        <span className="status-spacer" />
        <label className="status-grid">
          Raster{" "}
          <select
            aria-label="Rastergröße"
            value={editor.gridSize}
            onChange={(event) => useEditorStore.setState({ gridSize: Number(event.target.value) })}
          >
            {[10, 25, 50, 100, 250, 500, 1000].map((size) => (
              <option value={size} key={size}>
                {size} mm
              </option>
            ))}
          </select>
        </label>
        <div className="snap-options">
          <span>Snap</span>
          {(
            [
              ["snapGrid", "Raster"],
              ["snapPoints", "Punkt"],
              ["snapWalls", "Wand"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={editor[key]}
              className={editor[key] ? "enabled" : ""}
              onClick={() => useEditorStore.setState({ [key]: !editor[key] })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <footer className="app-footer" aria-label="App-Version und Copyright">
        {appFooterText()}
      </footer>
    </>
  );
}
