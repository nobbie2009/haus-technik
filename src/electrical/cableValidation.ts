import type { Project } from "../models/project";
import type { ValidationIssue } from "../core/validation";
import { electricalNodes, cablePath, cableLengths } from "./cables";
import { distance } from "../geometry/distance";
import { contactConnectionIssues } from "./contacts";

export function cableIssues(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodes = electricalNodes(project);
  for (const cable of Object.values(project.electrical.cables)) {
    const report = (message: string) => issues.push({ path: `electrical.cables.${cable.id}`, message });
    const a = nodes[cable.startNodeId],
      b = nodes[cable.endNodeId];
    if (!a || !b) {
      report("Endobjekt der Leitung fehlt.");
      continue;
    }
    if (a.id === b.id) report("Leitung darf nicht zum selben Endobjekt zurückführen.");
    if (!project.floors[cable.floorId] || a.floorId !== cable.floorId)
      report("Leitung muss der Startetage zugeordnet sein.");
    if ((a.floorId !== b.floorId) !== !!cable.riser)
      report("Geschossübergreifende Leitung benötigt einen Steigpunkt; innerhalb einer Etage keinen.");
    if (!cable.riser && cable.endPath.length) report("Zielweg ist nur bei Geschossübergängen erlaubt.");
    if (project.layers[cable.layerId]?.kind !== "electrical") report("Leitung benötigt eine Elektrikebene.");
    if (cable.circuitId && !project.electrical.circuits[cable.circuitId])
      report("Stromkreis der Leitung fehlt.");
    contactConnectionIssues(project, cable).forEach(report);
    const path = cablePath(project, cable);
    if (!cable.riser && path.slice(1).some((p, i) => distance(path[i]!, p) < 1))
      report("Leitungsabschnitte müssen mindestens 1 mm lang sein.");
    if (!Number.isFinite(cableLengths(project, cable).totalLength))
      report("Leitungslänge ist nicht endlich.");
  }
  return issues;
}
