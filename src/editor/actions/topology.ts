import { newId } from "../../utils/uuid";
import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Wall } from "../../models/wall";
import { distance, projectToSegment } from "../../geometry/distance";
import { cross, subtract } from "../../geometry/vector";
import { LENGTH_EPSILON } from "../../geometry/tolerances";

export function layerId(project: Project, kind: "floorPlan" | "dimensions"): UUID {
  const layer = Object.values(project.layers).find(
    (value) => value.kind === kind && value.visible && !value.locked,
  );
  if (!layer) throw new Error("Die benötigte Ebene ist ausgeblendet oder gesperrt.");
  return layer.id;
}

export function pointAt(project: Project, floorId: UUID, position: Vec2): UUID {
  const existing = Object.values(project.points).find(
    (point) => point.floorId === floorId && distance(point.position, position) <= LENGTH_EPSILON,
  );
  if (existing) return existing.id;
  const id = newId();
  project.points[id] = { id, floorId, position: { ...position }, metadata: {} };
  return id;
}

/** Bestehende Wand-ID bleibt am Startsegment erhalten; alle Abhängigkeiten ziehen mit. */
export function splitWall(project: Project, wallId: UUID, pointId: UUID): void {
  const wall = project.walls[wallId]!;
  if (wall.startPointId === pointId || wall.endPointId === pointId) return;
  const start = project.points[wall.startPointId]!.position;
  const end = project.points[wall.endPointId]!.position;
  const point = project.points[pointId]!.position;
  const projection = projectToSegment(point, start, end);
  const cut = distance(start, point);
  const length = distance(start, end);
  if (projection.distance > LENGTH_EPSILON || cut <= LENGTH_EPSILON || length - cut <= LENGTH_EPSILON) return;
  const openings = [...Object.values(project.doors), ...Object.values(project.windows)].filter(
    (opening) => opening.wallId === wallId,
  );
  if (
    openings.some(
      (opening) =>
        cut > opening.position - opening.width / 2 + LENGTH_EPSILON &&
        cut < opening.position + opening.width / 2 - LENGTH_EPSILON,
    )
  ) {
    throw new Error(
      "Hier liegt eine Tür oder ein Fenster. Der Wandanschluss muss außerhalb der Öffnung liegen.",
    );
  }
  const nextId = newId();
  project.walls[nextId] = { ...structuredClone(wall), id: nextId, startPointId: pointId };
  const previousEnd = wall.endPointId;
  wall.endPointId = pointId;
  for (const table of [project.furniture, ...Object.values(project.electrical)]) {
    for (const candidate of Object.values(table)) {
      if (!candidate || typeof candidate !== "object" || !("metadata" in candidate)) continue;
      const record = (candidate.metadata as import("../../models/common").Metadata).asset;
      if (!record || typeof record !== "object" || Array.isArray(record)) continue;
      const mounting = record.mounting;
      if (
        mounting &&
        typeof mounting === "object" &&
        !Array.isArray(mounting) &&
        mounting.wallId === wallId &&
        typeof mounting.distance === "number" &&
        mounting.distance > cut
      ) {
        mounting.wallId = nextId;
        mounting.distance -= cut;
      }
    }
  }
  for (const room of Object.values(project.rooms)) {
    const index = room.wallIds.indexOf(wallId);
    if (index < 0) continue;
    const forward = room.polygon.pointIds[index] !== previousEnd;
    room.polygon.pointIds.splice(index + 1, 0, pointId);
    room.wallIds.splice(index, 1, ...(forward ? [wallId, nextId] : [nextId, wallId]));
  }
  for (const opening of openings)
    if (opening.position > cut) {
      opening.wallId = nextId;
      opening.position -= cut;
    }
}

export function connectPoint(project: Project, floorId: UUID, position: Vec2): UUID {
  const id = pointAt(project, floorId, position);
  for (const wall of Object.values(project.walls))
    if (wall.floorId === floorId) splitWall(project, wall.id, id);
  return id;
}

/** Erzeugt einen geraden Wandzug einschließlich Schnittpunkten und Teilsegmenten. */
export function addWallPath(
  project: Project,
  floorId: UUID,
  start: Vec2,
  end: Vec2,
  thickness = 200,
): { pointIds: UUID[]; wallIds: UUID[] } {
  if (distance(start, end) < 1) throw new Error("Eine Wand muss mindestens 1 mm lang sein.");
  const layer = layerId(project, "floorPlan");
  const direction = subtract(end, start);
  const contacts: Vec2[] = [start, end];
  for (const wall of Object.values(project.walls).filter((wall) => wall.floorId === floorId)) {
    const a = project.points[wall.startPointId]!.position;
    const b = project.points[wall.endPointId]!.position;
    const other = subtract(b, a);
    const denominator = cross(direction, other);
    if (Math.abs(denominator) > LENGTH_EPSILON) {
      const offset = subtract(a, start);
      const t = cross(offset, other) / denominator;
      const u = cross(offset, direction) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
        contacts.push({ x: start.x + t * direction.x, y: start.y + t * direction.y });
    } else {
      if (projectToSegment(a, start, end).distance <= LENGTH_EPSILON) contacts.push(a);
      if (projectToSegment(b, start, end).distance <= LENGTH_EPSILON) contacts.push(b);
    }
  }
  contacts.forEach((point) => connectPoint(project, floorId, point));
  const pointIds = Object.values(project.points)
    .filter(
      (point) =>
        point.floorId === floorId && projectToSegment(point.position, start, end).distance <= LENGTH_EPSILON,
    )
    .sort((a, b) => distance(start, a.position) - distance(start, b.position))
    .map((point) => point.id);
  // Auch bereits vorhandene freie Punkte müssen zu echten Anschlüssen werden.
  pointIds.forEach((id) => connectPoint(project, floorId, project.points[id]!.position));
  const wallIds: UUID[] = [];
  for (let i = 0; i < pointIds.length - 1; i++) {
    const a = pointIds[i]!;
    const b = pointIds[i + 1]!;
    const existing = Object.values(project.walls).find(
      (wall) =>
        wall.floorId === floorId &&
        ((wall.startPointId === a && wall.endPointId === b) ||
          (wall.startPointId === b && wall.endPointId === a)),
    );
    if (existing) {
      wallIds.push(existing.id);
      continue;
    }
    const id = newId();
    const wall: Wall = {
      id,
      floorId,
      layerId: layer,
      startPointId: a,
      endPointId: b,
      thickness,
      height: project.floors[floorId]!.defaultRoomHeight,
      material: "Mauerwerk",
      metadata: {},
    };
    project.walls[id] = wall;
    wallIds.push(id);
  }
  return { pointIds, wallIds };
}

/**
 * Setzt einen rechteckigen Wandversatz, etwa für einen Schornstein oder eine Nische, in eine Wand.
 * Positive Tiefe ragt in den angrenzenden Raum, negative Tiefe nach außen. Liegt der Versatz in einer
 * Raumecke, wird die anschließende Wand gekürzt statt doppelt belegt.
 */
export function insertWallOffset(
  project: Project,
  wallId: UUID,
  from: "start" | "end",
  offset: number,
  width: number,
  depth: number,
): void {
  const wall = project.walls[wallId]!;
  const start = project.points[wall.startPointId]!.position;
  const end = project.points[wall.endPointId]!.position;
  const length = distance(start, end);
  if (width < 1) throw new Error("Die Breite des Versatzes muss mindestens 1 mm betragen.");
  if (Math.abs(depth) < 1) throw new Error("Die Tiefe des Versatzes muss mindestens 1 mm betragen.");
  if (offset < 0 || offset + width > length + LENGTH_EPSILON)
    throw new Error("Abstand und Breite des Versatzes müssen innerhalb der Wandlänge liegen.");
  const startOffset = Math.max(0, Math.min(from === "start" ? offset : length - offset - width, length));
  const endOffset = Math.min(length, startOffset + width);
  const unit = { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
  const at = (value: number): UUID =>
    value <= LENGTH_EPSILON
      ? wall.startPointId
      : length - value <= LENGTH_EPSILON
        ? wall.endPointId
        : pointAt(project, wall.floorId, { x: start.x + unit.x * value, y: start.y + unit.y * value });
  const a = at(startOffset);
  splitWall(project, wallId, a);
  const b = at(endOffset);
  for (const candidate of Object.values(project.walls)) splitWall(project, candidate.id, b);
  const middle = Object.values(project.walls).find(
    (candidate) => candidate.startPointId === a && candidate.endPointId === b,
  );
  if (!middle) throw new Error("Der Versatz konnte nicht in die Wand eingefügt werden.");
  if (
    [...Object.values(project.doors), ...Object.values(project.windows)].some(
      (opening) => opening.wallId === middle.id,
    )
  )
    throw new Error("Im Bereich des Versatzes liegt eine Tür oder ein Fenster.");
  const room = Object.values(project.rooms).find((candidate) => candidate.wallIds.includes(middle.id));
  let normal = { x: -unit.y, y: unit.x };
  if (room) {
    const polygon = room.polygon.pointIds.map((id) => project.points[id]!.position);
    const index = room.wallIds.indexOf(middle.id);
    const forward = room.polygon.pointIds[index] === a;
    const area = polygon.reduce((sum, point, i) => sum + cross(point, polygon[(i + 1) % polygon.length]!), 0);
    if (area > 0 !== forward) normal = { x: unit.y, y: -unit.x };
  }
  const shift = (id: UUID): UUID => {
    const position = project.points[id]!.position;
    const next = newId();
    project.points[next] = {
      id: next,
      floorId: wall.floorId,
      position: { x: position.x + normal.x * depth, y: position.y + normal.y * depth },
      metadata: {},
    };
    return next;
  };
  const c = shift(a);
  const d = shift(b);
  const side = (from: UUID, to: UUID): UUID => {
    const id = newId();
    project.walls[id] = { ...structuredClone(middle), id, startPointId: from, endPointId: to };
    return id;
  };
  const first = side(a, c);
  const last = side(d, b);
  middle.startPointId = c;
  middle.endPointId = d;
  for (const candidate of Object.values(project.rooms)) {
    const index = candidate.wallIds.indexOf(middle.id);
    if (index < 0) continue;
    if (candidate.polygon.pointIds[index] === a) {
      candidate.polygon.pointIds.splice(index + 1, 0, c, d);
      candidate.wallIds.splice(index, 1, first, middle.id, last);
    } else {
      candidate.polygon.pointIds.splice(index + 1, 0, d, c);
      candidate.wallIds.splice(index, 1, last, middle.id, first);
    }
  }
  collapseCornerSpur(project, a, first, c);
  collapseCornerSpur(project, b, last, d);
}

/** Entfernt eine Ecke, wenn die neue Versatzwand auf der anschließenden Wand zurückläuft. */
function collapseCornerSpur(project: Project, cornerId: UUID, spurId: UUID, tipId: UUID): void {
  const attached = Object.values(project.walls).filter(
    (wall) => wall.id !== spurId && (wall.startPointId === cornerId || wall.endPointId === cornerId),
  );
  const corner = project.points[cornerId]!.position;
  const tip = project.points[tipId]!.position;
  const spur = subtract(tip, corner);
  const overlapping = attached.filter((wall) => {
    const other =
      project.points[wall.startPointId === cornerId ? wall.endPointId : wall.startPointId]!.position;
    const direction = subtract(other, corner);
    return (
      Math.abs(cross(direction, spur)) <= LENGTH_EPSILON * distance(other, corner) &&
      direction.x * spur.x + direction.y * spur.y > 0
    );
  });
  if (!overlapping.length) return;
  const wall = overlapping[0]!;
  const otherId = wall.startPointId === cornerId ? wall.endPointId : wall.startPointId;
  const remaining = distance(project.points[otherId]!.position, tip);
  if (
    attached.length !== 1 ||
    distance(project.points[otherId]!.position, corner) <= distance(corner, tip) + 1
  )
    throw new Error("Der Versatz ist in dieser Ecke zu tief oder überlagert eine weitere Wand.");
  const removed = distance(corner, tip);
  for (const opening of [...Object.values(project.doors), ...Object.values(project.windows)]) {
    if (opening.wallId !== wall.id) continue;
    if (wall.startPointId === cornerId) opening.position -= removed;
    if (
      opening.position - opening.width / 2 < -LENGTH_EPSILON ||
      opening.position + opening.width / 2 > remaining + LENGTH_EPSILON
    )
      throw new Error("Eine Tür oder ein Fenster liegt im Bereich des Versatzes.");
  }
  if (wall.startPointId === cornerId) wall.startPointId = tipId;
  else wall.endPointId = tipId;
  delete project.walls[spurId];
  for (const room of Object.values(project.rooms)) {
    const index = room.polygon.pointIds.indexOf(cornerId);
    if (index < 0) continue;
    room.polygon.pointIds.splice(index, 1);
    room.wallIds.splice(room.wallIds.indexOf(spurId), 1);
  }
  delete project.points[cornerId];
  for (const dimension of Object.values(project.dimensions))
    if (
      [dimension.start, dimension.end].some(
        (anchor) => anchor.kind === "point" && anchor.pointId === cornerId,
      )
    )
      delete project.dimensions[dimension.id];
}
