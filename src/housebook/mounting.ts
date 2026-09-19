import type { Project } from "../models/project";
import { electricalNodes } from "../electrical/cables";
import { asset, setAsset } from "./model";
export function syncMountings(before: Project, draft: Project) {
  const previous = { ...before.furniture, ...electricalNodes(before) };
  for (const item of Object.values({ ...draft.furniture, ...electricalNodes(draft) })) {
    if (!item.metadata.asset) continue;
    const record = asset(item),
      mounting = record.mounting;
    if (!mounting) continue;
    const wall = draft.walls[mounting.wallId];
    if (!wall) {
      record.mounting = null;
      setAsset(item, record);
      continue;
    }
    const a = draft.points[wall.startPointId]!.position,
      b = draft.points[wall.endPointId]!.position;
    const length = Math.hypot(b.x - a.x, b.y - a.y),
      dx = (b.x - a.x) / length,
      dy = (b.y - a.y) / length;
    const old = previous[item.id];
    if (
      old &&
      (old.position.x !== item.position.x || old.position.y !== item.position.y) &&
      JSON.stringify(old.metadata.asset) === JSON.stringify(item.metadata.asset)
    ) {
      mounting.distance = (item.position.x - a.x) * dx + (item.position.y - a.y) * dy;
      mounting.offset = -(item.position.x - a.x) * dy + (item.position.y - a.y) * dx;
    }
    if (mounting.distance < 0 || mounting.distance > length)
      throw new Error(
        "Die Wandbefestigung liegt außerhalb der Wand. Abstand anpassen oder Befestigung lösen.",
      );
    item.position = {
      x: a.x + dx * mounting.distance - dy * mounting.offset,
      y: a.y + dy * mounting.distance + dx * mounting.offset,
    };
    if ("wallId" in item) item.wallId = wall.id;
    setAsset(item, record);
  }
}
