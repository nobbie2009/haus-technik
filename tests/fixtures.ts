import { createProject } from "../src/core/projectFactory";
import type { Project } from "../src/models/project";
import type { Room } from "../src/models/room";
import type { Wall } from "../src/models/wall";

export function rectangleFixture(): { project: Project; room: Room; walls: Wall[] } {
  const project = createProject("Testhaus");
  const floorId = project.floorOrder[0]!;
  const layerId = project.layerOrder[0]!;
  const points = [
    { x: 0, y: 0 },
    { x: 4350, y: 0 },
    { x: 4350, y: 3200 },
    { x: 0, y: 3200 },
  ].map((position) => ({ id: crypto.randomUUID(), floorId, position, metadata: {} }));
  points.forEach((point) => {
    project.points[point.id] = point;
  });
  const walls = points.map((point, i): Wall => ({
    id: crypto.randomUUID(),
    floorId,
    layerId,
    startPointId: point.id,
    endPointId: points[(i + 1) % 4]!.id,
    thickness: 200,
    height: 2500,
    material: "Mauerwerk",
    metadata: {},
  }));
  walls.forEach((wall) => {
    project.walls[wall.id] = wall;
  });
  const room: Room = {
    id: crypto.randomUUID(),
    floorId,
    layerId,
    name: "Wohnzimmer",
    type: "livingRoom",
    height: 2500,
    polygon: { pointIds: points.map((point) => point.id) },
    wallIds: walls.map((wall) => wall.id),
    metadata: {},
  };
  project.rooms[room.id] = room;
  return { project, room, walls };
}
