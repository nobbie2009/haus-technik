import type { Vec2 } from "../models/common";
import { projectToSegment } from "./distance";
import { cross, subtract } from "./vector";
import { LENGTH_EPSILON } from "./tolerances";

/** Einschließlich Berührung und kollinearer Überlappung. */
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  if (
    [
      projectToSegment(a, c, d),
      projectToSegment(b, c, d),
      projectToSegment(c, a, b),
      projectToSegment(d, a, b),
    ].some((projection) => projection.distance <= LENGTH_EPSILON)
  )
    return true;

  const ab = subtract(b, a);
  const cd = subtract(d, c);
  return (
    Math.sign(cross(ab, subtract(c, a))) !== Math.sign(cross(ab, subtract(d, a))) &&
    Math.sign(cross(cd, subtract(a, c))) !== Math.sign(cross(cd, subtract(b, c)))
  );
}
