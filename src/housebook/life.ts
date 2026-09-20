import { z } from "zod";
import type { Project } from "../models/project";
import { imageData } from "./model";
import { objectRef, localDate } from "./home";
import { newId } from "../utils/uuid";
const text = z.string().max(10000),
  name = z.string().trim().min(1).max(150),
  id = z.uuid();
const photo = z.union([z.literal(""), imageData]);
export const lifeSchema = z
  .strictObject({
    version: z.literal(1),
    events: z
      .array(
        z.strictObject({
          id,
          title: name,
          date: z.iso.date(),
          kind: z.enum(["repair", "renovation", "purchase", "other"]),
          location: text,
          target: objectRef.nullable(),
          notes: text,
          cost: z.number().finite().nonnegative().max(1e9).nullable(),
          before: photo,
          after: photo,
          receipt: z
            .strictObject({
              name: z.string().min(1).max(255),
              data: z
                .string()
                .max(6_000_000)
                .regex(/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/),
            })
            .nullable(),
        }),
      )
      .max(2000),
    contacts: z
      .array(
        z.strictObject({
          id,
          name,
          role: text,
          phone: z.string().max(200),
          email: z.union([z.literal(""), z.email()]),
          notes: text,
        }),
      )
      .max(200),
    places: z.array(z.strictObject({ id, title: name, location: text, instructions: text })).max(200),
    quickKeys: z.array(z.string().min(1).max(200)).max(1000),
    quickNotes: text,
  })
  .superRefine((v, c) => {
    for (const values of [
      v.events.map((v) => v.id),
      v.contacts.map((v) => v.id),
      v.places.map((v) => v.id),
      v.quickKeys,
    ])
      if (new Set(values).size !== values.length)
        c.addIssue({
          code: "custom",
          message: "Doppelte Einträge in der Hauschronik oder Schnellübersicht.",
        });
  });
export type HouseLife = z.infer<typeof lifeSchema>;
export type HouseEvent = HouseLife["events"][number];
export type HouseContact = HouseLife["contacts"][number];
export function life(p: Project): HouseLife {
  return lifeSchema.parse(
    p.metadata.houseLife ?? {
      version: 1,
      events: [],
      contacts: [],
      places: [],
      quickKeys: [],
      quickNotes: "",
    },
  );
}
export function setLife(p: Project, b: HouseLife) {
  p.metadata.houseLife = lifeSchema.parse(b);
}
export function newEvent(): HouseEvent {
  return {
    id: newId(),
    title: "",
    date: localDate(),
    kind: "repair",
    location: "",
    target: null,
    notes: "",
    cost: null,
    before: "",
    after: "",
    receipt: null,
  };
}
export const eventKinds = {
  repair: "Reparatur",
  renovation: "Umbau",
  purchase: "Anschaffung",
  other: "Sonstiges",
};
