import type { Project } from "../models/project";
import type { Vec2, UUID } from "../models/common";
import { furnitureCatalog } from "./catalog";
import { pointInPolygon } from "../geometry/dimensions";

export function assignFurnitureRooms(project: Project): void {
  for (const item of Object.values(project.furniture)) {
    const rooms = Object.values(project.rooms).filter(
      (room) =>
        room.floorId === item.floorId &&
        pointInPolygon(
          item.position,
          room.polygon.pointIds.flatMap((id) => (project.points[id] ? [project.points[id]!.position] : [])),
        ),
    );
    item.roomId = rooms.length === 1 ? rooms[0]!.id : null;
  }
}
export function addFurniture(project: Project, floorId: UUID, position: Vec2, type: string): UUID {
  const preset = furnitureCatalog.find((item) => item.type === type) ?? furnitureCatalog.at(-1)!;
  const layer = Object.values(project.layers).find(
    (layer) => layer.kind === "furniture" && layer.visible && !layer.locked,
  );
  if (!layer) throw new Error("Bitte die Möbelebene einblenden und entsperren.");
  const id = crypto.randomUUID();
  project.furniture[id] = {
    ...preset,
    id,
    floorId,
    layerId: layer.id,
    roomId: null,
    position: { ...position },
    rotation: 0,
    metadata: {},
  };
  assignFurnitureRooms(project);
  return id;
}
