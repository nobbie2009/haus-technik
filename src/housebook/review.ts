import type { Project } from "../models/project";
import type { Selection } from "../editor/types";
import { elementTables, elementKinds } from "../core/elementTables";
import { deviceCircuitId } from "../electrical/selectors";
import { simulate } from "../simulation/solve";
import { emptyScenario } from "../simulation/models";
import { asset } from "./model";
import { housebook } from "./model";
import { utilities } from "../utilities/model";
import { solarPlacement } from "../electrical/solarPlan";
import { circuitSupply, objectSupply } from "../electrical/supply";
export interface ReviewIssue {
  id: string;
  message: string;
  target: Selection | null;
  severity: "warning" | "info";
}
export function projectReview(project: Project): ReviewIssue[] {
  const issues: ReviewIssue[] = [],
    e = project.electrical;
  const add = (
    id: string,
    message: string,
    target: Selection | null,
    severity: ReviewIssue["severity"] = "warning",
  ) => issues.push({ id: `${id}:${issues.length}`, message, target, severity });
  for (const item of Object.values(e.outlets))
    if (!item.circuitId) add(item.id, `${item.name}: Stromkreis fehlt.`, { kind: "outlets", id: item.id });
  for (const item of Object.values(e.devices)) {
    if (solarPlacement(item)) continue;
    const target: Selection = { kind: "devices", id: item.id };
    if (!deviceCircuitId(project, item)) add(item.id, `${item.name}: Anschluss fehlt.`, target);
    if (item.ratedPower === null && item.ratedCurrent === null)
      add(item.id, `${item.name}: Leistungs- und Stromangabe fehlen.`, target);
  }
  for (const circuit of Object.values(e.circuits)) {
    const target: Selection = { kind: "distributionBoards", id: circuit.distributionBoardId };
    if (!circuit.protectionDeviceId)
      add(circuit.id, `${circuit.label || circuit.name}: Schutzgerät fehlt.`, target);
    if (circuit.phase === "unknown")
      add(circuit.id, `${circuit.label || circuit.name}: Phase unbekannt.`, target);
    for (const warning of circuitSupply(project, circuit.id, circuit.phase === "L1/L2/L3" ? 3 : 1).warnings)
      add(circuit.id, `${circuit.label || circuit.name}: ${warning}`, target);
  }
  for (const board of Object.values(e.distributionBoards))
    if (!board.supplyId && !board.meterId && !board.upstreamCircuitId)
      add(board.id, `${board.name}: Einspeisezuordnung fehlt.`, { kind: "distributionBoards", id: board.id });
  const simulation = simulate(project, emptyScenario());
  for (const item of Object.values(simulation.devices))
    for (const message of solarPlacement(e.devices[item.id]!) ? [] : item.issues)
      add(item.id, `${e.devices[item.id]!.name}: ${message}`, { kind: "devices", id: item.id });
  for (const kind of elementKinds)
    for (const item of Object.values(elementTables(project)[kind])) {
      const record = asset(item);
      if (record.maintenanceDate && record.maintenanceDate < new Date().toISOString().slice(0, 10))
        add(
          item.id,
          `${"name" in item ? item.name : kind}: Wartung fällig (${record.maintenanceDate}).`,
          { kind, id: item.id },
          "info",
        );
    }
  for (const kind of ["outlets", "devices"] as const)
    for (const item of Object.values(e[kind])) {
      for (const warning of objectSupply(project, kind, item.id).warnings.filter(
        (m) => m.includes("Bauteil") || m.includes("Steckdosen"),
      ))
        add(item.id, `${item.name}: ${warning}`, { kind, id: item.id });
    }
  const net = utilities(project),
    book = housebook(project);
  for (const node of Object.values(net.nodes))
    if (!Object.values(net.pipes).some((pipe) => pipe.from === node.id || pipe.to === node.id))
      add(node.id, `${node.name}: Rohranschluss fehlt.`, { kind: "utilityNodes", id: node.id });
  for (const node of book.networkNodes)
    if (!book.networkLinks.some((link) => link.from === node.id || link.to === node.id))
      add(
        node.id,
        `${node.name}: Keine Kabelverbindung dokumentiert (bei WLAN-Geräten eventuell beabsichtigt).`,
        { kind: "networkNodes", id: node.id },
        "info",
      );
  const labels = new Map<string, string>();
  for (const kind of elementKinds)
    for (const item of Object.values(elementTables(project)[kind])) {
      if (!("label" in item) || typeof item.label !== "string" || !item.label.trim()) continue;
      const key = item.label.trim().toLocaleLowerCase("de-DE");
      if (labels.has(key)) add(item.id, `Doppelte Kennzeichnung „${item.label}“.`, { kind, id: item.id });
      else labels.set(key, item.id);
    }
  for (const node of Object.values(e.junctions)) {
    const count = Object.values(e.cables).filter(
      (c) => c.startNodeId === node.id || c.endNodeId === node.id,
    ).length;
    if (count < 2)
      add(node.id, `${node.name}: Offenes Leitungsende (${count} Leitungen).`, {
        kind: "junctions",
        id: node.id,
      });
  }
  return [...new Map(issues.map((i) => [`${i.target?.id}:${i.message}`, i])).values()];
}
