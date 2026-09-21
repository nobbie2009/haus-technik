import type { Furniture } from "../models/furniture";
import type { Vec2 } from "../models/common";
import type { Project } from "../models/project";

export const resizeHandles = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
] as const;

export function furnitureHandle(item: Furniture, handle: number): Vec2 {
  const h = resizeHandles[handle]!;
  const x = (h.x * item.width) / 2,
    y = (h.y * item.depth) / 2;
  const c = Math.cos(item.rotation),
    s = Math.sin(item.rotation);
  return { x: item.position.x + x * c - y * s, y: item.position.y + x * s + y * c };
}

/** Die gegenüberliegende Kante bleibt fest, auch bei gedrehten Möbeln. */
export function resizeFurniture(project: Project, id: string, handle: number, delta: Vec2, grid = 0): void {
  const item = project.furniture[id];
  if (!item || !project.layers[item.layerId]?.visible || project.layers[item.layerId]?.locked) return;
  const h = resizeHandles[handle];
  if (!h) return;
  const c = Math.cos(item.rotation),
    s = Math.sin(item.rotation);
  const round = (v: number) => Math.max(1, grid > 0 ? Math.round(v / grid) * grid : v);
  const width = h.x ? round(item.width + h.x * (delta.x * c + delta.y * s)) : item.width;
  const depth = h.y ? round(item.depth + h.y * (-delta.x * s + delta.y * c)) : item.depth;
  const x = (h.x * (width - item.width)) / 2,
    y = (h.y * (depth - item.depth)) / 2;
  item.position = { x: item.position.x + x * c - y * s, y: item.position.y + x * s + y * c };
  item.width = width;
  item.depth = depth;
}
