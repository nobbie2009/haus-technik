import { z } from "zod";
import type { Project } from "../models/project";
import type { Entity, JsonValue } from "../models/common";

const dimension = z.number().finite().positive().max(100000);
export const consumerShapeSchema = z.strictObject({
  width: dimension,
  depth: dimension,
  height: dimension,
  rotation: z.number().finite(),
  annualEnergyKWh: z.number().finite().nonnegative().max(1e9).nullable(),
});
export const consumerEntrySchema = consumerShapeSchema.extend({
  id: z.uuid(),
  name: z.string().trim().min(1).max(150),
  manufacturer: z.string().max(2000),
  model: z.string().max(2000),
  serial: z.string().max(2000),
  ratedPower: z.number().finite().nonnegative().max(1e9).nullable(),
  ratedVoltage: z.number().finite().positive().max(1e6).nullable(),
  phases: z.union([z.literal(1), z.literal(3)]),
});
export const consumerLibrarySchema = z
  .array(consumerEntrySchema)
  .max(1000)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Doppelte Verbraucher-ID.");
export type ConsumerEntry = z.infer<typeof consumerEntrySchema>;
export type ConsumerShape = z.infer<typeof consumerShapeSchema>;
export function consumerLibrary(project: Project): ConsumerEntry[] {
  return consumerLibrarySchema.parse(project.metadata.consumerLibrary ?? []);
}
export function setConsumerLibrary(project: Project, entries: ConsumerEntry[]) {
  project.metadata.consumerLibrary = consumerLibrarySchema.parse(entries) as unknown as JsonValue;
}
export function importConsumerLibrary(project: Project, text: string, idFactory: () => string): number {
  if (text.length > 5_000_000) throw new Error("Bibliotheksdatei zu groß (maximal 5 MB).");
  const imported = consumerLibrarySchema.parse(JSON.parse(text));
  setConsumerLibrary(project, [
    ...consumerLibrary(project),
    ...imported.map((entry) => ({ ...entry, id: idFactory() })),
  ]);
  return imported.length;
}
export function consumerShape(entity: Entity): ConsumerShape | null {
  return entity.metadata.consumerShape ? consumerShapeSchema.parse(entity.metadata.consumerShape) : null;
}
