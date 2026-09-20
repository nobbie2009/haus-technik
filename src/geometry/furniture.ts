import type { Furniture } from "../models/furniture";
import type { Vec2 } from "../models/common";

export function furnitureCorners(item: Pick<Furniture, "position" | "rotation" | "width" | "depth">): Vec2[] {
  const c = Math.cos(item.rotation),
    s = Math.sin(item.rotation);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => {
    const a = (x! * item.width) / 2,
      b = (y! * item.depth) / 2;
    return { x: item.position.x + a * c - b * s, y: item.position.y + a * s + b * c };
  });
}
export function containsFurniture(
  item: Pick<Furniture, "position" | "rotation" | "width" | "depth">,
  point: Vec2,
): boolean {
  const x = point.x - item.position.x,
    y = point.y - item.position.y;
  const c = Math.cos(item.rotation),
    s = Math.sin(item.rotation);
  return Math.abs(x * c + y * s) <= item.width / 2 && Math.abs(-x * s + y * c) <= item.depth / 2;
}
