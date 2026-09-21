import { z } from "zod";
import { imageData } from "./model";
import { objectRef } from "./home";
import type { Project } from "../models/project";
export const constructionSchema = z
  .array(
    z.strictObject({
      id: z.uuid(),
      at: z.iso.datetime(),
      title: z.string().trim().min(1).max(150),
      target: objectRef.nullable(),
      notes: z.string().max(10000),
      measurement: z.string().max(2000),
      done: z.boolean(),
      photo: z.union([z.literal(""), imageData]),
      audio: z
        .string()
        .max(3_000_000)
        .regex(/^$|^data:audio\/(?:webm|mp4|ogg|wav)(?:;codecs=[a-zA-Z0-9.,_-]+)?;base64,[A-Za-z0-9+/=]+$/),
    }),
  )
  .max(200)
  .refine((rows) => new Set(rows.map((r) => r.id)).size === rows.length, "Doppelte Baustellennotiz.");
export type ConstructionNote = z.infer<typeof constructionSchema>[number];
export function constructionNotes(p: Project) {
  return constructionSchema.parse(p.metadata.constructionNotes ?? []);
}
export function setConstructionNotes(p: Project, rows: ConstructionNote[]) {
  p.metadata.constructionNotes = constructionSchema.parse(rows);
}
