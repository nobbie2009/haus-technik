import { emptyElectrical } from "../electrical/models";
import type { Floor } from "../models/floor";
import type { Project } from "../models/project";
import type { PlanLayer } from "../models/layer";
import { parseProject } from "./validation";

export function createProject(name = "Mein Haus"): Project {
  const now = new Date().toISOString();
  const floor: Floor = {
    id: crypto.randomUUID(),
    name: "Erdgeschoss",
    elevation: 0,
    defaultRoomHeight: 2500,
    metadata: {},
  };
  const floorPlan: PlanLayer = {
    id: crypto.randomUUID(),
    kind: "floorPlan",
    name: "Grundriss",
    visible: true,
    locked: false,
    opacity: 1,
    metadata: {},
  };
  const dimensions: PlanLayer = {
    id: crypto.randomUUID(),
    kind: "dimensions",
    name: "Bemaßung",
    visible: true,
    locked: false,
    opacity: 1,
    metadata: {},
  };
  const furniture: PlanLayer = {
    ...floorPlan,
    id: crypto.randomUUID(),
    kind: "furniture",
    name: "M\u00f6bel",
  };
  const electrical: PlanLayer = {
    ...floorPlan,
    id: crypto.randomUUID(),
    kind: "electrical",
    name: "Elektrik",
  };
  return parseProject({
    id: crypto.randomUUID(),
    schemaVersion: 10,
    electrical: emptyElectrical(),
    furniture: {},
    version: 0,
    name,
    units: { storage: "mm", display: "m" },
    floors: { [floor.id]: floor },
    floorOrder: [floor.id],
    layers: {
      [floorPlan.id]: floorPlan,
      [dimensions.id]: dimensions,
      [furniture.id]: furniture,
      [electrical.id]: electrical,
    },
    layerOrder: [floorPlan.id, dimensions.id, furniture.id, electrical.id],
    points: {},
    walls: {},
    rooms: {},
    doors: {},
    windows: {},
    dimensions: {},
    metadata: {},
    createdAt: now,
    updatedAt: now,
  });
}
