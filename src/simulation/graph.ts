import type { Project } from "../models/project";
import type { SimulationGraph, SimulationNode } from "./models";

/** Versorgungstopologie aus ID-Zuordnungen, unabhängig von Render-/Kabelweggeometrie. */
export function buildSupplyGraph(project: Project): SimulationGraph {
  const nodes: SimulationGraph["nodes"] = {};
  const add = (
    id: string,
    kind: SimulationNode["kind"],
    parentId: string | null,
    phase: SimulationNode["phase"] = "unknown",
  ) => {
    nodes[id] = { id, kind, parentId, phase };
  };
  const e = project.electrical;
  for (const item of Object.values(e.supplies)) add(item.id, "supply", null);
  for (const item of Object.values(e.meters)) add(item.id, "meter", item.supplyId);
  for (const item of Object.values(e.distributionBoards))
    add(item.id, "board", item.upstreamCircuitId ?? item.meterId ?? item.supplyId);
  for (const item of Object.values(e.protectionDevices))
    add(item.id, "protection", item.upstreamProtectionDeviceId ?? item.distributionBoardId);
  for (const item of Object.values(e.circuits))
    add(item.id, "circuit", item.protectionDeviceId ?? item.distributionBoardId, item.phase);
  for (const item of Object.values(e.outlets)) add(item.id, "outlet", item.circuitId);
  for (const item of Object.values(e.switches))
    add(
      item.id,
      "switch",
      item.supply.kind === "switch"
        ? item.supply.switchId
        : item.supply.kind === "circuit"
          ? item.circuitId
          : null,
    );
  for (const item of Object.values(e.devices))
    add(
      item.id,
      "device",
      item.transformerId ?? item.controlId ?? item.switchId ?? item.connectionPointId ?? item.circuitId,
    );
  for (const item of Object.values(e.controls)) add(item.id, "control", item.circuitId);
  for (const item of Object.values(e.transformers)) add(item.id, "transformer", item.circuitId);
  return {
    nodes,
    edges: Object.values(nodes).flatMap((node) =>
      node.parentId ? [{ from: node.parentId, to: node.id }] : [],
    ),
  };
}
