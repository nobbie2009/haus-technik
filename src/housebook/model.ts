import { z } from "zod";
import type { Entity, JsonValue } from "../models/common";
import type { Project } from "../models/project";
import type { SimulationScenario } from "../simulation/models";
const n = z.number().finite(),
  id = z.uuid(),
  name = z.string().trim().min(1).max(150),
  text = z.string().max(2000);
const point = z.strictObject({ x: n, y: n });
export const imageData = z
  .string()
  .max(4_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/);
export const scenarioSchema = z.strictObject({
  deviceStates: z.record(id, z.enum(["on", "off"])),
  switchStates: z.record(id, z.boolean()),
  relayStates: z.record(id, z.boolean()),
  disabledNodeIds: z.array(id),
  disabledPhases: z.record(id, z.array(z.enum(["L1", "L2", "L3"]))),
  assumeUnityPowerFactor: z.boolean(),
}) satisfies z.ZodType<SimulationScenario>;
export const backgroundSchema = z.strictObject({
  name,
  data: imageData,
  pixelWidth: n.positive(),
  pixelHeight: n.positive(),
  width: n.positive().max(1_000_000),
  position: point,
  opacity: n.min(0).max(1),
  visible: z.boolean(),
});
export const assetSchema = z.strictObject({
  status: z.enum(["existing", "planned", "remove", "completed"]).default("existing"),
  manufacturer: text.default(""),
  model: text.default(""),
  serial: text.default(""),
  notes: z.string().max(20000).default(""),
  maintenanceDate: z.union([z.literal(""), z.iso.date()]).default(""),
  documentUrl: z
    .union([z.literal(""), z.url().refine((v) => /^https?:\/\//i.test(v), "Nur HTTP-/HTTPS-Links.")])
    .default(""),
  photo: z.union([z.literal(""), imageData]).default(""),
  homeAssistantEntity: z
    .string()
    .max(150)
    .regex(/^$|^[a-z_]+\.[a-z0-9_]+$/)
    .default(""),
  mounting: z
    .strictObject({ wallId: id, distance: n.nonnegative(), offset: n, height: n.nonnegative() })
    .nullable()
    .default(null),
});
export const bookSchema = z.strictObject({
  version: z.literal(1),
  backgrounds: z.record(id, backgroundSchema),
  scenarios: z.array(z.strictObject({ id, name, scenario: scenarioSchema })).max(50),
  networkNodes: z
    .array(
      z.strictObject({
        id,
        name,
        floorId: id,
        position: point,
        kind: z.enum(["socket", "patchPanel", "switch", "router", "accessPoint"]),
        ports: z.number().int().min(1).max(256),
      }),
    )
    .max(1000),
  networkLinks: z
    .array(
      z.strictObject({
        id,
        name,
        from: id,
        to: id,
        fromPort: z.number().int().positive(),
        toPort: z.number().int().positive(),
        cableType: name,
        allowance: n.nonnegative(),
      }),
    )
    .max(2000),
  templates: z.array(z.strictObject({ id, name, project: z.string().max(8_000_000), roomId: id })).max(20),
});
export type Housebook = z.infer<typeof bookSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export const statusLabels = {
  existing: "Bestand",
  planned: "Geplant",
  remove: "Entfernen",
  completed: "Umgesetzt",
};
export const networkLabels = {
  socket: "Netzwerkdose",
  patchPanel: "Patchpanel",
  switch: "Switch",
  router: "Router",
  accessPoint: "Access Point",
};
export function housebook(project: Project): Housebook {
  return project.metadata.housebook
    ? bookSchema.parse(project.metadata.housebook)
    : { version: 1, backgrounds: {}, scenarios: [], networkNodes: [], networkLinks: [], templates: [] };
}
export function setHousebook(project: Project, book: Housebook) {
  project.metadata.housebook = bookSchema.parse(book) as unknown as JsonValue;
}
export function asset(entity: Entity): Asset {
  return assetSchema.parse(entity.metadata.asset ?? {});
}
export function setAsset(entity: Entity, value: Asset) {
  entity.metadata.asset = assetSchema.parse(value) as unknown as JsonValue;
}
export function cleanScenario(project: Project, scenario: SimulationScenario): SimulationScenario {
  const result = structuredClone(scenario);
  const all = Object.assign({}, ...Object.values(project.electrical).filter((v) => typeof v === "object"));
  result.disabledNodeIds = result.disabledNodeIds.filter((id) => all[id]);
  result.deviceStates = Object.fromEntries(
    Object.entries(result.deviceStates).filter(([id]) => project.electrical.devices[id]),
  );
  result.switchStates = Object.fromEntries(
    Object.entries(result.switchStates).filter(([id]) => project.electrical.switches[id]),
  );
  result.relayStates = Object.fromEntries(
    Object.entries(result.relayStates).filter(([id]) => project.electrical.controls[id]),
  );
  result.disabledPhases = Object.fromEntries(
    Object.entries(result.disabledPhases).filter(([id]) => project.electrical.supplies[id]),
  );
  return result;
}
