import type { Vec2 } from "../../models/common";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { electricalNodes } from "../../electrical/cables";
import { electricalConnectionTarget } from "./connectionDrawing";
import { distance } from "../../geometry/distance";

export function confirmCable(point: Vec2, finishOnly = false): void {
  const editor = useEditorStore.getState();
  const target = electricalConnectionTarget(point);
  const project = useProjectStore.getState().project;
  if (target && project.layers[target.layerId]?.locked) {
    useProjectStore.setState({ error: "Die Elektrikebene ist gesperrt." });
    return;
  }
  if (!editor.cableStartId) {
    if (!target) {
      useProjectStore.setState({ error: "Leitung an einem Elektroobjekt oder Verbindungspunkt beginnen." });
      return;
    }
    useEditorStore.setState({
      cableStartId: target.id,
      selection: [],
      draft: { points: [{ ...target.position }], cursor: { ...target.position }, input: "" },
    });
    return;
  }
  if (!electricalNodes(project)[editor.cableStartId]) {
    editor.cancel();
    return;
  }
  if (target) {
    if (target.id === editor.cableStartId) return;
    const startNodeId = editor.cableStartId;
    const path = editor.draft.points.slice(1).map((p) => ({ ...p }));
    editor.cancel();
    useEditorStore.setState({
      connectionRequest: { startNodeId, endNodeId: target.id, cableId: null, path },
    });
  } else if (finishOnly)
    useProjectStore.setState({
      error: "Zum Abschließen ein Elektroobjekt oder einen Verbindungspunkt anklicken.",
    });
  else if (distance(editor.draft.points.at(-1)!, point) >= 1)
    useEditorStore.setState({
      draft: { points: [...editor.draft.points, { ...point }], cursor: { ...point }, input: "" },
    });
}
