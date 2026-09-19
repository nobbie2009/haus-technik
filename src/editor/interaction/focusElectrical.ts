import type { ElectricalKind } from "../../electrical/models";
import { cableFloorPath } from "../../electrical/cables";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";

export interface ElectricalTarget {
  kind: ElectricalKind | "cables";
  id: string;
}

/** Navigation verändert weder das Projekt noch Sichtbarkeit oder Ebenensperren. */
export function focusElectrical(target: ElectricalTarget): boolean {
  const project = useProjectStore.getState().project;
  const item = project.electrical[target.kind][target.id];
  if (!item || !project.layers[item.layerId]?.visible) return false;
  const cable = target.kind === "cables" ? project.electrical.cables[target.id] : undefined;
  const points = cable
    ? cableFloorPath(project, cable, cable.floorId)
    : "position" in item
      ? [item.position]
      : [];
  if (!points.length) return false;
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const editor = useEditorStore.getState();
  const scale = Math.max(
    0.003,
    Math.min(
      editor.viewport.scale,
      (editor.size.width - 160) / Math.max(1, maxX - minX),
      (editor.size.height - 180) / Math.max(1, maxY - minY),
    ),
  );
  editor.setCategory("electrical");
  editor.setFloor(item.floorId);
  editor.setTool("select");
  useEditorStore.setState({
    selection: [target],
    viewport: {
      scale,
      originPx: {
        x: editor.size.width / 2 - ((minX + maxX) / 2) * scale,
        y: editor.size.height / 2 + ((minY + maxY) / 2) * scale,
      },
    },
  });
  return true;
}
