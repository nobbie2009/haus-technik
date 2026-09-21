import { z } from "zod";
import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import { newId } from "../utils/uuid";
import { distance } from "../geometry/distance";
import { polygonArea, polygonProblem } from "../geometry/polygon";

export const siteKinds = {
  boundary: "Grundstücksgrenze",
  path: "Weg",
  terrace: "Terrasse",
  bed: "Beet / Grünfläche",
  reference: "Referenzpunkt",
} as const;
export type SiteKind = keyof typeof siteKinds;
const number = z.number().finite(),
  id = z.uuid();
export const siteElementSchema = z.strictObject({
  id,
  floorId: id,
  layerId: id,
  metadata: z.record(z.string(), z.json()),
  name: z.string().trim().min(1).max(150),
  kind: z.enum(["boundary", "path", "terrace", "bed", "reference"]),
  vertices: z
    .array(z.strictObject({ x: number, y: number }))
    .min(1)
    .max(500),
  width: number.positive().max(100000),
});
export const siteSchema = z.strictObject({
  version: z.literal(1),
  elements: z.record(id, siteElementSchema),
});
export type SiteElement = z.infer<typeof siteElementSchema>;
export type Site = z.infer<typeof siteSchema>;
export function site(project: Project): Site {
  return (project.metadata.site as Site | undefined) ?? { version: 1, elements: {} };
}
export function ensureSiteLayer(project: Project): string {
  const existing = Object.values(project.layers).find((l) => l.kind === "site");
  if (existing) return existing.id;
  const id = newId();
  project.layers[id] = {
    id,
    name: "Grundstück",
    kind: "site",
    visible: true,
    locked: false,
    opacity: 1,
    metadata: {},
  };
  project.layerOrder.push(id);
  return id;
}
export const siteClosed = (kind: SiteKind) => ["boundary", "terrace", "bed"].includes(kind);
export function siteSegments(item: SiteElement): [Vec2, Vec2][] {
  return item.vertices.flatMap((p, i) => {
    const next = item.vertices[i + 1] ?? (siteClosed(item.kind) ? item.vertices[0] : undefined);
    return next ? [[p, next] as [Vec2, Vec2]] : [];
  });
}
export const siteLength = (item: SiteElement) =>
  siteSegments(item).reduce((sum, [a, b]) => sum + distance(a, b), 0);
export const siteArea = (item: SiteElement) => (siteClosed(item.kind) ? polygonArea(item.vertices) : null);
export function siteProblem(item: SiteElement): string | null {
  if (item.kind === "reference")
    return item.vertices.length === 1 ? null : "Ein Referenzpunkt benötigt genau eine Position.";
  if (siteClosed(item.kind)) return polygonProblem(item.vertices)?.replaceAll("Raum", "Bereich") ?? null;
  if (item.vertices.length < 2) return "Ein Weg benötigt mindestens zwei Punkte.";
  return siteSegments(item).some(([a, b]) => distance(a, b) < 1)
    ? "Wegpunkte müssen mindestens 1 mm auseinanderliegen."
    : null;
}
export function addSiteElement(
  project: Project,
  floorId: string,
  kind: SiteKind,
  vertices: Vec2[],
  width = 1000,
): string {
  if (!project.floors[floorId]) throw new Error("Geschoss fehlt.");
  const layerId = ensureSiteLayer(project),
    layer = project.layers[layerId]!;
  if (!layer.visible || layer.locked)
    throw new Error("Bitte die Grundstücksebene einblenden und entsperren.");
  const id = newId();
  let number = 1;
  while (Object.values(site(project).elements).some((e) => e.name === `${siteKinds[kind]} ${number}`))
    number++;
  const item = siteElementSchema.parse({
    id,
    layerId,
    floorId,
    kind,
    vertices,
    width,
    name: `${siteKinds[kind]} ${number}`,
    metadata: {},
  });
  const problem = siteProblem(item);
  if (problem) throw new Error(problem);
  project.metadata.site ??= { version: 1, elements: {} };
  site(project).elements[id] = item;
  return id;
}
export function siteSnapPoints(project: Project, floorId: string, excluded = new Set<string>()) {
  return Object.values(site(project).elements)
    .filter((e) => e.floorId === floorId && project.layers[e.layerId]?.visible && !excluded.has(e.id))
    .flatMap((e) => e.vertices.map((position, i) => ({ id: `${e.id}:${i}`, position })));
}
