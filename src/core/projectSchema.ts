import { electricalSchema } from "../electrical/schema";
import { z } from "zod";
import type { Project } from "../models/project";

const id = z.uuid();
const finite = z.number().finite();
const positive = finite.positive();
const name = z.string().refine((value) => value.trim().length > 0, "Name darf nicht leer sein.");
const entity = { id, metadata: z.record(z.string(), z.json()) };
const element = { ...entity, floorId: id, layerId: id };
const position = z.strictObject({ x: finite, y: finite });
const anchor = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("point"), pointId: id }),
  z.strictObject({ kind: z.literal("position"), position }),
]);
const opening = { ...element, wallId: id, position: finite.nonnegative(), width: positive, height: positive };

/** Striktes Dateiformat: unbekannte Felder werden nicht stillschweigend entfernt. */
export const projectSchema = z.strictObject({
  ...entity,
  schemaVersion: z.literal(10),
  electrical: electricalSchema,
  furniture: z.record(
    id,
    z.strictObject({
      ...element,
      type: name,
      name,
      roomId: id.nullable(),
      position,
      rotation: finite,
      width: positive,
      depth: positive,
      height: positive,
    }),
  ),
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  name,
  units: z.strictObject({ storage: z.literal("mm"), display: z.enum(["mm", "cm", "m"]) }),
  floors: z.record(id, z.strictObject({ ...entity, name, elevation: finite, defaultRoomHeight: positive })),
  floorOrder: z.array(id).min(1),
  points: z.record(id, z.strictObject({ ...entity, floorId: id, position })),
  walls: z.record(
    id,
    z.strictObject({
      ...element,
      startPointId: id,
      endPointId: id,
      thickness: positive,
      height: positive,
      material: z.string(),
    }),
  ),
  rooms: z.record(
    id,
    z.strictObject({
      ...element,
      name,
      type: z.enum([
        "livingRoom",
        "kitchen",
        "bedroom",
        "bathroom",
        "hallway",
        "basement",
        "technicalRoom",
        "garage",
        "other",
      ]),
      polygon: z.strictObject({ pointIds: z.array(id).min(3) }),
      wallIds: z.array(id).min(3),
      height: positive,
    }),
  ),
  doors: z.record(
    id,
    z.strictObject({
      ...opening,
      openingDirection: z.strictObject({
        hinge: z.enum(["startSide", "endSide"]),
        swing: z.enum(["leftOfWall", "rightOfWall"]),
      }),
    }),
  ),
  windows: z.record(id, z.strictObject({ ...opening, sillHeight: finite.nonnegative() })),
  dimensions: z.record(
    id,
    z.strictObject({
      ...element,
      start: anchor,
      end: anchor,
      mode: z.enum(["aligned", "horizontal", "vertical"]),
      offset: finite,
    }),
  ),
  layers: z.record(
    id,
    z.strictObject({
      ...entity,
      kind: z.enum([
        "floorPlan",
        "dimensions",
        "furniture",
        "electrical",
        "water",
        "gas",
        "network",
        "zigbee",
      ]),
      name,
      visible: z.boolean(),
      locked: z.boolean(),
      opacity: finite.min(0).max(1),
    }),
  ),
  layerOrder: z.array(id).min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Project>;
