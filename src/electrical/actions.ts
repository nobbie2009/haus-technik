import { newId } from "../utils/uuid";
import { electricalNodes } from "./cables";
import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import type { ElectricalKind } from "./models";
import { pointInPolygon } from "../geometry/dimensions";
import { projectToSegment } from "../geometry/distance";

export function addElectrical(
  project: Project,
  floorId: string,
  position: Vec2,
  kind: ElectricalKind,
): string {
  const layer = Object.values(project.layers).find(
    (layer) => layer.kind === "electrical" && layer.visible && !layer.locked,
  );
  if (!layer) throw new Error("Bitte die Elektrikebene einblenden und entsperren.");
  const id = newId();
  const prefix =
    kind === "controls"
      ? "SG"
      : kind === "transformers"
        ? "TR"
        : kind === "switches"
          ? "S"
          : kind === "meters"
            ? "Z"
            : kind === "supplies"
              ? "NETZ"
              : kind === "outlets"
                ? "SD"
                : kind === "devices"
                  ? "VG"
                  : kind === "junctions"
                    ? "AD"
                    : "UV";
  let number = 1;
  const labels = new Set(Object.values(project.electrical[kind]).map((item) => item.label));
  while (labels.has(`${prefix}-${String(number).padStart(2, "0")}`)) number++;
  const base = {
    id,
    floorId,
    layerId: layer.id,
    position: { ...position },
    roomId: null,
    label: `${prefix}-${String(number).padStart(2, "0")}`,
    labelMode: "label" as const,
    metadata: {},
  };
  if (kind === "outlets")
    project.electrical.outlets[id] = {
      ...base,
      name: "Steckdose",
      number: String(number),
      wallId: null,
      circuitId: null,
      socketType: "Unbekannt",
      ratedVoltage: null,
      ratedCurrent: null,
      phases: 1,
    };
  if (kind === "devices")
    project.electrical.devices[id] = {
      switchId: null,
      controlId: null,
      transformerId: null,
      ...base,
      name: "Verbraucher",
      type: "other",
      furnitureId: null,
      connectionPointId: null,
      circuitId: null,
      ratedVoltage: null,
      ratedCurrent: null,
      ratedPower: null,
      powerFactor: null,
      phases: 1,
      operatingMode: "off",
    };
  if (kind === "distributionBoards")
    project.electrical.distributionBoards[id] = {
      ...base,
      name: "Sicherungskasten",
      upstreamCircuitId: null,
      supplyId: null,
      meterId: null,
    };
  if (kind === "meters")
    project.electrical.meters[id] = {
      ...base,
      name: "Stromzähler",
      supplyId: null,
      serialNumber: "",
      readingKWh: null,
    };
  if (kind === "supplies")
    project.electrical.supplies[id] = {
      ...base,
      name: "Stromeinspeisung",
      phaseNeutralVoltage: null,
      phasePhaseVoltage: null,
      phases: 3,
      ratedCurrent: null,
    };
  if (kind === "junctions")
    project.electrical.junctions[id] = { ...base, name: "Abzweigdose", type: "junctionBox" };
  if (kind === "switches")
    project.electrical.switches[id] = {
      ...base,
      name: "Lichtschalter",
      supply: { kind: "circuit" },
      type: "singlePole",
      circuitId: null,
      wallId: null,
      closed: true,
    };
  if (kind === "controls")
    project.electrical.controls[id] = {
      ...base,
      name: "Schaltung / Relais",
      mode: "changeover",
      circuitId: null,
      switchIds: [],
      initialOn: false,
      inverted: false,
    };
  if (kind === "transformers")
    project.electrical.transformers[id] = {
      ...base,
      name: "Klingeltransformator",
      circuitId: null,
      primaryVoltage: 230,
      secondaryVoltage: 8,
      ratedVA: 8,
    };
  syncElectricalRelations(project);
  return id;
}

/** Räumliche Zuordnungen erzeugen niemals eine elektrische Verbindung. */
export function syncElectricalRelations(project: Project): void {
  for (const kind of [
    "outlets",
    "devices",
    "distributionBoards",
    "junctions",
    "supplies",
    "meters",
    "switches",
    "controls",
    "transformers",
  ] as const)
    for (const item of Object.values(project.electrical[kind])) {
      const rooms = Object.values(project.rooms).filter(
        (room) =>
          room.floorId === item.floorId &&
          pointInPolygon(
            item.position,
            room.polygon.pointIds.flatMap((id) => (project.points[id] ? [project.points[id]!.position] : [])),
          ),
      );
      item.roomId = rooms.length === 1 ? rooms[0]!.id : null;
    }
  for (const item of [
    ...Object.values(project.electrical.outlets),
    ...Object.values(project.electrical.switches),
  ]) {
    let closest: { id: string; distance: number } | null = null;
    for (const wall of Object.values(project.walls)) {
      const a = project.points[wall.startPointId],
        b = project.points[wall.endPointId];
      if (wall.floorId !== item.floorId || !a || !b) continue;
      const d = projectToSegment(item.position, a.position, b.position).distance;
      if (d <= wall.thickness / 2 + 1 && (!closest || d < closest.distance))
        closest = { id: wall.id, distance: d };
    }
    item.wallId = closest?.id ?? null;
  }
}

export function deleteCircuit(project: Project, id: string): void {
  for (const cable of Object.values(project.electrical.cables))
    cable.conductorConnections = cable.conductorConnections.filter(
      (pair) => !pair.startContactId.startsWith(`${id}:`) && !pair.endContactId.startsWith(`${id}:`),
    );
  for (const board of Object.values(project.electrical.distributionBoards))
    if (board.upstreamCircuitId === id) board.upstreamCircuitId = null;
  delete project.electrical.circuits[id];
  for (const item of [
    ...Object.values(project.electrical.outlets),
    ...Object.values(project.electrical.devices),
    ...Object.values(project.electrical.cables),
    ...Object.values(project.electrical.controls),
    ...Object.values(project.electrical.transformers),
    ...Object.values(project.electrical.switches),
  ])
    if (item.circuitId === id) item.circuitId = null;
  for (const device of Object.values(project.electrical.devices))
    if (!device.circuitId) {
      device.switchId = null;
      device.controlId = null;
      device.transformerId = null;
      device.transformerVoltage = null;
    }
  for (const cable of Object.values(project.electrical.cables))
    if (cable.connectionAssignment === "switch" && !cable.circuitId) cable.connectionAssignment = "none";
  for (const group of Object.values(project.electrical.controls)) if (!group.circuitId) group.switchIds = [];
  for (const item of Object.values(project.electrical.switches))
    if (!item.circuitId) item.supply = { kind: "disconnected" };
}

/** Nur explizites Löschen löst Beziehungen; Import validiert ungültige IDs als Fehler. */
export function detachDeletedElectricalReferences(project: Project): void {
  for (const item of Object.values(project.electrical.switches))
    if (item.supply.kind === "switch" && !project.electrical.switches[item.supply.switchId])
      item.supply = { kind: "disconnected" };
  for (const group of Object.values(project.electrical.controls))
    if (group.switchIds.some((id) => !project.electrical.switches[id])) group.switchIds = [];
  for (const board of Object.values(project.electrical.distributionBoards))
    if (board.meterId && !project.electrical.meters[board.meterId]) board.meterId = null;
  for (const meter of Object.values(project.electrical.meters))
    if (meter.supplyId && !project.electrical.supplies[meter.supplyId]) meter.supplyId = null;
  for (const board of Object.values(project.electrical.distributionBoards))
    if (board.supplyId && !project.electrical.supplies[board.supplyId]) board.supplyId = null;
  for (const transformer of Object.values(project.electrical.transformers))
    if (
      transformer.distributionBoardId &&
      !project.electrical.distributionBoards[transformer.distributionBoardId]
    )
      transformer.distributionBoardId = null;
  const nodes = electricalNodes(project);
  for (const cable of Object.values(project.electrical.cables))
    if (!nodes[cable.startNodeId] || !nodes[cable.endNodeId]) delete project.electrical.cables[cable.id];
  for (const circuit of Object.values(project.electrical.circuits))
    if (!project.electrical.distributionBoards[circuit.distributionBoardId])
      deleteCircuit(project, circuit.id);
  for (const protection of Object.values(project.electrical.protectionDevices))
    if (!project.electrical.distributionBoards[protection.distributionBoardId])
      delete project.electrical.protectionDevices[protection.id];
  for (const device of Object.values(project.electrical.devices)) {
    if (device.switchId && !project.electrical.switches[device.switchId]) device.switchId = null;
    if (
      (device.controlId && !project.electrical.controls[device.controlId]) ||
      (device.transformerId && !project.electrical.transformers[device.transformerId])
    ) {
      device.controlId = null;
      device.transformerId = null;
      device.transformerVoltage = null;
      device.circuitId = null;
      device.switchId = null;
    }
    if (device.connectionPointId && !project.electrical.outlets[device.connectionPointId])
      device.connectionPointId = null;
    if (device.furnitureId && !project.furniture[device.furnitureId]) device.furnitureId = null;
  }
}
