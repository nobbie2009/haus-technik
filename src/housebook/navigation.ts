import type { Selection } from "../editor/types";
import { elementTables } from "../core/elementTables";
import { categoryForObject } from "../editor/categories";
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { focusElectrical } from "../editor/interaction/focusElectrical";
export function focusObject(target: Selection): boolean {
  const project = useProjectStore.getState().project,
    item = elementTables(project)[target.kind][target.id];
  if (!item || !project.layers[item.layerId]?.visible) return false;
  if (categoryForObject(target.kind) === "electrical")
    return focusElectrical(target as Parameters<typeof focusElectrical>[0]);
  const position =
    "position" in item && typeof item.position === "object"
      ? item.position
      : target.kind === "rooms"
        ? project.points[project.rooms[item.id]!.polygon.pointIds[0]!]!.position
        : target.kind === "walls"
          ? project.points[project.walls[item.id]!.startPointId]!.position
          : "wallId" in item && item.wallId
            ? project.points[project.walls[item.wallId]!.startPointId]!.position
            : null;
  const editor = useEditorStore.getState();
  editor.setCategory(categoryForObject(target.kind));
  editor.setFloor(item.floorId);
  editor.setTool("select");
  useEditorStore.setState({
    selection: [target],
    ...(position
      ? {
          viewport: {
            scale: editor.viewport.scale,
            originPx: {
              x: editor.size.width / 2 - position.x * editor.viewport.scale,
              y: editor.size.height / 2 + position.y * editor.viewport.scale,
            },
          },
        }
      : {}),
  });
  return true;
}
