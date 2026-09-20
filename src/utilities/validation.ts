import type { Project } from "../models/project";
import { utilitiesSchema, media, supportedMedia, supportsMedium } from "./model";

export function utilityIssues(project: Project): { path: string; message: string }[] {
  if (project.metadata.utilities === undefined) return [];
  const result = utilitiesSchema.safeParse(project.metadata.utilities);
  if (!result.success)
    return result.error.issues.map((i) => ({
      path: `utilities.${i.path.join(".")}`,
      message: `Ungültige Rohrnetzdaten: ${i.message}`,
    }));
  const { nodes, pipes } = result.data,
    issues: { path: string; message: string }[] = [];
  const report = (message: string) => issues.push({ path: "utilities", message });
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
        .filter(([k]) => k !== "settings")
        .map(([, v]) => v),
    ].flatMap((t) => Object.keys(t)),
  ]);
  for (const [key, item] of [...Object.entries(nodes), ...Object.entries(pipes)]) {
    if (key !== item.id || ids.has(item.id)) report("Doppelte oder abweichende Objekt-ID im Rohrnetz.");
    ids.add(item.id);
    if (!project.floors[item.floorId]) report("Geschoss des Rohrnetzes fehlt.");
    const expected = "medium" in item ? media[item.medium].layer : media[item.media[0]!].layer;
    if (project.layers[item.layerId]?.kind !== expected)
      report("Rohrnetzobjekt liegt auf einer unpassenden Ebene.");
  }
  for (const node of Object.values(nodes)) {
    const legacyGasBoiler =
      node.kind === "gasBoiler" && JSON.stringify(node.media) === JSON.stringify(["flow", "return", "gas"]);
    if (
      !legacyGasBoiler &&
      JSON.stringify(node.media) !== JSON.stringify(supportedMedia(node.kind, node.media[0]!))
    )
      report("Anschlussmedien passen nicht zur Komponentenart.");
    if (node.closed && node.kind !== "valve") report("Nur Absperrventile können geschlossen sein.");
  }
  const connections = new Set<string>();
  for (const pipe of Object.values(pipes)) {
    const a = nodes[pipe.from],
      b = nodes[pipe.to];
    if (!a || !b || a.id === b.id) {
      report("Rohrleitung benötigt zwei vorhandene, verschiedene Anschlussobjekte.");
      continue;
    }
    if (!supportsMedium(a, pipe.medium) || !supportsMedium(b, pipe.medium))
      report("Unverträgliche Medien an der Rohrleitung.");
    if (pipe.floorId !== a.floorId || Boolean(pipe.riser) !== (a.floorId !== b.floorId))
      report("Etagenverbindung benötigt einen passenden Steigpunkt.");
    const key = [pipe.medium, ...[pipe.from, pipe.to].sort()].join(":");
    if (connections.has(key)) report("Doppelte Rohrverbindung für dasselbe Medium.");
    connections.add(key);
  }
  return issues;
}
