import type { Project } from "../models/project";
import { elementTables } from "../core/elementTables";
import { assetSchema, bookSchema } from "./model";
import { consumerLibrarySchema, consumerShapeSchema } from "../electrical/consumerLibrary";
export function housebookIssues(project: Project): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (project.metadata.consumerLibrary !== undefined) {
    const result = consumerLibrarySchema.safeParse(project.metadata.consumerLibrary);
    if (!result.success)
      issues.push({
        path: "metadata.consumerLibrary",
        message: result.error.issues.map((i) => i.message).join(" "),
      });
  }
  for (const device of Object.values(project.electrical.devices)) {
    if (
      device.metadata.consumerShape !== undefined &&
      !consumerShapeSchema.safeParse(device.metadata.consumerShape).success
    )
      issues.push({
        path: `${device.id}.consumerShape`,
        message: "Ungültige Verbrauchermaße oder Verbrauchsdaten.",
      });
  }
  let hasAssets = false;
  if (project.metadata.housebook !== undefined) {
    const result = bookSchema.safeParse(project.metadata.housebook);
    if (!result.success)
      issues.push(
        ...result.error.issues.map((i) => ({
          path: `metadata.housebook.${i.path.join(".")}`,
          message: i.message,
        })),
      );
    else {
      const { networkNodes, networkLinks, scenarios, templates } = result.data;
      if (
        networkNodes.some((n) => !project.floors[n.floorId]) ||
        Object.keys(result.data.backgrounds).some((id) => !project.floors[id])
      )
        issues.push({
          path: "metadata.housebook",
          message: "Eine Etage der Grundrissvorlage oder Netzwerkplanung fehlt.",
        });
      const ids = [...networkNodes, ...networkLinks, ...scenarios, ...templates].map((n) => n.id);
      if (new Set(ids).size !== ids.length)
        issues.push({ path: "metadata.housebook", message: "Doppelte ID in der Hausakte." });
      const used = new Set<string>();
      for (const link of networkLinks) {
        const from = networkNodes.find((n) => n.id === link.from),
          to = networkNodes.find((n) => n.id === link.to);
        if (!from || !to || from.id === to.id || link.fromPort > from.ports || link.toPort > to.ports)
          issues.push({
            path: "metadata.housebook.networkLinks",
            message: "Ungültige Netzwerkverbindung oder Portnummer.",
          });
        for (const port of [`${link.from}:${link.fromPort}`, `${link.to}:${link.toPort}`]) {
          if (used.has(port))
            issues.push({
              path: "metadata.housebook.networkLinks",
              message: "Ein Netzwerkport ist mehrfach belegt.",
            });
          used.add(port);
        }
      }
    }
  }
  for (const table of Object.values(elementTables(project)))
    for (const item of Object.values(table)) {
      if (item.metadata.asset === undefined) continue;
      hasAssets = true;
      const result = assetSchema.safeParse(item.metadata.asset);
      if (!result.success)
        issues.push(
          ...result.error.issues.map((i) => ({
            path: `${item.id}.asset.${i.path.join(".")}`,
            message: i.message,
          })),
        );
      else if (result.data.mounting) {
        const wall = project.walls[result.data.mounting.wallId];
        if (
          !wall ||
          wall.floorId !== item.floorId ||
          !("position" in item) ||
          typeof item.position !== "object"
        )
          issues.push({
            path: `${item.id}.asset.mounting`,
            message: "Wandbefestigung benötigt ein räumliches Objekt und eine Wand derselben Etage.",
          });
      }
    }
  if ((project.metadata.housebook || hasAssets) && JSON.stringify(project).length > 18_000_000)
    issues.push({
      path: "metadata.housebook",
      message: "Projekt zu groß: maximal 18 MB einschließlich Bildern und Vorlagen.",
    });
  return issues;
}
