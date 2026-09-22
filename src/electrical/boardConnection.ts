import type { Project } from "../models/project";
import type { Cable } from "./models";
import { suggestContacts } from "./contactSuggestions";

/** Resolves a selection on a draft, so cancelling the dialog never creates a circuit. */
export function boardCircuit(
  project: Project,
  boardId: string,
  choice: string,
  reservedId: string,
): string | null {
  const board = project.electrical.distributionBoards[boardId];
  if (!board) throw new Error("Sicherungskasten fehlt.");
  if (choice === "input") return null;
  if (choice.startsWith("circuit:")) {
    const id = choice.slice(8);
    if (project.electrical.circuits[id]?.distributionBoardId !== boardId)
      throw new Error("Stromkreis gehört nicht zu diesem Kasten.");
    return id;
  }
  const protection = project.electrical.protectionDevices[choice.slice(11)];
  if (!choice.startsWith("protection:") || protection?.distributionBoardId !== boardId)
    throw new Error("Bitte Sicherung oder Einspeisung wählen.");
  if (Object.values(project.electrical.circuits).some((c) => c.protectionDeviceId === protection.id))
    throw new Error("Bitte den vorhandenen Stromkreis der Sicherung wählen.");
  let number = 1;
  const labels = new Set(Object.values(project.electrical.circuits).map((c) => c.label));
  while (labels.has(`SK-${String(number).padStart(2, "0")}`)) number++;
  project.electrical.circuits[reservedId] = {
    id: reservedId,
    label: `SK-${String(number).padStart(2, "0")}`,
    name: `Abgang ${protection.label}`,
    distributionBoardId: boardId,
    protectionDeviceId: protection.id,
    phase: protection.poles >= 3 ? "L1/L2/L3" : "unknown",
    nominalVoltage: null,
    metadata: {},
  };
  return reservedId;
}

export function suggestBoardContacts(
  project: Project,
  boardId: string,
  otherId: string,
  circuitId: string,
  reverse: boolean,
): Cable["conductorConnections"] {
  return suggestContacts(project, reverse ? otherId : boardId, reverse ? boardId : otherId, {
    [boardId]: circuitId,
  });
}

/** Explicit independent circuit assignment; cable removal does not erase this object setting. */
export function assignBoardTarget(project: Project, targetId: string, circuitId: string) {
  const e = project.electrical;
  const device = e.devices[targetId];
  const sw = e.switches[targetId];
  if (device && (device.connectionPointId || device.switchId || device.controlId || device.transformerId))
    throw new Error("Bestehenden Verbraucheranschluss zuerst lösen.");
  if (
    sw &&
    (sw.supply.kind === "switch" || Object.values(e.controls).some((c) => c.switchIds.includes(targetId)))
  )
    throw new Error("Bestehende Schalterversorgung oder Schaltgruppe zuerst lösen.");
  const target = device ?? sw ?? e.outlets[targetId] ?? e.transformers[targetId];
  if (!target) throw new Error("Für dieses Endobjekt wird der Stromkreis an der Leitung dokumentiert.");
  if (target.circuitId && target.circuitId !== circuitId)
    throw new Error("Endobjekt gehört bereits zu einem anderen Stromkreis. Zuordnung zuerst lösen.");
  target.circuitId = circuitId;
  if (sw) sw.supply = { kind: "circuit" };
}
