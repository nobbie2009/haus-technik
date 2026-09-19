import type { Project } from "../models/project";
import type { ElectricalDevice, ElectricalPlacement } from "./models";
import { cableLengths } from "./cables";

export function deviceCircuitId(project: Project, device: ElectricalDevice): string | null {
  return device.connectionPointId
    ? (project.electrical.outlets[device.connectionPointId]?.circuitId ?? null)
    : device.circuitId;
}
export function circuitMembers(project: Project, circuitId: string) {
  const outlets = Object.values(project.electrical.outlets).filter((item) => item.circuitId === circuitId);
  const devices = Object.values(project.electrical.devices).filter(
    (item) => deviceCircuitId(project, item) === circuitId,
  );
  const cables = Object.values(project.electrical.cables).filter((item) => item.circuitId === circuitId);
  const lengths = cables.map((cable) => cableLengths(project, cable));
  return {
    controls: Object.values(project.electrical.controls).filter((item) => item.circuitId === circuitId),
    transformers: Object.values(project.electrical.transformers).filter(
      (item) => item.circuitId === circuitId,
    ),
    switches: Object.values(project.electrical.switches).filter((item) => item.circuitId === circuitId),
    outlets,
    devices,
    boards: Object.values(project.electrical.distributionBoards).filter(
      (item) => item.upstreamCircuitId === circuitId,
    ),
    cables,
    planLength: lengths.reduce((sum, length) => sum + length.planLength, 0),
    totalLength: lengths.reduce((sum, length) => sum + length.totalLength, 0),
    knownPower: devices.reduce((sum, item) => sum + (item.ratedPower ?? 0), 0),
    missingPower: devices.filter((item) => item.ratedPower === null).length,
  };
}
export function electricalCaption(project: Project, item: ElectricalPlacement): string {
  if (item.labelMode === "none") return "";
  if (item.labelMode === "name") return item.name;
  if (item.labelMode === "number") return "number" in item ? String(item.number) : item.label;
  if (item.labelMode === "circuit") {
    const id =
      "connectionPointId" in item
        ? deviceCircuitId(project, item as ElectricalDevice)
        : "circuitId" in item
          ? String(item.circuitId ?? "")
          : "";
    const circuit = id ? project.electrical.circuits[id] : null;
    return circuit ? circuit.label || circuit.name : "Ohne Stromkreis";
  }
  return item.label;
}
