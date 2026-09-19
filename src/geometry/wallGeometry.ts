import type { Vec2 } from "../models/common";
import { distance } from "./distance";
import { LENGTH_EPSILON, requirePositive } from "./tolerances";
import { add, multiply, subtract } from "./vector";

function direction(start: Vec2, end: Vec2): Vec2 {
  const length = distance(start, end);
  if (length <= LENGTH_EPSILON) throw new RangeError("Eine Wand benötigt unterschiedliche Endpunkte.");
  return multiply(subtract(end, start), 1 / length);
}

/** Wandkörper mit geraden Endkappen; Eckverbindungen werden separat abgeleitet. */
export function wallFootprint(start: Vec2, end: Vec2, thickness: number): [Vec2, Vec2, Vec2, Vec2] {
  requirePositive(thickness, "Wandstärke");
  const unit = direction(start, end);
  const offset = { x: (-unit.y * thickness) / 2, y: (unit.x * thickness) / 2 };
  return [add(start, offset), add(end, offset), subtract(end, offset), subtract(start, offset)];
}

/** Reine Geometrie; verändert keine Punkte oder angeschlossenen Wände. */
export function resizeWallEndpoints(
  start: Vec2,
  end: Vec2,
  length: number,
  fixed: "start" | "end" = "start",
): { start: Vec2; end: Vec2 } {
  requirePositive(length, "Wandlänge");
  if (length <= LENGTH_EPSILON) throw new RangeError("Wandlänge liegt unter der Rechentoleranz.");
  const delta = multiply(direction(start, end), length);
  return fixed === "start"
    ? { start: { ...start }, end: add(start, delta) }
    : { start: subtract(end, delta), end: { ...end } };
}
