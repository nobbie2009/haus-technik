import { createProject } from "../core/projectFactory";
import { createOpening, createRoom } from "./actions/create";
import { parseProject } from "../core/validation";

export function createDemoProject() {
  const project = createProject("Haus am Garten · Beispiel");
  const floorId = project.floorOrder[0]!;
  const living = createRoom(
    project,
    floorId,
    [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 4500 },
      { x: 0, y: 4500 },
    ],
    "Wohnen & Essen",
  );
  const kitchen = createRoom(
    project,
    floorId,
    [
      { x: 6000, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 4500 },
      { x: 6000, y: 4500 },
    ],
    "Küche",
  );
  const bedroom = createRoom(
    project,
    floorId,
    [
      { x: 0, y: 4500 },
      { x: 6000, y: 4500 },
      { x: 6000, y: 8000 },
      { x: 0, y: 8000 },
    ],
    "Schlafzimmer",
  );
  const bathroom = createRoom(
    project,
    floorId,
    [
      { x: 6000, y: 4500 },
      { x: 10000, y: 4500 },
      { x: 10000, y: 8000 },
      { x: 6000, y: 8000 },
    ],
    "Bad",
  );
  project.rooms[living]!.type = "livingRoom";
  project.rooms[kitchen]!.type = "kitchen";
  project.rooms[bedroom]!.type = "bedroom";
  project.rooms[bathroom]!.type = "bathroom";
  createOpening(project, project.rooms[living]!.wallIds[0]!, 1500, "doors");
  createOpening(project, project.rooms[living]!.wallIds[0]!, 4500, "windows");
  createOpening(project, project.rooms[living]!.wallIds[1]!, 2800, "doors");
  createOpening(project, project.rooms[living]!.wallIds[2]!, 1800, "doors");
  createOpening(project, project.rooms[kitchen]!.wallIds[1]!, 2300, "windows");
  createOpening(project, project.rooms[bedroom]!.wallIds[2]!, 3000, "windows");
  createOpening(project, project.rooms[bathroom]!.wallIds[2]!, 2000, "windows");
  return parseProject(project);
}
