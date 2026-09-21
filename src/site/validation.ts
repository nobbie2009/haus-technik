import { gpsReferenceSchema, gpsSurveySchema } from "./gps";
import type { Project } from "../models/project";
import { siteSchema, siteProblem } from "./model";
import { utilities } from "../utilities/model";
import { housebook } from "../housebook/model";
export function siteIssues(project: Project) {
  const gpsIssues: { path: string; message: string }[] = [];
  for (const floor of Object.values(project.floors)) {
    if (
      floor.metadata.gpsReference !== undefined &&
      !gpsReferenceSchema.safeParse(floor.metadata.gpsReference).success
    )
      gpsIssues.push({
        path: `floors.${floor.id}.metadata.gpsReference`,
        message: "Ungültige GPS-Referenz.",
      });
  }
  if (project.metadata.site === undefined) return gpsIssues;
  const parsed = siteSchema.safeParse(project.metadata.site);
  if (!parsed.success)
    return parsed.error.issues.map((i) => ({
      path: `site.${i.path.join(".")}`,
      message: `Ungültige Grundstücksdaten: ${i.message}`,
    }));
  const issues: { path: string; message: string }[] = [...gpsIssues];
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
    if (item.metadata.gpsSurvey !== undefined) {
      const survey = gpsSurveySchema.safeParse(item.metadata.gpsSurvey);
      if (!survey.success || survey.data.fixes.length !== item.vertices.length)
        report("Ungültige GPS-Aufnahmedaten.");
    }
    const problem = siteProblem(item);
    if (problem) report(problem);
  }
  return issues;
}
