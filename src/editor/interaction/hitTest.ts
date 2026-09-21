import { site, siteSegments } from "../../site/model";
import { networkNodeTable } from "../../network/model";
import { utilities, pipeFloorPath } from "../../utilities/model";
import { cableFloorPath, cableOnFloor } from "../../electrical/cables";
import { layerInCategory } from "../categories";
import type { EditorCategory } from "../categories";
import { containsFurniture } from "../../geometry/furniture";
import { consumerShape } from "../../electrical/consumerLibrary";
import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { projectToSegment, distance } from "../../geometry/distance";
import { dimensionGeometry, pointInPolygon } from "../../geometry/dimensions";

export function hitTest(
  project: Project,
  floorId: UUID,
  point: Vec2,
  scale: number,
  onlyWalls = false,
  category?: EditorCategory,
): Selection | null {
  const visible = (item: { floorId: UUID; layerId: UUID }) =>
    item.floorId === floorId &&
    project.layers[item.layerId]?.visible &&
    (!category || layerInCategory(project.layers[item.layerId]!.kind, category));
  if (!onlyWalls) {
    for (const node of Object.values(networkNodeTable(project)).reverse())
      if (visible(node) && distance(node.position, point) * scale <= 20)
        return { kind: "networkNodes", id: node.id };
    for (const item of Object.values(site(project).elements).reverse()) {
      if (!visible(item)) continue;
      if (
        item.vertices.some((p) => distance(p, point) * scale <= 10) ||
        siteSegments(item).some(
          ([a, b]) =>
            projectToSegment(point, a, b).distance <= (item.kind === "path" ? item.width / 2 : 0) + 6 / scale,
        )
      )
        return { kind: "siteElements", id: item.id };
    }
    const net = utilities(project);
    for (const node of Object.values(net.nodes).reverse())
      if (visible(node) && (distance(node.position, point) * scale <= 16 || containsFurniture(node, point)))
        return { kind: "utilityNodes", id: node.id };
    for (const pipe of Object.values(net.pipes).reverse()) {
      if (!visible({ ...pipe, floorId })) continue;
      const path = pipeFloorPath(project, pipe, floorId);
      if (path.slice(1).some((p, i) => projectToSegment(point, path[i]!, p).distance * scale <= 8))
        return { kind: "utilityPipes", id: pipe.id };
    }
    for (const kind of [
      "devices",
      "outlets",
      "distributionBoards",
      "junctions",
      "supplies",
      "meters",
      "switches",
      "controls",
      "transformers",
    ] as const)
      for (const item of Object.values(project.electrical[kind]).reverse())
        if (visible(item)) {
          const shape = kind === "devices" ? consumerShape(item) : null;
          if (
            distance(item.position, point) * scale <= 14 ||
            (shape && containsFurniture({ ...shape, position: item.position }, point))
          )
            return { kind, id: item.id };
        }
    for (const cable of Object.values(project.electrical.cables).reverse()) {
      if (!cableOnFloor(project, cable, floorId) || !visible({ ...cable, floorId })) continue;
      const path = cableFloorPath(project, cable, floorId);
      if (
        cable.riser &&
        (distance(cable.riser, point) * scale <= 9 ||
          distance({ x: cable.riser.x, y: cable.riser.y - 25 / scale }, point) * scale <= 9)
      )
        return { kind: "cables", id: cable.id };
      if (path.slice(1).some((p, i) => projectToSegment(point, path[i]!, p).distance * scale <= 6))
        return { kind: "cables", id: cable.id };
    }
    for (const item of Object.values(project.furniture).reverse())
      if (visible(item) && containsFurniture(item, point)) return { kind: "furniture", id: item.id };
    for (const kind of ["doors", "windows"] as const)
      for (const opening of Object.values(project[kind]).reverse()) {
        if (!visible(opening)) continue;
        const wall = project.walls[opening.wallId]!;
        const a = project.points[wall.startPointId]!.position;
        const b = project.points[wall.endPointId]!.position;
        const projection = projectToSegment(point, a, b);
        if (
          projection.distance < wall.thickness / 2 + 7 / scale &&
          Math.abs(projection.fraction * distance(a, b) - opening.position) <= opening.width / 2
        )
          return { kind, id: opening.id };
      }
    for (const dimension of Object.values(project.dimensions).reverse())
      if (visible(dimension)) {
        const { a, b } = dimensionGeometry(project, dimension);
        if (projectToSegment(point, a, b).distance < 8 / scale)
          return { kind: "dimensions", id: dimension.id };
      }
  }
  let nearest: { id: UUID; distance: number } | null = null;
  for (const wall of Object.values(project.walls))
    if (visible(wall)) {
      const projected = projectToSegment(
        point,
        project.points[wall.startPointId]!.position,
        project.points[wall.endPointId]!.position,
      );
      if (
        projected.distance <= wall.thickness / 2 + 6 / scale &&
        (!nearest || projected.distance < nearest.distance)
      )
        nearest = { id: wall.id, distance: projected.distance };
    }
  if (nearest) return { kind: "walls", id: nearest.id };
  if (!onlyWalls)
    for (const room of Object.values(project.rooms).reverse())
      if (
        visible(room) &&
        pointInPolygon(
          point,
          room.polygon.pointIds.map((id) => project.points[id]!.position),
        )
      )
        return { kind: "rooms", id: room.id };
  return null;
}
