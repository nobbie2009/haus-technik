import { isTvKind } from "../network/tv";
import { solarPlacementSchema } from "../electrical/solarPlan";
import type { Project } from "../models/project";
import { elementTables } from "../core/elementTables";
import { assetSchema, bookSchema } from "./model";
import { consumerLibrarySchema, consumerShapeSchema } from "../electrical/consumerLibrary";
import { wallPhotosSchema } from "./wallPhotos";
import { site } from "../site/model";
import { constructionSchema } from "./construction";
import { homeIssues } from "./home";
import { setupSchema } from "./setup";
import { solarSchema } from "./solar";
import { lifeSchema } from "./life";
export function housebookIssues(project: Project): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [...homeIssues(project)];
  if (
    project.metadata.constructionNotes !== undefined &&
    !constructionSchema.safeParse(project.metadata.constructionNotes).success
  )
    issues.push({
      path: "metadata.constructionNotes",
      message: "Ungültige Baustellennotizen oder Aufnahmen.",
    });
  for (const device of Object.values(project.electrical.devices)) {
    if (device.metadata.solarPlacement === undefined) continue;
    if (
      !solarPlacementSchema.safeParse(device.metadata.solarPlacement).success ||
      !consumerShapeSchema.safeParse(device.metadata.consumerShape).success
    )
      issues.push({
        path: `${device.id}.solarPlacement`,
        message: "Solarobjekt benötigt gültige Anlagenzuordnung und Planmaße.",
      });
  }
  for (const [key, schema] of [
    ["setupGuide", setupSchema],
    ["solarPlants", solarSchema],
    ["houseLife", lifeSchema],
  ] as const) {
    if (project.metadata[key] === undefined) continue;
    const result = schema.safeParse(project.metadata[key]);
    if (!result.success)
      issues.push(
        ...result.error.issues.map((i) => ({
          path: `metadata.${key}.${i.path.join(".")}`,
          message: i.message,
        })),
      );
  }
  let hasWallPhotos = false;
  for (const wall of [...Object.values(project.walls), ...Object.values(site(project).elements)]) {
    if (wall.metadata.wallPhotos === undefined) continue;
    hasWallPhotos = true;
    if (!wallPhotosSchema.safeParse(wall.metadata.wallPhotos).success)
      issues.push({
        path: `${wall.id}.wallPhotos`,
        message: "Ungültige Wandfotos, Referenzstrecken oder Fotoverläufe.",
      });
  }
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
      const { networkNodes, networkLinks, wifiMeasurements, scenarios, templates } = result.data;
      if (
        networkNodes.some((n) => !project.floors[n.floorId]) ||
        wifiMeasurements.some(
          (m) =>
            !project.floors[m.floorId] ||
            !networkNodes.some(
              (n) => n.id === m.sourceId && ["router", "accessPoint", "repeater"].includes(n.kind),
            ),
        ) ||
        Object.keys(result.data.backgrounds).some((id) => !project.floors[id])
      )
        issues.push({
          path: "metadata.housebook",
          message: "Eine Etage der Grundrissvorlage oder Netzwerkplanung fehlt.",
        });
      const ids = [...networkNodes, ...networkLinks, ...wifiMeasurements, ...scenarios, ...templates].map(
        (n) => n.id,
      );
      if (new Set(ids).size !== ids.length)
        issues.push({ path: "metadata.housebook", message: "Doppelte ID in der Hausakte." });
      const used = new Set<string>();
      for (const node of networkNodes) {
        if (
          node.poe &&
          (node.poe.inputPort > node.ports ||
            node.poe.enabledPorts.some((port) => port > node.ports) ||
            new Set(node.poe.enabledPorts).size !== node.poe.enabledPorts.length)
        )
          issues.push({
            path: "metadata.housebook",
            message: "PoE-Port muss am Gerät vorhanden und eindeutig sein.",
          });
      }
      for (const link of networkLinks) {
        const from = networkNodes.find((n) => n.id === link.from),
          to = networkNodes.find((n) => n.id === link.to);
        if (from && to && from.floorId !== to.floorId && link.path?.length)
          issues.push({
            path: "metadata.housebook.networkLinks",
            message: "Leitungswegpunkte benötigen Start und Ziel auf derselben Etage.",
          });
        if (
          from &&
          to &&
          (isTvKind(from.kind) !== isTvKind(to.kind) ||
            (link.medium === "coax" && (!isTvKind(from.kind) || !isTvKind(to.kind))) ||
            (link.medium === "ethernet" && (isTvKind(from.kind) || isTvKind(to.kind))))
        )
          issues.push({
            path: "metadata.housebook.networkLinks",
            message: "Koaxanschlüsse nur mit TV-/SAT-Komponenten verbinden; Netzwerkports getrennt zuordnen.",
          });
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
  if (
    (project.metadata.constructionNotes ||
      project.metadata.housebook ||
      project.metadata.homeOverview ||
      project.metadata.solarPlants ||
      project.metadata.houseLife ||
      hasAssets ||
      hasWallPhotos) &&
    JSON.stringify(project).length > 18_000_000
  )
    issues.push({
      path: "metadata.housebook",
      message: "Projekt zu groß: maximal 18 MB einschließlich Bildern und Vorlagen.",
    });
  return issues;
}
