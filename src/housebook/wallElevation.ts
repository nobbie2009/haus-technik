import type { Project } from "../models/project";
import { electricalNodes } from "../electrical/cables";
import { asset, setAsset } from "./model";
export function wallObjects(p: Project, wallId: string) {
  const wall = p.walls[wallId];
  return Object.values({ ...p.furniture, ...electricalNodes(p) }).filter((i) => i.floorId === wall?.floorId);
}
export function mountOnWall(
  p: Project,
  wallId: string,
  itemId: string,
  distance: number,
  height: number,
  side: 1 | -1,
) {
  const wall = p.walls[wallId],
    item = wallObjects(p, wallId).find((i) => i.id === itemId);
  if (!wall || !item) throw new Error("Wand oder Objekt fehlt.");
  if (p.layers[wall.layerId]?.locked || p.layers[item.layerId]?.locked)
    throw new Error("Wand oder Objektebene ist gesperrt.");
  const a = p.points[wall.startPointId]!.position,
    b = p.points[wall.endPointId]!.position,
    length = Math.hypot(b.x - a.x, b.y - a.y);
  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(height) ||
    distance < 0 ||
    distance > length ||
    height < 0 ||
    height > wall.height
  )
    throw new Error("Montagepunkt muss innerhalb der Wandansicht liegen.");
  setAsset(item, {
    ...asset(item),
    mounting: { wallId, distance, height, offset: (side * wall.thickness) / 2 },
  });
}
