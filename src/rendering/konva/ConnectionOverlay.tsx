import { Circle, Line } from "react-konva";
import type { Project } from "../../models/project";
import { useEditorStore } from "../../stores/editorStore";
import { elementTables } from "../../core/elementTables";
import { worldToScreen } from "../../geometry/coordinates";
import { cableFloorPath } from "../../electrical/cables";
import { utilities, pipeFloorPath } from "../../utilities/model";
import { housebook } from "../../housebook/model";
import { buildSupplyGraph } from "../../simulation/graph";
export function ConnectionOverlay({ project }: { project: Project }) {
  const { connectionHighlight: h, floorId, viewport } = useEditorStore();
  if (!h || h.projectId !== project.id) return null;
  const ids = new Set(h.ids),
    tables = elementTables(project);
  const nodes = Object.values(tables)
    .flatMap((t) => Object.values(t))
    .filter((n) => ids.has(n.id) && n.floorId === floorId && project.layers[n.layerId]?.visible);
  const paths = Object.values(project.electrical.cables)
    .filter((c) => ids.has(c.id) && project.layers[c.layerId]?.visible)
    .map((c) => cableFloorPath(project, c, floorId));
  paths.push(
    ...Object.values(utilities(project).pipes)
      .filter((c) => ids.has(c.id) && project.layers[c.layerId]?.visible)
      .map((c) => pipeFloorPath(project, c, floorId)),
  );
  const book = housebook(project);
  const placements = Object.assign({}, ...Object.values(tables)) as Record<
    string,
    { position?: { x: number; y: number }; floorId: string; layerId: string }
  >;
  for (const item of [
    ...Object.values(project.electrical.circuits),
    ...Object.values(project.electrical.protectionDevices),
  ]) {
    const board = project.electrical.distributionBoards[item.distributionBoardId];
    if (board) placements[item.id] = board;
  }
  const assignments = buildSupplyGraph(project)
    .edges.filter((e) => ids.has(e.from) && ids.has(e.to))
    .flatMap((e) => {
      const a = placements[e.from],
        b = placements[e.to];
      return a?.position &&
        b?.position &&
        a.floorId === floorId &&
        b.floorId === floorId &&
        project.layers[a.layerId]?.visible &&
        project.layers[b.layerId]?.visible
        ? [[a.position, b.position]]
        : [];
    });
  for (const link of book.networkLinks) {
    const a = book.networkNodes.find((n) => n.id === link.from),
      b = book.networkNodes.find((n) => n.id === link.to);
    if (a && b && ids.has(a.id) && ids.has(b.id) && a.floorId === floorId && b.floorId === floorId)
      paths.push([a.position, ...(link.path ?? []), b.position]);
  }
  return (
    <>
      {assignments.map((path, i) => (
        <Line
          key={`assignment-${i}`}
          points={path.flatMap((v) => {
            const p = worldToScreen(v, viewport);
            return [p.x, p.y];
          })}
          stroke="#c04a00"
          strokeWidth={2}
          dash={[8, 6]}
          listening={false}
        />
      ))}
      {paths.map((path, i) => (
        <Line
          key={i}
          points={path.flatMap((v) => {
            const p = worldToScreen(v, viewport);
            return [p.x, p.y];
          })}
          stroke="#c04a00"
          strokeWidth={5}
          opacity={0.8}
          listening={false}
        />
      ))}
      {nodes.map((n) => {
        if (!("position" in n)) return null;
        const p = worldToScreen(n.position, viewport);
        return (
          <Circle key={n.id} x={p.x} y={p.y} radius={20} stroke="#c04a00" strokeWidth={3} listening={false} />
        );
      })}
    </>
  );
}
