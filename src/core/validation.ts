import { electricalIssues } from "../electrical/validation";
import type { Entity, FloorElement, UUID } from "../models/common";
import type { Project } from "../models/project";
import { distance } from "../geometry/distance";
import { polygonProblem, polygonSignedArea } from "../geometry/polygon";
import { LENGTH_EPSILON } from "../geometry/tolerances";
import { isJsonTree } from "./json";
import { projectSchema } from "./projectSchema";

export interface ValidationIssue {
  path: string;
  message: string;
}
export type ValidationResult =
  { success: true; project: Project } | { success: false; issues: ValidationIssue[] };

export class ProjectValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "ProjectValidationError";
  }
}

function relationalIssues(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const report = (path: string, message: string): void => {
    issues.push({ path, message });
  };
  const tables: Record<string, Record<UUID, Entity>> = {
    ...Object.fromEntries(
      Object.entries(project.electrical)
        .filter(([name]) => name !== "settings")
        .map(([name, table]) => [`electrical.${name}`, table]),
    ),
    furniture: project.furniture,
    floors: project.floors,
    points: project.points,
    walls: project.walls,
    rooms: project.rooms,
    doors: project.doors,
    windows: project.windows,
    dimensions: project.dimensions,
    layers: project.layers,
  };
  const ids = new Set([project.id]);
  for (const [tableName, table] of Object.entries(tables))
    for (const [key, entity] of Object.entries(table)) {
      if (key !== entity.id)
        report(`${tableName}.${key}.id`, "Tabellenschlüssel und Objekt-ID stimmen nicht überein.");
      if (ids.has(entity.id)) report(`${tableName}.${key}.id`, "UUID ist bereits vergeben.");
      ids.add(entity.id);
    }
  for (const [path, order, table] of [
    ["floorOrder", project.floorOrder, project.floors],
    ["layerOrder", project.layerOrder, project.layers],
  ] as const) {
    if (
      new Set(order).size !== order.length ||
      order.length !== Object.keys(table).length ||
      order.some((id) => !table[id])
    ) {
      report(path, "Reihenfolge muss jedes vorhandene Objekt genau einmal enthalten.");
    }
  }
  if (Date.parse(project.updatedAt) < Date.parse(project.createdAt))
    report("updatedAt", "Änderungszeit liegt vor der Erstellungszeit.");
  for (const point of Object.values(project.points)) {
    if (!project.floors[point.floorId]) report(`points.${point.id}.floorId`, "Geschoss fehlt.");
  }
  const checkElement = (
    element: FloorElement,
    path: string,
    kind: "floorPlan" | "dimensions" | "furniture",
  ): void => {
    if (!project.floors[element.floorId]) report(`${path}.floorId`, "Geschoss fehlt.");
    if (project.layers[element.layerId]?.kind !== kind)
      report(`${path}.layerId`, `Objekt benötigt eine Ebene vom Typ ${kind}.`);
  };
  for (const wall of Object.values(project.walls)) {
    const path = `walls.${wall.id}`;
    checkElement(wall, path, "floorPlan");
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) report(path, "Wandendpunkt fehlt.");
    else {
      if (start.floorId !== wall.floorId || end.floorId !== wall.floorId)
        report(path, "Wandendpunkte liegen auf einem anderen Geschoss.");
      if (distance(start.position, end.position) <= LENGTH_EPSILON) report(path, "Wand hat keine Länge.");
    }
  }
  const wallRooms = new Map<UUID, Array<{ roomId: UUID; side: number }>>();
  for (const room of Object.values(project.rooms)) {
    const path = `rooms.${room.id}`;
    checkElement(room, path, "floorPlan");
    const pointIds = room.polygon.pointIds;
    const points = pointIds.map((id) => project.points[id]);
    if (new Set(pointIds).size !== pointIds.length)
      report(`${path}.polygon`, "Polygon enthält eine Punkt-ID mehrfach.");
    if (room.wallIds.length !== points.length || new Set(room.wallIds).size !== room.wallIds.length) {
      report(`${path}.wallIds`, "Jede Polygonkante benötigt genau eine eigene Wandreferenz.");
    }
    if (points.some((p) => !p || p.floorId !== room.floorId))
      report(`${path}.polygon`, "Raumpunkt fehlt oder gehört zu einem anderen Geschoss.");
    const positions = points.flatMap((p) => (p ? [p.position] : []));
    const problem = positions.length === points.length ? polygonProblem(positions) : null;
    if (problem) report(`${path}.polygon`, problem);
    for (let i = 0; i < room.wallIds.length; i++) {
      const wall = project.walls[room.wallIds[i]!];
      const a = pointIds[i];
      const b = pointIds[(i + 1) % pointIds.length];
      if (!wall || wall.floorId !== room.floorId)
        report(`${path}.wallIds.${i}`, "Wand fehlt oder gehört zu einem anderen Geschoss.");
      else if (!(
        (wall.startPointId === a && wall.endPointId === b) ||
        (wall.startPointId === b && wall.endPointId === a)
      )) {
        report(`${path}.wallIds.${i}`, "Wand verbindet nicht die zugehörigen Polygonpunkte.");
      } else {
        const occupants = wallRooms.get(wall.id) ?? [];
        occupants.push({
          roomId: room.id,
          side: Math.sign(polygonSignedArea(positions)) * (wall.startPointId === a ? 1 : -1),
        });
        wallRooms.set(wall.id, occupants);
      }
    }
  }
  for (const [wallId, occupants] of wallRooms) {
    if (occupants.length > 2 || (occupants.length === 2 && occupants[0]!.side === occupants[1]!.side)) {
      report(`walls.${wallId}`, "Eine Wand darf höchstens einen Raum je Seite begrenzen.");
    }
  }
  const openings = [
    ...Object.values(project.doors).map((value) => ({ value, path: `doors.${value.id}`, base: 0 })),
    ...Object.values(project.windows).map((value) => ({
      value,
      path: `windows.${value.id}`,
      base: value.sillHeight,
    })),
  ];
  const wallOpenings = new Map<UUID, Array<{ start: number; end: number; path: string }>>();
  for (const { value, path, base } of openings) {
    checkElement(value, path, "floorPlan");
    const wall = project.walls[value.wallId];
    if (!wall) {
      report(`${path}.wallId`, "Zugeordnete Wand fehlt.");
      continue;
    }
    if (wall.floorId !== value.floorId) report(path, "Öffnung und Wand liegen auf verschiedenen Geschossen.");
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    const left = value.position - value.width / 2;
    const right = value.position + value.width / 2;
    if (
      start &&
      end &&
      (left < -LENGTH_EPSILON || right > distance(start.position, end.position) + LENGTH_EPSILON)
    ) {
      report(path, "Öffnung liegt nicht vollständig innerhalb der Wand.");
    }
    if (base + value.height > wall.height + LENGTH_EPSILON)
      report(path, "Öffnung überschreitet die Wandhöhe.");
    const siblings = wallOpenings.get(wall.id) ?? [];
    if (
      siblings.some(
        (sibling) => Math.min(right, sibling.end) - Math.max(left, sibling.start) > LENGTH_EPSILON,
      )
    ) {
      report(path, "Öffnung überschneidet eine andere Öffnung derselben Wand.");
    }
    siblings.push({ start: left, end: right, path });
    wallOpenings.set(wall.id, siblings);
  }
  for (const dimension of Object.values(project.dimensions)) {
    const path = `dimensions.${dimension.id}`;
    checkElement(dimension, path, "dimensions");
    for (const [key, anchor] of [
      ["start", dimension.start],
      ["end", dimension.end],
    ] as const) {
      if (anchor.kind === "point" && project.points[anchor.pointId]?.floorId !== dimension.floorId) {
        report(`${path}.${key}`, "Maßpunkt fehlt oder gehört zu einem anderen Geschoss.");
      }
    }
  }
  for (const item of Object.values(project.furniture)) {
    checkElement(item, `furniture.${item.id}`, "furniture");
    if (item.roomId !== null && project.rooms[item.roomId]?.floorId !== item.floorId)
      report(`furniture.${item.id}.roomId`, "Raum fehlt oder liegt auf einem anderen Geschoss.");
  }
  return [...issues, ...electricalIssues(project)];
}

export function validateProject(input: unknown): ValidationResult {
  if (!isJsonTree(input))
    return {
      success: false,
      issues: [
        {
          path: "project",
          message: "Projekt muss endliche JSON-Werte ohne Zyklen enthalten (maximal 100 Verschachtelungen).",
        },
      ],
    };
  if (typeof input === "object" && input !== null && "schemaVersion" in input && input.schemaVersion !== 10) {
    return {
      success: false,
      issues: [
        {
          path: "schemaVersion",
          message: "Nicht unterstützte Projektversion. Unterstützt wird schemaVersion 10.",
        },
      ],
    };
  }
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  const issues = relationalIssues(parsed.data);
  return issues.length ? { success: false, issues } : { success: true, project: parsed.data };
}

export function parseProject(input: unknown): Project {
  const result = validateProject(input);
  if (!result.success) throw new ProjectValidationError(result.issues);
  return result.project;
}
