import type { Vec2 } from "../models/common";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { utilities, addUtilityPipe, supportsMedium } from "./model";
export function confirmPipe(point: Vec2) {
  const editor = useEditorStore.getState(),
    project = useProjectStore.getState().project;
  const node = Object.values(utilities(project).nodes)
    .reverse()
    .find(
      (n) =>
        n.floorId === editor.floorId &&
        project.layers[n.layerId]?.visible &&
        Math.hypot(n.position.x - point.x, n.position.y - point.y) * editor.viewport.scale <= 18,
    );
  if (!editor.cableStartId) {
    if (!node || !supportsMedium(node, editor.utilityMedium)) {
      useProjectStore.setState({ error: "Rohrleitung an einem passenden Anschlussobjekt beginnen." });
      return;
    }
    useEditorStore.setState({
      cableStartId: node.id,
      selection: [],
      draft: { points: [{ ...node.position }], cursor: node.position, input: "" },
    });
  } else if (node) {
    let id = "";
    if (
      useProjectStore.getState().commit("Rohrleitung zeichnen", (p) => {
        id = addUtilityPipe(
          p,
          editor.cableStartId!,
          node.id,
          editor.utilityMedium,
          editor.draft.points.slice(1),
        );
      })
    ) {
      editor.cancel();
      useEditorStore.setState({ selection: [{ kind: "utilityPipes", id }] });
    }
  } else
    useEditorStore.setState({
      draft: { ...editor.draft, points: [...editor.draft.points, { ...point }], cursor: point },
    });
}
