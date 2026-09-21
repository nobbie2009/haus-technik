import type { Project } from "../models/project";
import { elementTables } from "../core/elementTables";
import { asset } from "./model";
export function renovationView(project: Project, mode: "existing" | "future" | "all") {
  const copy = structuredClone(project);
  if (mode === "all") return copy;
  for (const table of Object.values(elementTables(copy)))
    for (const item of Object.values(table)) {
      const status = asset(item).status;
      if ((mode === "existing" && status === "planned") || (mode === "future" && status === "remove")) {
        const layer = copy.layers[item.layerId];
        if (layer) {
          const id = `comparison-${item.layerId}`;
          copy.layers[id] = { ...layer, id, visible: false };
          item.layerId = id;
        }
      }
    }
  for (const item of [...Object.values(copy.doors), ...Object.values(copy.windows)]) {
    const wall = copy.walls[item.wallId];
    if (wall && !copy.layers[wall.layerId]?.visible) item.layerId = wall.layerId;
  }
  return copy;
}
export function projectChanges(before: Project, after: Project) {
  const a = elementTables(before),
    b = elementTables(after);
  const changes: { name: string; change: string }[] = [];
  for (const kind of Object.keys(a) as (keyof typeof a)[]) {
    const ids = new Set([...Object.keys(a[kind]), ...Object.keys(b[kind])]);
    for (const id of ids) {
      const old = a[kind][id],
        next = b[kind][id],
        item = next ?? old;
      if (JSON.stringify(old) !== JSON.stringify(next))
        changes.push({
          name: item && "name" in item ? String(item.name) : `${kind} · ${id}`,
          change: !old ? "Hinzugefügt" : !next ? "Entfernt" : "Geändert",
        });
    }
  }
  for (const key of ["name", "points", "floors", "layers", "metadata", "electrical"] as const)
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      changes.push({
        name: {
          name: "Projektname",
          points: "Geometriepunkte",
          floors: "Geschosse",
          layers: "Ebenen",
          metadata: "Hausakte und Zusatzdaten",
          electrical: "Elektrische Daten und Zuordnungen",
        }[key],
        change: "Geändert",
      });
  return changes;
}
