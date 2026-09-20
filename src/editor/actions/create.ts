import { newId } from "../../utils/uuid";
import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { polygonProblem } from "../../geometry/polygon";
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
