import { z } from "zod";
import type { Project } from "../models/project";
import { createRoom } from "../editor/actions/create";
export const setupSteps = [
  "Haus & Räume",
  "Grundriss",
  "Technik",
  "Raum für Raum",
  "Zentrale Stellen",
  "Abschluss",
] as const;
export const setupTopics = {
  electrical: "Elektrik",
  water: "Wasser",
  heating: "Heizung",
  gas: "Gas",
  network: "Internet & WLAN",
  solar: "Balkonkraftwerk",
  garden: "Garten / Außenbereich",
} as const;
export const setupSchema = z
  .strictObject({
    version: z.literal(1),
    step: z.number().int().min(0).max(5),
    topics: z
      .array(z.enum(Object.keys(setupTopics) as [keyof typeof setupTopics, ...(keyof typeof setupTopics)[]]))
      .max(7),
    done: z.array(z.number().int().min(0).max(5)).max(6),
    skipped: z.array(z.number().int().min(0).max(5)).max(6),
    roomId: z.uuid().nullable(),
    reviewedRooms: z.array(z.uuid()).max(2000),
    finished: z.boolean(),
  })
  .superRefine((v, c) => {
    for (const values of [v.topics, v.done, v.skipped, v.reviewedRooms])
      if (new Set<string | number>(values).size !== values.length)
        c.addIssue({ code: "custom", message: "Doppelte Einträge im Einrichtungsfortschritt." });
    if (v.done.some((s) => v.skipped.includes(s)))
      c.addIssue({
        code: "custom",
        message: "Ein Schritt kann nicht zugleich erledigt und übersprungen sein.",
      });
  });
export type Setup = z.infer<typeof setupSchema>;
export function setup(p: Project): Setup {
  return setupSchema.parse(
    p.metadata.setupGuide ?? {
      version: 1,
      step: 0,
      topics: [],
      done: [],
      skipped: [],
      roomId: null,
      reviewedRooms: [],
      finished: false,
    },
  );
}
export function setSetup(p: Project, s: Setup) {
  p.metadata.setupGuide = setupSchema.parse(s);
}
export function moveSetup(p: Project, step: number, status?: "done" | "skipped") {
  const s = setup(p);
  if (status) {
    s.done = s.done.filter((n) => n !== s.step);
    s.skipped = s.skipped.filter((n) => n !== s.step);
    s[status].push(s.step);
  }
  s.step = step;
  s.finished = false;
  setSetup(p, s);
}
export function addSetupRoom(
  p: Project,
  floorId: string,
  name: string,
  width: number,
  depth: number,
  x: number,
  y: number,
): string {
  const clean = z.string().trim().min(1).max(150).parse(name);
  if (!p.floors[floorId]) throw new Error("Geschoss fehlt.");
  const existing = Object.values(p.rooms).find(
    (r) => r.floorId === floorId && r.name.trim().toLocaleLowerCase("de") === clean.toLocaleLowerCase("de"),
  );
  if (existing) return existing.id;
  z.number().finite().positive().parse(width);
  z.number().finite().positive().parse(depth);
  z.number().finite().parse(x);
  z.number().finite().parse(y);
  return createRoom(
    p,
    floorId,
    [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth },
    ],
    clean,
  );
}
export type GuideSection =
  | "setup"
  | "search"
  | "solar"
  | "background"
  | "network"
  | "shutoff"
  | "smoke"
  | "usage"
  | "maintenance"
  | "garden"
  | "assets";
export type OpenSection = (section: GuideSection, id?: string) => void;
