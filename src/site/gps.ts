import { z } from "zod";
import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import { addSiteElement, site, type SiteKind } from "./model";

export const gpsFixSchema = z.strictObject({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().nonnegative(),
  timestamp: z.number().finite().nonnegative(),
});
export const gpsReferenceSchema = z.strictObject({
  fix: gpsFixSchema,
  position: z.strictObject({ x: z.number().finite(), y: z.number().finite() }),
  northAngle: z.number().finite().min(0).lt(360),
  label: z.string().min(1).max(200),
});
export const gpsSurveySchema = z.strictObject({
  reference: gpsReferenceSchema,
  fixes: z.array(gpsFixSchema).min(1).max(500),
});
export type GpsFix = z.infer<typeof gpsFixSchema>;
export type GpsReference = z.infer<typeof gpsReferenceSchema>;
export function gpsReference(p: Project, floorId: string): GpsReference | null {
  const value = p.floors[floorId]?.metadata.gpsReference;
  return value === undefined ? null : gpsReferenceSchema.parse(value);
}
export function freshFix(fix: GpsFix | null, now = Date.now()) {
  return Boolean(fix && now - fix.timestamp >= -1000 && now - fix.timestamp <= 15000);
}
/** Local equirectangular projection for garden-scale distances, millimetres, north clockwise from plan up. */
export function gpsToPlan(reference: GpsReference, fix: GpsFix): Vec2 {
  const rad = Math.PI / 180;
  const longitude = ((fix.longitude - reference.fix.longitude + 540) % 360) - 180;
  const east = 6378137 * longitude * rad * Math.cos(((fix.latitude + reference.fix.latitude) * rad) / 2);
  const north = 6378137 * (fix.latitude - reference.fix.latitude) * rad;
  if (Math.hypot(east, north) > 10000)
    throw new Error("Standort liegt über 10 km von der GPS-Referenz entfernt. Bitte Referenz prüfen.");
  const a = reference.northAngle * rad;
  return {
    x: reference.position.x + (east * Math.cos(a) + north * Math.sin(a)) * 1000,
    y: reference.position.y + (-east * Math.sin(a) + north * Math.cos(a)) * 1000,
  };
}
export function saveGpsSurvey(
  p: Project,
  floorId: string,
  kind: SiteKind,
  width: number,
  reference: GpsReference,
  fixes: GpsFix[],
) {
  const data = gpsSurveySchema.parse({ reference, fixes });
  const id = addSiteElement(
    p,
    floorId,
    kind,
    data.fixes.map((f) => gpsToPlan(data.reference, f)),
    width,
  );
  site(p).elements[id]!.metadata.gpsSurvey = data;
  return id;
}
