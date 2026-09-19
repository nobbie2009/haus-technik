import type { Vec2 } from "../../models/common";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { addCable, nearestElectricalNode, electricalNodes } from "../../electrical/cables";
import { distance } from "../../geometry/distance";

export function confirmCable(point: Vec2, finishOnly = false): void {
  const editor = useEditorStore.getState();
  const project = useProjectStore.getState().project;
  const target = nearestElectricalNode(project, editor.floorId, point, editor.viewport.scale);
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
    let id = "";
    if (
      useProjectStore.getState().commit("Leitung zeichnen", (draft) => {
        id = addCable(draft, editor.cableStartId!, target.id, editor.draft.points.slice(1));
      })
    ) {
      editor.cancel();
      useEditorStore.setState({ selection: [{ kind: "cables", id }] });
    }
  } else if (finishOnly)
    useProjectStore.setState({
      error: "Zum Abschließen ein Elektroobjekt oder einen Verbindungspunkt anklicken.",
    });
  else if (distance(editor.draft.points.at(-1)!, point) >= 1)
    useEditorStore.setState({
      draft: { points: [...editor.draft.points, { ...point }], cursor: { ...point }, input: "" },
    });
}
