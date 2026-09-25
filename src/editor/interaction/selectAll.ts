import { elementKinds, elementTables } from "../../core/elementTables";
import { cableOnFloor } from "../../electrical/cables";
import { pipeFloorPath, utilities } from "../../utilities/model";
import type { Project } from "../../models/project";
import { layerInCategory, type EditorCategory } from "../categories";
import type { Selection } from "../types";

/** Select editable plan objects, not background images or floor-reference overlays. */
export function selectAllInView(project: Project, floorId: string, category: EditorCategory): Selection[] {
  const tables = elementTables(project);
  const result: Selection[] = [];
  for (const kind of elementKinds) {
    for (const item of Object.values(tables[kind])) {
      const layer = project.layers[item.layerId];
      if (!layer?.visible || !layerInCategory(layer.kind, category)) continue;
      const onFloor =
        kind === "cables"
          ? cableOnFloor(project, project.electrical.cables[item.id]!, floorId)
          : kind === "utilityPipes"
            ? pipeFloorPath(project, utilities(project).pipes[item.id]!, floorId).length > 1
            : item.floorId === floorId;
      if (onFloor) result.push({ kind, id: item.id });
    }
  }
  return result;
}
