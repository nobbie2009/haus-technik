import { z } from "zod";
import type { Project } from "../models/project";
import { assetSchema } from "./model";
import { homeBook, setHomeBook } from "./home";
import { newId } from "../utils/uuid";
const watts = z.number().finite().nonnegative().max(1e8).nullable(),
  text = z.string().max(2000);
export const solarPlantSchema = z
  .strictObject({
    id: z.uuid(),
    name: z.string().trim().min(1).max(150),
    location: text,
    installed: z.union([z.literal(""), z.iso.date()]),
    orientation: text,
    tilt: z.number().finite().min(0).max(180).nullable(),
    asset: assetSchema,
    modules: z
      .array(
        z.strictObject({
          id: z.uuid(),
          quantity: z.number().int().min(1).max(1000),
          wp: watts,
          asset: assetSchema,
        }),
      )
      .max(100),
    inverter: z.strictObject({ powerW: watts, asset: assetSchema }),
    battery: z.strictObject({ capacityWh: watts, asset: assetSchema }).nullable(),
    outletId: z.uuid().nullable(),
    meterId: z.uuid().nullable(),
  })
  .refine((v) => new Set(v.modules.map((m) => m.id)).size === v.modules.length, "Doppelte Modulgruppen-ID.");
export const solarSchema = z
  .array(solarPlantSchema)
  .max(100)
  .refine((v) => new Set(v.map((p) => p.id)).size === v.length, "Doppelte Anlagen-ID.");
export type SolarPlant = z.infer<typeof solarPlantSchema>;
export function solarPlants(p: Project): SolarPlant[] {
  return solarSchema.parse(p.metadata.solarPlants ?? []);
}
export function setSolarPlants(p: Project, plants: SolarPlant[]) {
  p.metadata.solarPlants = solarSchema.parse(plants);
}
export function newSolarPlant(): SolarPlant {
  return {
    id: newId(),
    name: "",
    location: "",
    installed: "",
    orientation: "",
    tilt: null,
    asset: assetSchema.parse({}),
    modules: [],
    inverter: { powerW: null, asset: assetSchema.parse({}) },
    battery: null,
    outletId: null,
    meterId: null,
  };
}
export function modulePower(plant: SolarPlant): number | null {
  return !plant.modules.length || plant.modules.some((m) => m.wp === null)
    ? null
    : plant.modules.reduce((sum, m) => sum + m.quantity * m.wp!, 0);
}
export function ensureSolarMeter(p: Project, plantId: string): string {
  const plants = solarPlants(p),
    plant = plants.find((s) => s.id === plantId);
  if (!plant) throw new Error("Bitte die Anlage zuerst speichern.");
  const b = homeBook(p),
    existing = b.meters.find((m) => m.id === plant.meterId);
  if (existing) {
    if (existing.kind !== "solar" || existing.unit !== "kWh")
      throw new Error("Bitte einen Solarertragszähler in kWh zuordnen.");
    return existing.id;
  }
  const id = newId();
  b.meters.push({
    id,
    name: `${plant.name} · Ertrag`,
    kind: "solar",
    unit: "kWh",
    serial: "",
    location: plant.location,
    target: null,
    price: null,
    readings: [],
  });
  plant.meterId = id;
  setHomeBook(p, b);
  setSolarPlants(p, plants);
  return id;
}
