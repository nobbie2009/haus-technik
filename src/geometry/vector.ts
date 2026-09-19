import type { Vec2 } from "../models/common";
import { requireFinite } from "./tolerances";

export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const multiply = (a: Vec2, factor: number): Vec2 => ({ x: a.x * factor, y: a.y * factor });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const magnitude = (a: Vec2): number => Math.hypot(a.x, a.y);

export function requirePoint(point: Vec2): void {
  requireFinite(point.x, "X");
  requireFinite(point.y, "Y");
}
