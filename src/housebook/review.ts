import type { Project } from "../models/project";
import type { Selection } from "../editor/types";
import { elementTables, elementKinds } from "../core/elementTables";
import { deviceCircuitId } from "../electrical/selectors";
import { simulate } from "../simulation/solve";
import { emptyScenario } from "../simulation/models";
import { asset } from "./model";
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
    for (const message of item.issues)
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
  return [...new Map(issues.map((i) => [i.message, i])).values()];
}
