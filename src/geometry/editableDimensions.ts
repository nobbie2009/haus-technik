import type { Project } from "../models/project";
import type { Viewport } from "./coordinates";
import { worldToScreen } from "./coordinates";
import { dimensionGeometry } from "./dimensions";
import { distance } from "./distance";

/** Screen positions of wall-axis labels, including explicit aligned wall dimensions. */
export function editableDimensions(
  project: Project,
  floorId: string,
  viewport: Viewport,
  automatic: boolean,
) {
  const visible = (item: { floorId: string; layerId: string }) =>
    item.floorId === floorId && project.layers[item.layerId]?.visible;
  const dimensions = Object.values(project.dimensions).filter(visible);
  const result = [];
  for (const wall of Object.values(project.walls).filter(visible)) {
    if (project.layers[wall.layerId]?.locked) continue;
    const start = project.points[wall.startPointId]!.position;
    const end = project.points[wall.endPointId]!.position;
    const length = distance(start, end);
    if (length < 0.001) continue;
    const explicit = dimensions.filter(
      (d) =>
        d.mode === "aligned" &&
        d.start.kind === "point" &&
        d.end.kind === "point" &&
        [wall.startPointId, wall.endPointId].includes(d.start.pointId) &&
        [wall.startPointId, wall.endPointId].includes(d.end.pointId) &&
        d.start.pointId !== d.end.pointId,
    );
    const offset = wall.thickness / 2 + Math.max(220, 28 / viewport.scale);
    const geometries = explicit.length
      ? explicit.map((d) => ({ ...dimensionGeometry(project, d), key: d.id }))
      : automatic && length * viewport.scale > 50
        ? [
            {
              a: {
                x: start.x - ((end.y - start.y) / length) * offset,
                y: start.y + ((end.x - start.x) / length) * offset,
              },
              b: {
                x: end.x - ((end.y - start.y) / length) * offset,
                y: end.y + ((end.x - start.x) / length) * offset,
              },
              key: wall.id,
            },
          ]
        : [];
    for (const geometry of geometries) {
      const a = worldToScreen(geometry.a, viewport),
        b = worldToScreen(geometry.b, viewport);
      let angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
      result.push({
        wallId: wall.id,
        key: geometry.key,
        length,
        x: (a.x + b.x) / 2 + Math.sin(angle) * 11,
        y: (a.y + b.y) / 2 - Math.cos(angle) * 11,
        angle: (angle * 180) / Math.PI,
      });
    }
  }
  return result;
}
