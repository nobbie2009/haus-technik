import type { Vec2 } from "../models/common";
import { distance, projectToSegment } from "./distance";
import { segmentsIntersect } from "./intersections";
import { ANGLE_EPSILON, LENGTH_EPSILON } from "./tolerances";
import { cross, dot, magnitude, requirePoint, subtract } from "./vector";

export function polygonSignedArea(points: readonly Vec2[]): number {
  points.forEach(requirePoint);
  if (points.length < 3) return 0;
  // Triangulation relativ zum ersten Punkt reduziert Auslöschung bei großen Offsets.
  const origin = points[0]!;
  let twiceArea = 0;
  for (let i = 1; i < points.length - 1; i++) {
    twiceArea += cross(subtract(points[i]!, origin), subtract(points[i + 1]!, origin));
  }
  return twiceArea / 2;
}

export const polygonArea = (points: readonly Vec2[]): number => Math.abs(polygonSignedArea(points));

export function polygonPerimeter(points: readonly Vec2[]): number {
  if (points.length < 2) return 0;
  return points.reduce((sum, point, i) => sum + distance(point, points[(i + 1) % points.length]!), 0);
}

/** Null bedeutet gültiger einfacher Ring. Kollineare Teilpunkte sind erlaubt. */
export function polygonProblem(points: readonly Vec2[]): string | null {
  if (points.length < 3) return "Ein Raum benötigt mindestens drei Punkte.";
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return "Ungültige Koordinaten.";
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    if (distance(a, b) <= LENGTH_EPSILON) return "Eine Polygonkante hat keine Länge.";
    const c = points[(i + 2) % n]!;
    // Rückwärts laufende Nachbarkanten überlappen; normale gerade Teilpunkte nicht.
    if (
      dot(subtract(a, b), subtract(c, b)) > 0 &&
      (projectToSegment(c, a, b).distance <= LENGTH_EPSILON ||
        projectToSegment(a, b, c).distance <= LENGTH_EPSILON)
    ) {
      return "Benachbarte Polygonkanten überlappen.";
    }
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(a, b, points[j]!, points[(j + 1) % n]!)) {
        return "Das Polygon berührt oder überschneidet sich selbst.";
      }
    }
  }
  return polygonArea(points) <= LENGTH_EPSILON ** 2 ? "Der Raum hat keine Fläche." : null;
}

export function rectangleDimensions(points: readonly Vec2[]): { length: number; width: number } | null {
  if (polygonProblem(points)) return null;
  // Nach Wandteilungen können kollineare Punkte auf einer Rechteckseite liegen.
  const corners = points.filter((point, i) => {
    const incoming = subtract(point, points[(i - 1 + points.length) % points.length]!);
    const outgoing = subtract(points[(i + 1) % points.length]!, point);
    return Math.abs(cross(incoming, outgoing)) > ANGLE_EPSILON * magnitude(incoming) * magnitude(outgoing);
  });
  if (corners.length !== 4) return null;
  const edges = corners.map((p, i) => subtract(corners[(i + 1) % 4]!, p));
  if (
    edges.some(
      (edge, i) =>
        Math.abs(dot(edge, edges[(i + 1) % 4]!)) >
        ANGLE_EPSILON * magnitude(edge) * magnitude(edges[(i + 1) % 4]!),
    )
  )
    return null;
  const a = magnitude(edges[0]!);
  const b = magnitude(edges[1]!);
  return { length: Math.max(a, b), width: Math.min(a, b) };
}
