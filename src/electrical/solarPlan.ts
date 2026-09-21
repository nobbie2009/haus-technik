import { z } from "zod";
import type { Project } from "../models/project";
import type { Entity, Vec2 } from "../models/common";
import { newSolarPlant, solarPlants, setSolarPlants } from "../housebook/solar";
import { assetSchema } from "../housebook/model";
import { addElectrical } from "./actions";
import { newId } from "../utils/uuid";

export const solarKinds = {
  plant: { name: "Balkonkraftwerk", symbol: "PV", width: 2200, depth: 1800, height: 40 },
  module: { name: "Solarmodul", symbol: "PV", width: 1100, depth: 1800, height: 40 },
  inverter: { name: "Wechselrichter", symbol: "WR", width: 400, depth: 300, height: 150 },
  battery: { name: "Batteriespeicher", symbol: "BAT", width: 600, depth: 400, height: 800 },
};
export type SolarKind = keyof typeof solarKinds;
export const solarPlacementSchema = z.strictObject({
  plantId: z.uuid(),
  kind: z.enum(["plant", "module", "inverter", "battery"]),
  moduleId: z.uuid().nullable(),
  index: z.number().int().nonnegative(),
});
export function solarPlacement(item: Entity) {
  const result = solarPlacementSchema.safeParse(item.metadata.solarPlacement);
  return result.success ? result.data : null;
}
export function solarPlanRecord(project: Project, item: Entity) {
  const placement = solarPlacement(item);
  if (!placement) return null;
  const plant = solarPlants(project).find((p) => p.id === placement.plantId);
  const group = plant?.modules.find((m) => m.id === placement.moduleId);
  const asset =
    placement.kind === "module"
      ? group?.asset
      : placement.kind === "inverter"
        ? plant?.inverter.asset
        : placement.kind === "battery"
          ? plant?.battery?.asset
          : plant?.asset;
  return { placement, plant, group, asset };
}
export function solarPlanDetails(project: Project, item: Entity) {
  const record = solarPlanRecord(project, item);
  if (!record) return "";
  const { placement, plant, group, asset } = record;
  const rating =
    placement.kind === "module"
      ? `${group?.wp ?? "?"} Wp`
      : placement.kind === "inverter"
        ? `${plant?.inverter.powerW ?? "?"} W AC`
        : placement.kind === "battery"
          ? `${plant?.battery?.capacityWh ?? "?"} Wh`
          : "Anlagenübersicht";
  return [
    plant?.name ?? "Solarakte fehlt",
    solarKinds[placement.kind].name,
    rating,
    asset?.manufacturer,
    asset?.model,
    asset?.serial,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function placeSolar(
  project: Project,
  floorId: string,
  position: Vec2,
  kind: SolarKind,
  plantId: string | null,
) {
  const plants = solarPlants(project);
  let plant = plants.find((p) => p.id === plantId);
  if (plantId && !plant) throw new Error("Die gewählte Solaranlage fehlt.");
  if (
    kind === "plant" &&
    plant &&
    Object.values(project.electrical.devices).some((device) => {
      const placement = solarPlacement(device);
      return placement?.plantId === plant!.id && placement.kind === "plant";
    })
  )
    plant = undefined;
  if (!plant) {
    if (plants.length >= 100) throw new Error("Die maximale Anzahl von 100 Solaranlagen ist erreicht.");
    plant = newSolarPlant();
    let number = 1;
    while (plants.some((p) => p.name === `Balkonkraftwerk ${number}`)) number++;
    plant.name = `Balkonkraftwerk ${number}`;
    plants.push(plant);
  }
  if (kind === "battery" && !plant.battery)
    plant.battery = { capacityWh: null, asset: assetSchema.parse({}) };
  if (kind === "module" && !plant.modules.length)
    plant.modules.push({ id: newId(), quantity: 1, wp: null, asset: assetSchema.parse({}) });
  const placements = Object.values(project.electrical.devices)
    .map(solarPlacement)
    .filter((p) => p?.plantId === plant.id);
  let moduleId: string | null = null,
    index = 0;
  if (kind === "module") {
    let slot = plant.modules
      .flatMap((m) => Array.from({ length: m.quantity }, (_, i) => ({ moduleId: m.id, index: i })))
      .find(
        (slot) =>
          !placements.some(
            (p) => p?.kind === "module" && p.moduleId === slot.moduleId && p.index === slot.index,
          ),
      );
    if (!slot) {
      let group = plant.modules.at(-1)!;
      if (group.quantity >= 1000) {
        if (plant.modules.length >= 100)
          throw new Error("Die maximale Modulanzahl dieser Anlage ist erreicht.");
        group = { id: newId(), quantity: 1, wp: null, asset: assetSchema.parse({}) };
        plant.modules.push(group);
      } else group.quantity++;
      slot = { moduleId: group.id, index: group.quantity - 1 };
    }
    moduleId = slot.moduleId;
    index = slot.index;
  } else if (placements.some((p) => p?.kind === kind))
    throw new Error(
      "Diese Komponente ist bereits platziert. Das vorhandene Planobjekt verschieben oder löschen.",
    );
  setSolarPlants(project, plants);
  const id = addElectrical(project, floorId, position, "devices");
  const item = project.electrical.devices[id]!;
  const preset = solarKinds[kind];
  item.name =
    kind === "plant"
      ? plant.name
      : `${plant.name} · ${preset.name}${kind === "module" ? ` ${index + 1}` : ""}`;
  const labels = new Set(Object.values(project.electrical.devices).map((d) => d.label));
  let labelIndex = 1;
  while (labels.has(`${preset.symbol}-${labelIndex}`)) labelIndex++;
  item.label = `${preset.symbol}-${labelIndex}`;
  item.labelMode = "name";
  item.type = preset.name;
  item.metadata.solarPlacement = { plantId: plant.id, kind, moduleId, index };
  item.metadata.consumerShape = {
    width: preset.width,
    depth: preset.depth,
    height: preset.height,
    rotation: 0,
    annualEnergyKWh: null,
  };
  return id;
}
