import type { Vec2 } from "../models/common";
import { add, dot, magnitude, multiply, requirePoint, subtract } from "./vector";
import { LENGTH_EPSILON } from "./tolerances";

export function distance(a: Vec2, b: Vec2): number {
  requirePoint(a);
  requirePoint(b);
  return magnitude(subtract(b, a));
}

export function projectToSegment(
  point: Vec2,
  start: Vec2,
  end: Vec2,
): {
  position: Vec2;
  fraction: number;
  distance: number;
} {
  requirePoint(point);
  requirePoint(start);
  requirePoint(end);
  const direction = subtract(end, start);
  const lengthSquared = dot(direction, direction);
  const fraction =
    lengthSquared <= LENGTH_EPSILON ** 2
      ? 0
      : Math.max(0, Math.min(1, dot(subtract(point, start), direction) / lengthSquared));
  const position = add(start, multiply(direction, fraction));
  return { position, fraction, distance: distance(point, position) };
}
