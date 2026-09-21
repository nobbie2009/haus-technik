import { newId } from "../utils/uuid";
import type { Project } from "../models/project";
import type { ProtectionDevice } from "./models";
import { addElectrical } from "./actions";

export function addBoardTransformer(project: Project, boardId: string): string {
  const board = project.electrical.distributionBoards[boardId];
  if (!board) throw new Error("Sicherungskasten fehlt.");
  if (project.layers[board.layerId]?.locked) throw new Error("Ebene ist gesperrt.");
  const count = Object.values(project.electrical.transformers).filter(
    (t) => t.distributionBoardId === boardId,
  ).length;
  const id = addElectrical(
    project,
    board.floorId,
    { x: board.position.x + 250, y: board.position.y + count * 250 },
    "transformers",
  );
  Object.assign(project.electrical.transformers[id]!, {
    distributionBoardId: boardId,
    layerId: board.layerId,
    secondaryVoltage: 6,
    secondaryVoltages: [6, 9, 12, 24],
    ratedVA: 24,
  });
  return id;
}

export function addProtectionDevice(
  project: Project,
  boardId: string,
  type: ProtectionDevice["type"] = "MCB",
): string {
  if (!project.electrical.distributionBoards[boardId]) throw new Error("Sicherungskasten fehlt.");
  const id = newId();
  const labels = new Set(Object.values(project.electrical.protectionDevices).map((item) => item.label));
  let number = 1;
  while (labels.has(`F${number}`)) number++;
  project.electrical.protectionDevices[id] = {
    id,
    distributionBoardId: boardId,
    upstreamProtectionDeviceId: null,
    type,
    label: `F${number}`,
    ratedCurrent: type === "MCB" ? 16 : null,
    characteristic: type === "MCB" ? "B" : "",
    poles: type === "RCD" ? 4 : 1,
    residualCurrent: null,
    breakingCapacity: null,
    metadata: {},
  };
  return id;
}

export function assignCircuitProtection(
  project: Project,
  circuitId: string,
  protectionId: string | null,
): void {
  const circuit = project.electrical.circuits[circuitId];
  if (!circuit) throw new Error("Stromkreis fehlt.");
  const protection = protectionId ? project.electrical.protectionDevices[protectionId] : null;
  if (protectionId && protection?.distributionBoardId !== circuit.distributionBoardId)
    throw new Error("Schutzgerät gehört zu einem anderen Sicherungskasten.");
  circuit.protectionDeviceId = protectionId;
}
