import type { Project } from "../models/project";
import { networkNodeTable } from "./model";
import { addElectrical, detachDeletedElectricalReferences } from "../electrical/actions";
import { electricalNodes } from "../electrical/cables";

export function networkPower(project: Project, nodeId: string) {
  return Object.values(project.electrical.devices).find((d) => d.metadata.networkNodeId === nodeId);
}
export function ensureNetworkPower(project: Project, nodeId: string) {
  const node = networkNodeTable(project)[nodeId];
  if (!node || project.layers[node.layerId]?.locked)
    throw new Error("Netzwerkgerät fehlt oder seine Ebene ist gesperrt.");
  const existing = networkPower(project, nodeId);
  if (existing) return existing.id;
  const id = addElectrical(project, node.floorId, node.position, "devices");
  const device = project.electrical.devices[id]!;
  device.name = `${node.name} · Stromanschluss`;
  device.metadata.networkNodeId = nodeId;
  device.metadata.hasProtectiveEarth = false;
  device.operatingMode = "on";
  return id;
}
export function syncNetworkPower(project: Project, before?: Project) {
  const nodes = networkNodeTable(project);
  let removed = false;
  const linked = new Set<string>();
  for (const device of Object.values(project.electrical.devices)) {
    const nodeId = device.metadata.networkNodeId;
    if (typeof nodeId !== "string") continue;
    if (linked.has(nodeId))
      throw new Error(
        "Netzwerkgerät hat bereits einen Stromanschluss. Das Netzwerkgerät separat duplizieren.",
      );
    linked.add(nodeId);
    const node = nodes[nodeId];
    if (!node) {
      delete project.electrical.devices[device.id];
      removed = true;
      continue;
    }
    if (
      project.layers[node.layerId]?.locked &&
      JSON.stringify(before?.electrical.devices[device.id]) !== JSON.stringify(device)
    )
      throw new Error("Die Netzwerkebene ist gesperrt.");
    device.position = { ...node.position };
    device.floorId = node.floorId;
    device.name = `${node.name} · Stromanschluss`;
  }
  if (removed) detachDeletedElectricalReferences(project);
  const endpoints = electricalNodes(project);
  for (const cable of Object.values(project.electrical.cables)) {
    const a = endpoints[cable.startNodeId],
      b = endpoints[cable.endNodeId];
    if (!a || !b || (!a.metadata.networkNodeId && !b.metadata.networkNodeId)) continue;
    cable.floorId = a.floorId;
    cable.riser = a.floorId === b.floorId ? null : (cable.riser ?? { ...a.position });
    if (!cable.riser) cable.endPath = [];
  }
}
