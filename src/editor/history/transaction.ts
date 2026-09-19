import { syncMountings } from "../../housebook/mounting";
import { electricalNodes } from "../../electrical/cables";
import { detachConnectionAssignment } from "../../electrical/contacts";
import { syncElectricalRelations } from "../../electrical/actions";
import { elementKinds, elementTables } from "../../core/elementTables";
import { assignFurnitureRooms } from "../../furniture/actions";
import type { Project } from "../../models/project";
import type { FloorElement } from "../../models/common";
import type { ProjectMutation } from "../types";
import { parseProject } from "../../core/validation";

function geometrySignature(project: Project, entity: FloorElement): string {
  let dependencies: unknown[] = [];
  if ("startPointId" in entity && "endPointId" in entity)
    dependencies = [project.points[String(entity.startPointId)], project.points[String(entity.endPointId)]];
  if ("polygon" in entity)
    dependencies = project.rooms[entity.id]!.polygon.pointIds.map((id) => project.points[id]);
  if ("wallId" in entity) {
    const wall = project.walls[String(entity.wallId)];
    dependencies = wall ? [wall, project.points[wall.startPointId], project.points[wall.endPointId]] : [];
  }
  if ("start" in entity && "end" in entity)
    dependencies = [project.dimensions[entity.id]!.start, project.dimensions[entity.id]!.end].map((anchor) =>
      anchor.kind === "point" ? project.points[anchor.pointId] : anchor,
    );
  if ("startNodeId" in entity && "endNodeId" in entity) {
    const nodes = electricalNodes(project);
    dependencies = [String(entity.startNodeId), String(entity.endNodeId)].map((id) => {
      const node = nodes[id];
      return [node?.position, node?.floorId, node ? project.floors[node.floorId]?.elevation : null];
    });
  }
  return JSON.stringify([entity, dependencies, project.floors[entity.floorId]?.elevation]);
}

function assertLocks(before: Project, after: Project): void {
  if (
    JSON.stringify(before.electrical.settings) !== JSON.stringify(after.electrical.settings) &&
    Object.values(before.layers).some((layer) => layer.kind === "electrical" && layer.locked)
  )
    throw new Error("Die Elektrikebene ist gesperrt. Projektweite Elektrikvorgaben sind schreibgeschützt.");
  for (const kind of ["circuits", "protectionDevices"] as const) {
    const ids = new Set([...Object.keys(before.electrical[kind]), ...Object.keys(after.electrical[kind])]);
    for (const id of ids) {
      const previous = before.electrical[kind][id],
        next = after.electrical[kind][id];
      const owners = [previous?.distributionBoardId, next?.distributionBoardId].flatMap((boardId) =>
        boardId
          ? [before.electrical.distributionBoards[boardId], after.electrical.distributionBoards[boardId]]
          : [],
      );
      if (
        owners.some((board) => board && before.layers[board.layerId]?.locked) &&
        JSON.stringify(previous) !== JSON.stringify(next)
      )
        throw new Error(
          "Die Elektrikebene ist gesperrt. Stromkreise und Schutzgeräte sind schreibgeschützt.",
        );
    }
  }
  for (const kind of elementKinds) {
    for (const entity of Object.values(elementTables(before)[kind]))
      if (before.layers[entity.layerId]?.locked) {
        const next = elementTables(after)[kind][entity.id];
        if (!next || geometrySignature(before, entity) !== geometrySignature(after, next)) {
          throw new Error(
            "Die Änderung betrifft ein gesperrtes Objekt. Bitte zuerst die zugehörige Ebene entsperren.",
          );
        }
      }
    for (const entity of Object.values(elementTables(after)[kind]))
      if (!elementTables(before)[kind][entity.id] && before.layers[entity.layerId]?.locked) {
        throw new Error("Auf einer gesperrten Ebene können keine Objekte angelegt werden.");
      }
  }
}

export function transact(before: Project, mutate: ProjectMutation): Project {
  const draft = structuredClone(before);
  mutate(draft);
  for (const cable of Object.values(before.electrical.cables))
    if (!draft.electrical.cables[cable.id]) detachConnectionAssignment(draft, cable);
  syncMountings(before, draft);
  assignFurnitureRooms(draft);
  syncElectricalRelations(draft);
  assertLocks(before, draft);
  if (JSON.stringify(before) === JSON.stringify(draft)) return before;
  draft.version = before.version + 1;
  draft.updatedAt = new Date(Math.max(Date.now(), Date.parse(before.updatedAt))).toISOString();
  return parseProject(draft);
}
