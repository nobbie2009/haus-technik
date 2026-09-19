import type { UUID, Vec2 } from "../models/common";
import { distance, projectToSegment } from "./distance";
import { LENGTH_EPSILON, requireFinite, requirePositive } from "./tolerances";
import { requirePoint } from "./vector";

export interface SnapPoint {
  id: UUID;
  position: Vec2;
}
export interface SnapWall {
  id: UUID;
  start: Vec2;
  end: Vec2;
}
export interface SnapOptions {
  scale: number;
  radiusPx: number;
  gridSize: number;
  grid: boolean;
  points: boolean;
  walls: boolean;
}
export interface SnapResult {
  position: Vec2;
  distancePx: number;
  target:
    { kind: "point"; pointId: UUID } | { kind: "wall"; wallId: UUID; position: number } | { kind: "grid" };
}

/** Kandidaten müssen vom Aufrufer bereits nach Geschoss/Sichtbarkeit gefiltert sein. */
export function snap(
  point: Vec2,
  points: readonly SnapPoint[],
  walls: readonly SnapWall[],
  options: SnapOptions,
  previous: SnapResult | null = null,
): SnapResult | null {
  requirePoint(point);
  requirePositive(options.scale, "Zoom");
  requirePositive(options.gridSize, "Rastergröße");
  requireFinite(options.radiusPx, "Fangradius");
  if (options.radiusPx < 0) throw new RangeError("Fangradius darf nicht negativ sein.");

  const candidates: Array<{ priority: number; key: string; result: SnapResult }> = [];
  const offer = (position: Vec2, target: SnapResult["target"], priority: number, key: string): void => {
    const distancePx = distance(point, position) * options.scale;
    if (distancePx <= options.radiusPx)
      candidates.push({ priority, key, result: { position, target, distancePx } });
  };
  if (options.points)
    for (const candidate of points) {
      offer({ ...candidate.position }, { kind: "point", pointId: candidate.id }, 0, candidate.id);
    }
  if (options.walls)
    for (const wall of walls) {
      const length = distance(wall.start, wall.end);
      if (length <= LENGTH_EPSILON) continue;
      const projected = projectToSegment(point, wall.start, wall.end);
      offer(
        projected.position,
        { kind: "wall", wallId: wall.id, position: projected.fraction * length },
        1,
        wall.id,
      );
    }
  if (options.grid) {
    // Symmetrisches Runden auch bei negativen Halbwerten.
    const round = (n: number): number =>
      Math.sign(n) * Math.floor(Math.abs(n) / options.gridSize + 0.5) * options.gridSize || 0;
    offer({ x: round(point.x), y: round(point.y) }, { kind: "grid" }, 2, "grid");
  }
  candidates.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.result.distancePx - b.result.distancePx ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const nearest = candidates[0]?.result ?? null;
  // Halteschwelle: ein gefangenes Ziel bleibt bis 1,5 × Radius stabil.
  // Ein höher priorisierter Punkttreffer darf einen Wandtreffer sofort ablösen.
  let retained: SnapResult | null = null;
  if (previous?.target.kind === "point" && options.points) {
    const id = previous.target.pointId;
    const candidate = points.find((p) => p.id === id);
    if (candidate)
      retained = {
        position: { ...candidate.position },
        target: previous.target,
        distancePx: distance(point, candidate.position) * options.scale,
      };
  } else if (previous?.target.kind === "wall" && options.walls && nearest?.target.kind !== "point") {
    const id = previous.target.wallId;
    const wall = walls.find((w) => w.id === id);
    if (wall && distance(wall.start, wall.end) > LENGTH_EPSILON) {
      const projected = projectToSegment(point, wall.start, wall.end);
      retained = {
        position: projected.position,
        distancePx: projected.distance * options.scale,
        target: { kind: "wall", wallId: id, position: projected.fraction * distance(wall.start, wall.end) },
      };
    }
  }
  return retained && retained.distancePx <= options.radiusPx * 1.5 ? retained : nearest;
}
