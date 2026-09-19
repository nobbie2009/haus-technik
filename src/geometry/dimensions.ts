import type { Project } from "../models/project";
import type { Dimension } from "../models/dimension";
import type { Vec2 } from "../models/common";
import { add, multiply, subtract } from "./vector";
import { distance } from "./distance";

export function dimensionGeometry(
  project: Project,
  dimension: Dimension,
): { start: Vec2; end: Vec2; a: Vec2; b: Vec2; length: number } {
  const start =
    dimension.start.kind === "point"
      ? project.points[dimension.start.pointId]!.position
      : dimension.start.position;
  const end =
    dimension.end.kind === "point" ? project.points[dimension.end.pointId]!.position : dimension.end.position;
  if (dimension.mode === "horizontal")
    return {
      start,
      end,
      a: { x: start.x, y: start.y + dimension.offset },
      b: { x: end.x, y: start.y + dimension.offset },
      length: Math.abs(end.x - start.x),
    };
  if (dimension.mode === "vertical")
    return {
      start,
      end,
      a: { x: start.x + dimension.offset, y: start.y },
      b: { x: start.x + dimension.offset, y: end.y },
      length: Math.abs(end.y - start.y),
    };
  const length = distance(start, end);
  const unit = length ? multiply(subtract(end, start), 1 / length) : { x: 1, y: 0 };
  const offset = { x: -unit.y * dimension.offset, y: unit.x * dimension.offset };
  return { start, end, a: add(start, offset), b: add(end, offset), length };
}

export function pointInPolygon(point: Vec2, vertices: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i]!;
    const b = vertices[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
