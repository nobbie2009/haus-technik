import { useEditorStore } from "../stores/editorStore";
import { confirmDrawing } from "../editor/interaction/drawing";

/** Explicit alternatives to keyboard modifiers and finishing a drawing. */
export function TouchDrawingControls() {
  const editor = useEditorStore();
  const hasDraft = editor.draft.points.length > 0;
  return (
    <div className="touch-drawing-controls" aria-label="Zeichenaktionen">
      <button aria-pressed={editor.tool === "select"} onClick={() => editor.setTool("select")}>
        Auswählen
      </button>
      {editor.tool === "select" && (
        <button
          aria-pressed={editor.multiSelect}
          onClick={() => useEditorStore.setState({ multiSelect: !editor.multiSelect })}
        >
          Mehrfachauswahl
        </button>
      )}
      {["wall", "polygon", "cable", "dimension"].includes(editor.tool) && (
        <button
          aria-pressed={editor.orthogonal}
          onClick={() => useEditorStore.setState({ orthogonal: !editor.orthogonal })}
        >
          Rechtwinklig
        </button>
      )}
      {editor.tool === "polygon" && (
        <button
          disabled={editor.draft.points.length < 3}
          onClick={() => confirmDrawing(editor.draft.points[0]!, true)}
        >
          Raum schließen
        </button>
      )}
      {hasDraft && (
        <button onClick={() => editor.cancel()}>
          {editor.tool === "wall" ? "Wandzug beenden" : "Abbrechen"}
        </button>
      )}
      {hasDraft && ["polygon", "cable"].includes(editor.tool) && (
        <button
          onClick={() => {
            if (editor.draft.points.length === 1) editor.cancel();
            else
              useEditorStore.setState({
                draft: { ...editor.draft, points: editor.draft.points.slice(0, -1) },
              });
          }}
        >
          Letzten Punkt entfernen
        </button>
      )}
    </div>
  );
}
