import { newId } from "../../utils/uuid";
import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { polygonProblem, polygonSignedArea } from "../../geometry/polygon";
import { distance, projectToSegment } from "../../geometry/distance";
import { LENGTH_EPSILON } from "../../geometry/tolerances";
import { addWallPath, layerId } from "./topology";

export function createRoom(project: Project, floorId: UUID, vertices: Vec2[], name?: string): UUID {
  const problem = polygonProblem(vertices);
  if (problem) throw new Error(problem);
  for (let i = 0; i < vertices.length; i++)
    addWallPath(project, floorId, vertices[i]!, vertices[(i + 1) % vertices.length]!);
  // Zweiter Durchlauf löst die endgültige Topologie nach allen Wandteilungen auf.
  const pointIds: UUID[] = [];
  const wallIds: UUID[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const path = addWallPath(project, floorId, vertices[i]!, vertices[(i + 1) % vertices.length]!);
    pointIds.push(...path.pointIds.slice(0, -1));
    wallIds.push(...path.wallIds);
  }
  const id = newId();
  project.rooms[id] = {
    id,
    floorId,
    layerId: layerId(project, "floorPlan"),
    name: name ?? `Raum ${Object.keys(project.rooms).length + 1}`,
    type: "other",
    polygon: { pointIds },
    wallIds,
    height: project.floors[floorId]!.defaultRoomHeight,
    metadata: {},
  };
  return id;
}

function insidePolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}

/**
 * Legt Räume für geschlossene Wandumrisse an, die durch die angegebenen Wände entstanden sind und noch
 * in keinem Raum liegen. So entsteht ein Raum auch dann, wenn neue Wände bestehende Wände schließen.
 */
export function detectClosedRooms(project: Project, floorId: UUID, wallIds: UUID[]): UUID[] {
  const walls = Object.values(project.walls).filter((wall) => wall.floorId === floorId);
  const edges = new Map<UUID, { to: UUID; wallId: UUID }[]>();
  for (const wall of walls) {
    edges.set(wall.startPointId, [
      ...(edges.get(wall.startPointId) ?? []),
      { to: wall.endPointId, wallId: wall.id },
    ]);
    edges.set(wall.endPointId, [
      ...(edges.get(wall.endPointId) ?? []),
      { to: wall.startPointId, wallId: wall.id },
    ]);
  }
  const position = (id: UUID) => project.points[id]!.position;
  const angle = (from: UUID, to: UUID) =>
    Math.atan2(position(to).y - position(from).y, position(to).x - position(from).x);
  const created: UUID[] = [];
  for (const wallId of wallIds) {
    const wall = project.walls[wallId];
    if (!wall) continue;
    for (const [start, next] of [
      [wall.startPointId, wall.endPointId],
      [wall.endPointId, wall.startPointId],
    ] as const) {
      // Linke Fläche verfolgen: an jedem Punkt die stärkste Linkskurve nehmen.
      const pointIds: UUID[] = [start];
      const faceWalls: UUID[] = [wallId];
      let previous: UUID = start;
      let current: UUID = next;
      let closed = false;
      for (let step = 0; step <= walls.length; step++) {
        if (current === start) {
          closed = true;
          break;
        }
        pointIds.push(current);
        const back = angle(current, previous);
        const options = (edges.get(current) ?? []).filter((edge) => edge.to !== previous);
        if (!options.length) break;
        const turn = (edge: { to: UUID }) => {
          const value = back - angle(current, edge.to);
          return ((value % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        };
        const chosen = options.reduce((best, edge) => (turn(edge) < turn(best) ? edge : best));
        faceWalls.push(chosen.wallId);
        previous = current;
        current = chosen.to;
      }
      if (!closed || new Set(faceWalls).size !== faceWalls.length) continue;
      const polygon = pointIds.map(position);
      if (polygonProblem(polygon) || polygonSignedArea(polygon) <= 0) continue;
      const a = polygon[0]!,
        b = polygon[1]!;
      const length = distance(a, b);
      const sample = {
        x: (a.x + b.x) / 2 - ((b.y - a.y) / length) * Math.min(10, length / 4),
        y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * Math.min(10, length / 4),
      };
      if (
        Object.values(project.rooms).some(
          (room) =>
            room.floorId === floorId &&
            insidePolygon(
              sample,
              room.polygon.pointIds.map((id) => position(id)),
            ),
        )
      )
        continue;
      const id = newId();
      project.rooms[id] = {
        id,
        floorId,
        layerId: layerId(project, "floorPlan"),
        name: `Raum ${Object.keys(project.rooms).length + 1}`,
        type: "other",
        polygon: { pointIds },
        wallIds: faceWalls,
        height: project.floors[floorId]!.defaultRoomHeight,
        metadata: {},
      };
      created.push(id);
    }
  }
  return created;
}

export function createOpening(
  project: Project,
  wallId: UUID,
  position: number,
  kind: "doors" | "windows",
): Selection {
  const wall = project.walls[wallId]!;
  if (!wall) throw new Error("Bitte eine Wand auswählen.");
  const id = newId();
  const length = distance(
    project.points[wall.startPointId]!.position,
    project.points[wall.endPointId]!.position,
  );
  const width = kind === "doors" ? 900 : 1200;
  if (length < width) throw new Error("Diese Wand ist für die Öffnung zu kurz.");
  const base = {
    id,
    wallId,
    floorId: wall.floorId,
    layerId: wall.layerId,
    position: Math.max(width / 2, Math.min(length - width / 2, position)),
    width,
    metadata: {},
  };
  if (kind === "doors")
    project.doors[id] = {
      ...base,
      height: Math.min(2100, wall.height),
      type: "hinged",
      openingDirection: { hinge: "startSide", swing: "leftOfWall" },
    };
  else
    project.windows[id] = {
      ...base,
      height: Math.min(1200, wall.height),
      sillHeight: Math.min(900, Math.max(0, wall.height - 1200)),
    };
  return { kind, id };
}

export function createDimension(project: Project, floorId: UUID, start: Vec2, end: Vec2): UUID {
  if (distance(start, end) < 1) throw new Error("Eine Bemaßung benötigt zwei unterschiedliche Punkte.");
  const anchor = (position: Vec2) => {
    const point = Object.values(project.points).find(
      (p) => p.floorId === floorId && distance(position, p.position) < LENGTH_EPSILON,
    );
    return point
      ? { kind: "point" as const, pointId: point.id }
      : { kind: "position" as const, position: { ...position } };
  };
  const id = newId();
  project.dimensions[id] = {
    id,
    floorId,
    layerId: layerId(project, "dimensions"),
    start: anchor(start),
    end: anchor(end),
    mode: "aligned",
    offset: 350,
    metadata: {},
  };
  return id;
}

export function openingPosition(project: Project, wallId: UUID, point: Vec2): number {
  const wall = project.walls[wallId]!;
  const start = project.points[wall.startPointId]!.position;
  const end = project.points[wall.endPointId]!.position;
  return projectToSegment(point, start, end).fraction * distance(start, end);
}
