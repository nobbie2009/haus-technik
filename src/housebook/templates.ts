import { utilities, ensureUtilities, utilityLayer } from "../utilities/model";
import { pointInPolygon } from "../geometry/dimensions";
import { newId } from "../utils/uuid";
import type { Project } from "../models/project";
import type { Selection } from "../editor/types";
import { duplicateSelection } from "../editor/actions/edit";
import { elementTables, elementKinds } from "../core/elementTables";
import { electricalPlacementKinds } from "../electrical/models";
import { addElectrical } from "../electrical/actions";
import { protectionChain } from "../electrical/supply";
import { parseProject } from "../core/validation";
import { housebook, setHousebook, asset, setAsset } from "./model";
export function saveRoomTemplate(project: Project, roomId: string, name: string) {
  if (!project.rooms[roomId]) throw new Error("Raum fehlt.");
  const snapshot = structuredClone(project);
  delete snapshot.metadata.housebook;
  const book = housebook(project);
  book.templates.push({ id: newId(), name, roomId, project: JSON.stringify(snapshot) });
  setHousebook(project, book);
}
export function insertRoomTemplate(
  project: Project,
  templateId: string,
  floorId: string,
  x: number,
  y: number,
): Selection {
  const template = housebook(project).templates.find((t) => t.id === templateId);
  if (!template) throw new Error("Vorlage fehlt.");
  const source = parseProject(JSON.parse(template.project)),
    room = source.rooms[template.roomId];
  if (!room) throw new Error("Vorlagenraum fehlt.");
  const selection: Selection[] = [{ kind: "rooms", id: room.id }];
  for (const item of Object.values(source.furniture))
    if (item.roomId === room.id) selection.push({ kind: "furniture", id: item.id });
  for (const kind of electricalPlacementKinds)
    for (const item of Object.values(source.electrical[kind]))
      if (item.roomId === room.id) selection.push({ kind, id: item.id });
  const polygon = room.polygon.pointIds.map((id) => source.points[id]!.position);
  for (const node of Object.values(utilities(source).nodes))
    if (node.floorId === room.floorId && pointInPolygon(node.position, polygon))
      selection.push({ kind: "utilityNodes", id: node.id });
  const selectedIds = new Set(selection.map((s) => s.id));
  for (const cable of Object.values(source.electrical.cables))
    if (selectedIds.has(cable.startNodeId) && selectedIds.has(cable.endNodeId))
      selection.push({ kind: "cables", id: cable.id });
  for (const pipe of Object.values(utilities(source).pipes))
    if (selectedIds.has(pipe.from) && selectedIds.has(pipe.to))
      selection.push({ kind: "utilityPipes", id: pipe.id });
  const original = new Set([
    ...Object.values(source.points).map((p) => p.id),
    ...Object.values(elementTables(source)).flatMap((t) => Object.keys(t)),
  ]);
  const first = source.points[room.polygon.pointIds[0]!]!.position;
  const copies = duplicateSelection(source, selection, { x: x - first.x, y: y - first.y });
  const created = new Set(
    Object.values(elementTables(source))
      .flatMap((t) => Object.keys(t))
      .filter((id) => !original.has(id)),
  );
  const boardMap = new Map<string, string>();
  const originalBoards = selection.filter((s) => s.kind === "distributionBoards"),
    copiedBoards = copies.filter((s) => s.kind === "distributionBoards");
  originalBoards.forEach((s, i) => {
    if (copiedBoards[i]) boardMap.set(s.id, copiedBoards[i]!.id);
  });
  const circuitMap = new Map<string, string>(),
    protectionMap = new Map<string, string>();
  const circuitIds = new Set(
    selection.flatMap((s) => {
      const item = elementTables(source)[s.kind][s.id]!;
      return "circuitId" in item && item.circuitId ? [item.circuitId] : [];
    }),
  );
  for (const selected of selection.filter((s) => s.kind === "cables")) {
    for (const pair of source.electrical.cables[selected.id]!.conductorConnections) {
      for (const pin of [pair.startContactId, pair.endContactId]) {
        const circuitId = pin.split(":")[0]!;
        if (source.electrical.circuits[circuitId]) circuitIds.add(circuitId);
      }
    }
  }
  for (const oldId of circuitIds) {
    const circuit = source.electrical.circuits[oldId]!;
    let boardId = boardMap.get(circuit.distributionBoardId);
    if (!boardId) {
      boardId = addElectrical(project, floorId, { x, y }, "distributionBoards");
      project.electrical.distributionBoards[boardId]!.name = `${template.name} · Versorgung zuordnen`;
      setAsset(project.electrical.distributionBoards[boardId]!, {
        ...asset(project.electrical.distributionBoards[boardId]!),
        status: "planned",
      });
      boardMap.set(circuit.distributionBoardId, boardId);
    }
    const chain = protectionChain(source, circuit.protectionDeviceId);
    for (const protection of chain)
      if (!protectionMap.has(protection.id)) protectionMap.set(protection.id, newId());
    for (const protection of chain) {
      const id = protectionMap.get(protection.id)!;
      project.electrical.protectionDevices[id] = {
        ...structuredClone(protection),
        id,
        distributionBoardId: boardId,
        upstreamProtectionDeviceId: protection.upstreamProtectionDeviceId
          ? protectionMap.get(protection.upstreamProtectionDeviceId)!
          : null,
      };
    }
    const id = newId();
    circuitMap.set(oldId, id);
    project.electrical.circuits[id] = {
      ...structuredClone(circuit),
      id,
      distributionBoardId: boardId,
      protectionDeviceId: circuit.protectionDeviceId ? protectionMap.get(circuit.protectionDeviceId)! : null,
    };
  }
  for (const item of Object.values(source.points))
    if (!original.has(item.id)) project.points[item.id] = { ...item, floorId };
  for (const kind of elementKinds)
    for (const item of Object.values(elementTables(source)[kind]))
      if (created.has(item.id)) {
        item.floorId = floorId;
        const layerKind = source.layers[item.layerId]!.kind;
        if (kind === "utilityNodes" || kind === "utilityPipes") {
          ensureUtilities(project);
          utilityLayer(project, "medium" in item ? item.medium : "media" in item ? item.media[0]! : "cold");
        }
        const layer = Object.values(project.layers).find((l) => l.kind === layerKind);
        if (!layer) throw new Error("Zielebene fehlt.");
        item.layerId = layer.id;
        if ("circuitId" in item && item.circuitId) item.circuitId = circuitMap.get(item.circuitId) ?? null;
        if ("connectionPointId" in item && item.connectionPointId && !created.has(item.connectionPointId))
          item.connectionPointId = null;
        if ("switchId" in item && item.switchId && !created.has(item.switchId)) item.switchId = null;
        if ("controlId" in item && item.controlId && !created.has(item.controlId)) item.controlId = null;
        if ("transformerId" in item && item.transformerId && !created.has(item.transformerId))
          item.transformerId = null;
        if ("furnitureId" in item && item.furnitureId && !created.has(item.furnitureId))
          item.furnitureId = null;
        if (("socketType" in item || "closed" in item) && item.wallId && !created.has(item.wallId))
          item.wallId = null;
        if ("supply" in item && item.supply.kind === "switch" && !created.has(item.supply.switchId))
          item.supply = { kind: "disconnected" };
        if ("upstreamCircuitId" in item) {
          item.upstreamCircuitId = null;
          item.supplyId = null;
          item.meterId = null;
        }
        if ("serialNumber" in item) item.supplyId = null;
        if ("connectionAssignment" in item) item.connectionAssignment = "none";
        const record = asset(item);
        record.status = "planned";
        record.homeAssistantEntity = "";
        if (record.mounting && !created.has(record.mounting.wallId)) record.mounting = null;
        setAsset(item, record);
        (elementTables(project)[kind] as Record<string, typeof item>)[item.id] = item;
      }
  const oldCables = selection.filter((s) => s.kind === "cables"),
    newCables = copies.filter((s) => s.kind === "cables");
  oldCables.forEach((old, index) => {
    const copy = newCables[index] ? project.electrical.cables[newCables[index]!.id] : null;
    if (!copy) return;
    const remap = (pin: string) => {
      const [circuitId, contact] = pin.split(":");
      return contact && circuitMap.has(circuitId!) ? `${circuitMap.get(circuitId!)}:${contact}` : pin;
    };
    copy.conductorConnections = source.electrical.cables[old.id]!.conductorConnections.map((pair) => ({
      startContactId: remap(pair.startContactId),
      endContactId: remap(pair.endContactId),
    }));
  });
  return copies.find((s) => s.kind === "rooms")!;
}
