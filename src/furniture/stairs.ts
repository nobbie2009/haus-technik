import type { Furniture } from "../models/furniture";
import type { Project } from "../models/project";
import { floorReference } from "../models/floor";

export function isStair(item: Furniture) {
  return item.type === "straightStairs" || item.type === "curvedStairs";
}
export function stairDirection(item: Furniture): "up" | "down" | "none" {
  const direction = item.metadata.stairDirection;
  return direction === "down" || direction === "none" ? direction : "up";
}
export function stairTarget(project: Project, item: Furniture) {
  if (!isStair(item) || stairDirection(item) === "none") return undefined;
  const source = project.floors[item.floorId];
  if (!source) return undefined;
  const sign = stairDirection(item) === "up" ? 1 : -1;
  return Object.values(project.floors)
    .filter((floor) => (floor.elevation - source.elevation) * sign > 0)
    .sort(
      (a, b) =>
        Math.abs(a.elevation - source.elevation) - Math.abs(b.elevation - source.elevation) ||
        a.id.localeCompare(b.id),
    )[0];
}
/** Additional floor views reference the original stair; they are never stored as copies. */
export function furnitureOnFloor(project: Project, floorId: string): Furniture[] {
  return Object.values(project.furniture).flatMap((item) => {
    if (item.floorId === floorId) return [item];
    if (stairTarget(project, item)?.id !== floorId) return [];
    const source = floorReference(project.floors[item.floorId]!);
    const target = floorReference(project.floors[floorId]!);
    return [
      {
        ...item,
        position: { x: item.position.x + source.x - target.x, y: item.position.y + source.y - target.y },
      },
    ];
  });
}
export function stairLabel(project: Project, item: Furniture, floorId: string) {
  if (!isStair(item) || stairDirection(item) === "none") return item.name;
  const projected = item.floorId !== floorId;
  const up = (stairDirection(item) === "up") !== projected;
  const target = projected ? project.floors[item.floorId] : stairTarget(project, item);
  return `${item.name} · ${up ? "aufwärts" : "abwärts"}${target ? ` → ${target.name}` : " (Etage fehlt)"}`;
}
