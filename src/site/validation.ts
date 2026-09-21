import type { Project } from "../models/project";
import { siteSchema, siteProblem } from "./model";
import { utilities } from "../utilities/model";
import { housebook } from "../housebook/model";
export function siteIssues(project: Project) {
  if (project.metadata.site === undefined) return [];
  const parsed = siteSchema.safeParse(project.metadata.site);
  if (!parsed.success)
    return parsed.error.issues.map((i) => ({
      path: `site.${i.path.join(".")}`,
      message: `Ungültige Grundstücksdaten: ${i.message}`,
    }));
  const issues: { path: string; message: string }[] = [];
  const ids = new Set([
    project.id,
    ...[
      project.floors,
      project.layers,
      project.points,
      project.walls,
      project.rooms,
      project.doors,
      project.windows,
      project.dimensions,
      project.furniture,
      ...Object.entries(project.electrical)
        .filter(([key]) => key !== "settings")
        .map(([, value]) => value),
      utilities(project).nodes,
      utilities(project).pipes,
    ].flatMap((t) => Object.keys(t)),
  ]);
  // Housebook validation reports malformed metadata separately.
  try {
    for (const node of housebook(project).networkNodes) ids.add(node.id);
  } catch {
    /* validated elsewhere */
  }
  for (const [key, item] of Object.entries(parsed.data.elements)) {
    const report = (message: string) => issues.push({ path: `site.elements.${key}`, message });
    if (key !== item.id || ids.has(item.id)) report("Doppelte oder abweichende Grundstücksobjekt-ID.");
    ids.add(item.id);
    if (!project.floors[item.floorId]) report("Geschoss des Grundstücksobjekts fehlt.");
    if (project.layers[item.layerId]?.kind !== "site")
      report("Grundstücksobjekt benötigt die Grundstücksebene.");
    const problem = siteProblem(item);
    if (problem) report(problem);
  }
  return issues;
}
