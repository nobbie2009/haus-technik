import { cableFloorPath } from "../../electrical/cables";
import { housebook } from "../../housebook/model";
import { furnitureCorners } from "../../geometry/furniture";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { deleteSelection, duplicateSelection } from "../actions/edit";
import { worldToScreen } from "../../geometry/coordinates";

export function deleteSelected(): void {
  const selection = useEditorStore.getState().selection;
  if (!selection.length) return;
  if (
    useProjectStore.getState().commit("Auswahl löschen", (project) => deleteSelection(project, selection))
  ) {
    useEditorStore.setState({
      selection: [],
      message: "Auswahl und abhängige Objekte gelöscht. Mit Strg+Z wiederherstellen.",
    });
  }
}
export function duplicateSelected(): void {
  const selection = useEditorStore.getState().selection;
  if (!selection.length) return;
  let result = selection;
  if (
    useProjectStore.getState().commit("Auswahl duplizieren", (project) => {
      result = duplicateSelection(project, selection);
    })
  )
    useEditorStore.setState({ selection: result });
}
export function fitView(): void {
  const editor = useEditorStore.getState();
  const project = useProjectStore.getState().project;
  const positions = Object.values(project.points)
    .filter((p) => p.floorId === editor.floorId)
    .map((p) => p.position);
  const book = housebook(project),
    background = book.backgrounds[editor.floorId];
  if (background?.visible)
    positions.push(background.position, {
      x: background.position.x + background.width,
      y: background.position.y - (background.width * background.pixelHeight) / background.pixelWidth,
    });
  positions.push(...book.networkNodes.filter((n) => n.floorId === editor.floorId).map((n) => n.position));
  positions.push(
    ...Object.values(project.furniture)
      .filter((item) => item.floorId === editor.floorId)
      .flatMap(furnitureCorners),
  );
  positions.push(
    ...[
      ...Object.values(project.electrical.outlets),
      ...Object.values(project.electrical.devices),
      ...Object.values(project.electrical.distributionBoards),
      ...Object.values(project.electrical.supplies),
      ...Object.values(project.electrical.meters),
      ...Object.values(project.electrical.switches),
      ...Object.values(project.electrical.controls),
      ...Object.values(project.electrical.transformers),
      ...Object.values(project.electrical.junctions),
    ]
      .filter((item) => item.floorId === editor.floorId)
      .map((item) => item.position),
  );
  positions.push(
    ...Object.values(project.electrical.cables).flatMap((cable) =>
      cableFloorPath(project, cable, editor.floorId),
    ),
  );
  if (!positions.length) {
    useEditorStore.setState({ viewport: { scale: 0.07, originPx: { x: 100, y: editor.size.height - 110 } } });
    return;
  }
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const scale = Math.max(
    0.003,
    Math.min(
      1,
      (editor.size.width - 160) / Math.max(1000, maxX - minX),
      (editor.size.height - 180) / Math.max(1000, maxY - minY),
    ),
  );
  const center = worldToScreen(
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    { scale, originPx: { x: 0, y: 0 } },
  );
  useEditorStore.setState({
    viewport: {
      scale,
      originPx: { x: editor.size.width / 2 - center.x, y: editor.size.height / 2 - center.y + 12 },
    },
  });
}
