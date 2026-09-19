import type { Vec2 } from "../models/common";
import { requirePositive } from "./tolerances";
import { requirePoint } from "./vector";

export interface ScreenPoint {
  x: number;
  y: number;
}
export interface Viewport {
  /** CSS-Pixel pro Millimeter; unabhängig vom Device-Pixel-Ratio. */
  scale: number;
  originPx: ScreenPoint;
}

function check(viewport: Viewport): void {
  requirePositive(viewport.scale, "Zoom");
  requirePoint(viewport.originPx);
}

export function worldToScreen(point: Vec2, viewport: Viewport): ScreenPoint {
  check(viewport);
  requirePoint(point);
  return {
    x: viewport.originPx.x + point.x * viewport.scale,
    y: viewport.originPx.y - point.y * viewport.scale,
  };
}

export function screenToWorld(point: ScreenPoint, viewport: Viewport): Vec2 {
  check(viewport);
  requirePoint(point);
  return {
    x: (point.x - viewport.originPx.x) / viewport.scale,
    y: -(point.y - viewport.originPx.y) / viewport.scale,
  };
}

export function zoomAt(viewport: Viewport, cursor: ScreenPoint, scale: number): Viewport {
  requirePositive(scale, "Zoom");
  const anchor = screenToWorld(cursor, viewport);
  return { scale, originPx: { x: cursor.x - anchor.x * scale, y: cursor.y + anchor.y * scale } };
}

export function panBy(viewport: Viewport, delta: ScreenPoint): Viewport {
  check(viewport);
  requirePoint(delta);
  return {
    scale: viewport.scale,
    originPx: { x: viewport.originPx.x + delta.x, y: viewport.originPx.y + delta.y },
  };
}
