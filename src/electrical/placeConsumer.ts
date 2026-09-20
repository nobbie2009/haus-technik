import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import { addElectrical } from "./actions";
import { consumerLibrary, consumerShapeSchema } from "./consumerLibrary";
import { setAsset, asset } from "../housebook/model";

export function placeConsumer(project: Project, floorId: string, position: Vec2, entryId: string): string {
  const entry = consumerLibrary(project).find((e) => e.id === entryId);
  if (!entry) throw new Error("Dieser Bibliothekseintrag ist nicht mehr vorhanden.");
  const id = addElectrical(project, floorId, position, "devices");
  const item = project.electrical.devices[id]!;
  Object.assign(item, {
    name: entry.name,
    labelMode: "name",
    type: entry.name,
    ratedPower: entry.ratedPower,
    ratedVoltage: entry.ratedVoltage,
    phases: entry.phases,
  });
  item.metadata.consumerShape = consumerShapeSchema.parse({
    width: entry.width,
    depth: entry.depth,
    height: entry.height,
    rotation: entry.rotation,
    annualEnergyKWh: entry.annualEnergyKWh,
  });
  setAsset(item, {
    ...asset(item),
    manufacturer: entry.manufacturer,
    model: entry.model,
    serial: entry.serial,
  });
  return id;
}
