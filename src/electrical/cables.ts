import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import type { Cable } from "./models";
import { distance } from "../geometry/distance";

export function electricalNodes(project: Project) {
  return {
    ...project.electrical.supplies,
    ...project.electrical.meters,
    ...project.electrical.switches,
    ...project.electrical.controls,
    ...project.electrical.transformers,
    ...project.electrical.distributionBoards,
    ...project.electrical.outlets,
    ...project.electrical.devices,
    ...project.electrical.junctions,
  };
}
export function electricalNode(project: Project, id: string) {
  return (
    project.electrical.supplies[id] ??
    project.electrical.meters[id] ??
    project.electrical.switches[id] ??
    project.electrical.controls[id] ??
    project.electrical.transformers[id] ??
    project.electrical.outlets[id] ??
    project.electrical.devices[id] ??
    project.electrical.distributionBoards[id] ??
    project.electrical.junctions[id]
  );
}
export function cablePath(project: Project, cable: Cable): Vec2[] {
  const start = electricalNode(project, cable.startNodeId),
    end = electricalNode(project, cable.endNodeId);
  return start && end
    ? [{ ...start.position }, ...cable.path.map((p) => ({ ...p })), { ...end.position }]
    : [];
}
export function cableLengths(project: Project, cable: Cable) {
  const a = electricalNode(project, cable.startNodeId)!,
    b = electricalNode(project, cable.endNodeId)!;
  const paths = cable.riser
    ? [cableFloorPath(project, cable, a.floorId), cableFloorPath(project, cable, b.floorId)]
    : [cablePath(project, cable)];
  const planLength = paths.reduce(
    (sum, path) => sum + path.slice(1).reduce((length, p, i) => length + distance(path[i]!, p), 0),
    0,
  );
  const verticalLength = cable.riser
    ? Math.abs(project.floors[a.floorId]!.elevation - project.floors[b.floorId]!.elevation)
    : 0;
  return { planLength, verticalLength, totalLength: planLength + verticalLength + cable.lengthAllowance };
}
export function cableOnFloor(project: Project, cable: Cable, floorId: string) {
  return (
    cable.floorId === floorId ||
    (!!cable.riser && electricalNode(project, cable.endNodeId)?.floorId === floorId)
  );
}
export function cableFloorPath(project: Project, cable: Cable, floorId: string): Vec2[] {
  const a = electricalNode(project, cable.startNodeId),
    b = electricalNode(project, cable.endNodeId);
  if (!a || !b) return [];
  if (!cable.riser) return floorId === cable.floorId ? cablePath(project, cable) : [];
  if (floorId === a.floorId) return [a.position, ...cable.path, cable.riser];
  if (floorId === b.floorId) return [cable.riser, ...cable.endPath, b.position];
  return [];
}
export function nearestElectricalNode(project: Project, floorId: string, position: Vec2, scale: number) {
  return (
    Object.values(electricalNodes(project))
      .filter((item) => item.floorId === floorId && project.layers[item.layerId]?.visible)
      .map((item) => ({ item, d: distance(position, item.position) * scale }))
      .filter((candidate) => candidate.d <= 14)
      .sort((a, b) => a.d - b.d || a.item.id.localeCompare(b.item.id))[0]?.item ?? null
  );
}
export function addCable(project: Project, startNodeId: string, endNodeId: string, path: Vec2[]): string {
  const nodes = electricalNodes(project),
    start = nodes[startNodeId],
    end = nodes[endNodeId];
  if (!start || !end || startNodeId === endNodeId)
    throw new Error("Eine Leitung benötigt zwei verschiedene Endobjekte.");
  const layer = Object.values(project.layers).find(
    (layer) => layer.kind === "electrical" && layer.visible && !layer.locked,
  );
  if (!layer) throw new Error("Bitte die Elektrikebene einblenden und entsperren.");
  const id = crypto.randomUUID();
  let number = 1;
  const labels = new Set(Object.values(project.electrical.cables).map((item) => item.label));
  while (labels.has(`L-${String(number).padStart(2, "0")}`)) number++;
  project.electrical.cables[id] = {
    riser: start.floorId === end.floorId ? null : { ...start.position },
    endPath: [],
    conductorConnections: [],
    connectionAssignment: "none",
    id,
    floorId: start.floorId,
    layerId: layer.id,
    name: "Leitung",
    label: `L-${String(number).padStart(2, "0")}`,
    type: "Unbekannt",
    startNodeId,
    endNodeId,
    path: path.map((p) => ({ ...p })),
    circuitId: null,
    conductorCount: null,
    conductorCrossSection: null,
    material: "",
    installationMethod: "",
    ratedVoltage: null,
    lengthAllowance: 0,
    metadata: {},
  };
  return id;
}

/** Unveränderlicher Bauteilgraph. Keine Leiter-/Polauflösung und keine Versorgungssimulation. */
export function buildCableGraph(project: Project) {
  const nodes = Object.values(electricalNodes(project)).map((item) => ({
    id: item.id,
    floorId: item.floorId,
    position: { ...item.position },
  }));
  const edges = Object.values(project.electrical.cables).map((cable) => ({
    id: cable.id,
    startNodeId: cable.startNodeId,
    endNodeId: cable.endNodeId,
    length: cableLengths(project, cable).totalLength,
    circuitId: cable.circuitId,
  }));
  return { nodes, edges };
}
