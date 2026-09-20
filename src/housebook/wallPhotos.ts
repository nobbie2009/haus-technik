import { z } from "zod";
import type { Project } from "../models/project";
import { imageData } from "./model";

export const traceTypes = {
  electrical: { label: "Elektrik", color: "#b45319" },
  cold: { label: "Kaltwasser", color: "#176fba" },
  hot: { label: "Warmwasser", color: "#b84232" },
  flow: { label: "Heizung Vorlauf", color: "#a34d18" },
  return: { label: "Heizung Rücklauf", color: "#70519a" },
  gas: { label: "Gas", color: "#856600" },
  network: { label: "Netzwerk", color: "#6351aa" },
  other: { label: "Sonstiges", color: "#334b50" },
} as const;
export type TraceType = keyof typeof traceTypes;
const point = z.strictObject({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) });
const calibration = z
  .strictObject({ points: z.tuple([point, point]), distanceMm: z.number().finite().positive().max(1e6) })
  .refine(
    (v) => Math.hypot(v.points[0].x - v.points[1].x, v.points[0].y - v.points[1].y) > 0.000001,
    "Zwei verschiedene Messpunkte wählen.",
  );
export const wallPhotoSchema = z
  .strictObject({
    id: z.uuid(),
    name: z.string().trim().min(1).max(150),
    side: z.string().max(200),
    notes: z.string().max(10000),
    data: imageData,
    pixelWidth: z.number().int().positive().max(2400),
    pixelHeight: z.number().int().positive().max(2400),
    calibration: calibration.nullable(),
    traces: z
      .array(
        z.strictObject({
          id: z.uuid(),
          name: z.string().trim().min(1).max(150),
          type: z.enum(Object.keys(traceTypes) as [TraceType, ...TraceType[]]),
          points: z
            .array(point)
            .min(2)
            .max(1000)
            .refine(
              (ps) => ps.some((p) => Math.hypot(p.x - ps[0]!.x, p.y - ps[0]!.y) > 0.000001),
              "Verlauf benötigt verschiedene Punkte.",
            ),
          notes: z.string().max(2000),
        }),
      )
      .max(200),
  })
  .refine((p) => new Set(p.traces.map((t) => t.id)).size === p.traces.length, "Doppelte Verlaufs-ID.");
export const wallPhotosSchema = z
  .array(wallPhotoSchema)
  .max(20)
  .refine((ps) => new Set(ps.map((p) => p.id)).size === ps.length, "Doppelte Foto-ID.");
export type WallPhoto = z.infer<typeof wallPhotoSchema>;
export type PhotoPoint = z.infer<typeof point>;
export type PhotoTrace = WallPhoto["traces"][number];
export function wallPhotos(project: Project, wallId: string): WallPhoto[] {
  return wallPhotosSchema.parse(project.walls[wallId]?.metadata.wallPhotos ?? []);
}
export function setWallPhotos(project: Project, wallId: string, photos: WallPhoto[]): void {
  if (!project.walls[wallId]) throw new Error("Wand fehlt.");
  project.walls[wallId]!.metadata.wallPhotos = wallPhotosSchema.parse(photos);
}
export function editWallPhoto(
  project: Project,
  wallId: string,
  photoId: string,
  change: (photo: WallPhoto) => void,
): void {
  const photos = wallPhotos(project, wallId),
    photo = photos.find((p) => p.id === photoId);
  if (!photo) throw new Error("Wandfoto fehlt.");
  change(photo);
  setWallPhotos(project, wallId, photos);
}
export function photoDistance(photo: WallPhoto, a: PhotoPoint, b: PhotoPoint): number {
  return Math.hypot((a.x - b.x) * photo.pixelWidth, (a.y - b.y) * photo.pixelHeight);
}
export function photoTraceLength(photo: WallPhoto, trace: PhotoTrace): number | null {
  if (!photo.calibration) return null;
  const { points, distanceMm } = photo.calibration;
  const pixels = trace.points
    .slice(1)
    .reduce((sum, p, i) => sum + photoDistance(photo, trace.points[i]!, p), 0);
  return (pixels * distanceMm) / photoDistance(photo, points[0], points[1]);
}

const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export function wallPhotoSvg(photo: WallPhoto): string {
  const width = photo.pixelWidth,
    height = photo.pixelHeight,
    size = Math.max(12, width / 65),
    stroke = Math.max(2, width / 400);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + size * 3}" width="${width}" height="${height + size * 3}"><title>${xml(photo.name)}</title><rect width="100%" height="100%" fill="white"/><image href="${photo.data}" width="${width}" height="${height}"/>${photo.traces
    .map((t) => {
      const p = t.points[0]!,
        color = traceTypes[t.type].color;
      return `<polyline points="${t.points.map((p) => `${p.x * width},${p.y * height}`).join(" ")}" fill="none" stroke="white" stroke-width="${stroke + 2}"/><polyline points="${t.points.map((p) => `${p.x * width},${p.y * height}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${stroke}"/><text x="${Math.max(2, Math.min(width - size * 10, p.x * width + size / 2))}" y="${Math.max(size, p.y * height - size / 2)}" font-family="sans-serif" font-size="${size}" stroke="white" stroke-width="3" paint-order="stroke" fill="${color}">${xml(t.name)} · ${xml(traceTypes[t.type].label)}</text>`;
    })
    .join(
      "",
    )}<text x="8" y="${height + size * 1.5}" font-family="sans-serif" font-size="${size}" fill="#334b50">${xml(photo.name)} · ${xml(photo.side)} · Fotoannotation, keine Vermessung</text></svg>`;
}
