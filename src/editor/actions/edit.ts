import { site } from "../../site/model";
import { deleteNetworkNodes } from "../../network/model";
import { housebook, setHousebook } from "../../housebook/model";
import { utilities, pipeFloorPath } from "../../utilities/model";
import { newId } from "../../utils/uuid";
import { cablePath } from "../../electrical/cables";
import { elementTables } from "../../core/elementTables";
import { detachDeletedElectricalReferences } from "../../electrical/actions";
import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { getRoomMeasurements } from "../../core/selectors";
import { resizeWallEndpoints } from "../../geometry/wallGeometry";
import { add, dot, multiply, subtract } from "../../geometry/vector";
import { distance } from "../../geometry/distance";

export function selectedPointIds(project: Project, selection: Selection[]): Set<UUID> {
  const result = new Set<UUID>();
  for (const selected of selection) {
    if (selected.kind === "walls") {
      const wall = project.walls[selected.id];
      if (wall) {
        result.add(wall.startPointId);
        result.add(wall.endPointId);
      }
    }
    if (selected.kind === "rooms")
      project.rooms[selected.id]?.polygon.pointIds.forEach((id) => result.add(id));
  }
  return result;
}

export function movePoint(project: Project, pointId: UUID, delta: Vec2): void {
  const point = project.points[pointId];
  if (!point) throw new Error("Wandpunkt fehlt.");
  point.position = add(point.position, delta);
}

export function moveSelection(project: Project, selection: Selection[], delta: Vec2): void {
  if (delta.x === 0 && delta.y === 0) return;
  for (const s of selection.filter((s) => s.kind === "siteElements")) {
    const e = site(project).elements[s.id]!;
    e.vertices = e.vertices.map((p) => add(p, delta));
  }
  const networkIds = new Set(selection.filter((s) => s.kind === "networkNodes").map((s) => s.id));
  if (networkIds.size) {
    const book = housebook(project);
    for (const node of book.networkNodes)
      if (networkIds.has(node.id)) node.position = add(node.position, delta);
    setHousebook(project, book);
  }
  for (const selected of selection.filter((item) => item.kind === "cables")) {
    const cable = project.electrical.cables[selected.id]!;
    if (cable.riser) {
      cable.riser = add(cable.riser, delta);
      cable.path = cable.path.map((p) => add(p, delta));
      cable.endPath = cable.endPath.map((p) => add(p, delta));
      continue;
    }
    if (cable.path.length) cable.path = cable.path.map((p) => add(p, delta));
    else if (
      !selection.some((item) => item.id === cable.startNodeId) ||
      !selection.some((item) => item.id === cable.endNodeId)
    ) {
      const path = cablePath(project, cable);
      cable.path = [add(multiply(add(path[0]!, path.at(-1)!), 0.5), delta)];
    }
  }
  const net = utilities(project);
  for (const selected of selection) {
    if (selected.kind === "utilityPipes") {
      const pipe = net.pipes[selected.id]!;
      if (pipe.riser) pipe.riser = add(pipe.riser, delta);
      if (
        !pipe.path.length &&
        !pipe.riser &&
        !(selection.some((s) => s.id === pipe.from) && selection.some((s) => s.id === pipe.to))
      ) {
        const ps = pipeFloorPath(project, pipe, pipe.floorId);
        pipe.path = [multiply(add(ps[0]!, ps.at(-1)!), 0.5)];
      }
      pipe.path = pipe.path.map((p) => add(p, delta));
    }
    if (selected.kind === "utilityNodes") {
      const node = net.nodes[selected.id]!;
      node.position = add(node.position, delta);
    }
  }
  const points = selectedPointIds(project, selection);
  for (const id of points) project.points[id]!.position = add(project.points[id]!.position, delta);
  for (const selected of selection) {
    if (
      selected.kind === "outlets" ||
      selected.kind === "devices" ||
      selected.kind === "distributionBoards" ||
      selected.kind === "supplies" ||
      selected.kind === "meters" ||
      selected.kind === "switches" ||
      selected.kind === "controls" ||
      selected.kind === "transformers" ||
      selected.kind === "junctions"
    ) {
      const item = project.electrical[selected.kind][selected.id]!;
      item.position = add(item.position, delta);
    }
    if (selected.kind === "furniture") {
      const item = project.furniture[selected.id]!;
      item.position = add(item.position, delta);
    }
    if (selected.kind === "doors" || selected.kind === "windows") {
      const opening = project[selected.kind][selected.id]!;
      const wall = project.walls[opening.wallId]!;
      if (points.has(wall.startPointId) && points.has(wall.endPointId)) continue;
      const start = project.points[wall.startPointId]!.position;
      const end = project.points[wall.endPointId]!.position;
      opening.position += dot(delta, multiply(subtract(end, start), 1 / distance(start, end)));
    }
    if (selected.kind === "dimensions") {
      const dimension = project.dimensions[selected.id]!;
      const a =
        dimension.start.kind === "point"
          ? project.points[dimension.start.pointId]!.position
          : dimension.start.position;
      const b =
        dimension.end.kind === "point"
          ? project.points[dimension.end.pointId]!.position
          : dimension.end.position;
      if (dimension.start.kind === "position" && dimension.end.kind === "position") {
        dimension.start.position = add(a, delta);
        dimension.end.position = add(b, delta);
      } else if (distance(a, b) > 0) {
        const unit = multiply(subtract(b, a), 1 / distance(a, b));
        dimension.offset +=
          dimension.mode === "horizontal"
            ? delta.y
            : dimension.mode === "vertical"
              ? delta.x
              : dot(delta, { x: -unit.y, y: unit.x });
      }
    }
  }
}

export function resizeWall(project: Project, wallId: UUID, length: number, fixed: "start" | "end"): void {
  const wall = project.walls[wallId]!;
  const start = project.points[wall.startPointId]!;
  const end = project.points[wall.endPointId]!;
  const next = resizeWallEndpoints(start.position, end.position, length, fixed);
  start.position = next.start;
  end.position = next.end;
}

export function resizeRoom(project: Project, roomId: UUID, length: number, width: number): void {
  if (length < 1 || width < 1) throw new Error("Raummaße müssen mindestens 1 mm betragen.");
  const room = project.rooms[roomId]!;
  const measurements = getRoomMeasurements(project, roomId);
  if (!measurements.rectangleDimensions)
    throw new Error("Länge und Breite können nur für rechteckige Räume gemeinsam geändert werden.");
  const origin = measurements.polygon[0]!;
  const first = subtract(measurements.polygon[1]!, origin);
  const unit = multiply(first, 1 / distance(origin, measurements.polygon[1]!));
  const normal = { x: -unit.y, y: unit.x };
  const xValues = measurements.polygon.map((p) => dot(subtract(p, origin), unit));
  const yValues = measurements.polygon.map((p) => dot(subtract(p, origin), normal));
  const extentX = Math.max(...xValues) - Math.min(...xValues);
  const extentY = Math.max(...yValues) - Math.min(...yValues);
  const sx = (extentX >= extentY ? length : width) / extentX;
  const sy = (extentX >= extentY ? width : length) / extentY;
  for (const id of room.polygon.pointIds) {
    const relative = subtract(project.points[id]!.position, origin);
    project.points[id]!.position = add(
      origin,
      add(multiply(unit, dot(relative, unit) * sx), multiply(normal, dot(relative, normal) * sy)),
    );
  }
}

/** Räume werden mit exklusiven Wänden gelöscht; gemeinsame Wände bleiben erhalten. */
export function deleteSelection(project: Project, selection: Selection[]): void {
  deleteNetworkNodes(project, new Set(selection.filter((s) => s.kind === "networkNodes").map((s) => s.id)));
  const wallIds = new Set(selection.filter((s) => s.kind === "walls").map((s) => s.id));
  const roomIds = new Set(selection.filter((s) => s.kind === "rooms").map((s) => s.id));
  for (const roomId of roomIds)
    for (const wallId of project.rooms[roomId]?.wallIds ?? []) {
      if (!Object.values(project.rooms).some((r) => !roomIds.has(r.id) && r.wallIds.includes(wallId)))
        wallIds.add(wallId);
    }
  for (const room of Object.values(project.rooms))
    if (room.wallIds.some((id) => wallIds.has(id))) roomIds.add(room.id);
  for (const id of wallIds) delete project.walls[id];
  for (const id of roomIds) delete project.rooms[id];
  for (const selectionItem of selection) delete elementTables(project)[selectionItem.kind][selectionItem.id];
  const net = utilities(project);
  for (const pipe of Object.values(net.pipes))
    if (!net.nodes[pipe.from] || !net.nodes[pipe.to]) delete net.pipes[pipe.id];
  detachDeletedElectricalReferences(project);
  for (const table of [project.doors, project.windows])
    for (const opening of Object.values(table)) {
      if (!project.walls[opening.wallId]) delete table[opening.id];
    }
  const retained = new Set(
    Object.values(project.walls).flatMap((wall) => [wall.startPointId, wall.endPointId]),
  );
  for (const point of Object.values(project.points))
    if (!retained.has(point.id)) delete project.points[point.id];
  for (const dimension of Object.values(project.dimensions)) {
    if (
      [dimension.start, dimension.end].some(
        (anchor) => anchor.kind === "point" && !project.points[anchor.pointId],
      )
    )
      delete project.dimensions[dimension.id];
  }
}

export function duplicateSelection(
  project: Project,
  selection: Selection[],
  delta: Vec2 = { x: 500, y: -500 },
): Selection[] {
  const wallIds = new Set(selection.filter((s) => s.kind === "walls").map((s) => s.id));
  const roomIds = selection.filter((s) => s.kind === "rooms").map((s) => s.id);
  roomIds.forEach((id) => project.rooms[id]!.wallIds.forEach((wallId) => wallIds.add(wallId)));
  const pointMap = new Map<UUID, UUID>();
  const wallMap = new Map<UUID, UUID>();
  const output: Selection[] = [];
  for (const s of selection.filter((s) => s.kind === "siteElements")) {
    const original = site(project).elements[s.id]!,
      id = newId();
    site(project).elements[id] = {
      ...structuredClone(original),
      id,
      name: `${original.name} – Kopie`,
      vertices: original.vertices.map((p) => add(p, delta)),
    };
    output.push({ kind: "siteElements", id });
  }
  const book = housebook(project);
  for (const selected of selection.filter((s) => s.kind === "networkNodes")) {
    const original = book.networkNodes.find((n) => n.id === selected.id)!;
    if (original.zigbeeAddress)
      throw new Error("Zigbee-Geräte sind eindeutig. Ein weiteres Gerät aus der Z2M-Liste platzieren.");
    const id = newId();
    book.networkNodes.push({
      ...structuredClone(original),
      id,
      name: `${original.name} – Kopie`,
      position: add(original.position, delta),
    });
    output.push({ kind: "networkNodes", id });
  }
  if (selection.some((s) => s.kind === "networkNodes")) setHousebook(project, book);
  const net = utilities(project),
    utilityCopies = new Map<string, string>();
  for (const selected of selection.filter((s) => s.kind === "utilityNodes")) {
    const original = net.nodes[selected.id]!,
      id = newId();
    net.nodes[id] = {
      ...structuredClone(original),
      id,
      name: `${original.name} – Kopie`,
      position: add(original.position, delta),
    };
    utilityCopies.set(original.id, id);
    output.push({ kind: "utilityNodes", id });
  }
  for (const selected of selection.filter((s) => s.kind === "utilityPipes")) {
    const original = net.pipes[selected.id]!;
    if (!utilityCopies.has(original.from) || !utilityCopies.has(original.to))
      throw new Error("Zum Duplizieren einer Rohrleitung beide Anschlussobjekte mit auswählen.");
    const id = newId();
    net.pipes[id] = {
      ...structuredClone(original),
      id,
      name: `${original.name} – Kopie`,
      from: utilityCopies.get(original.from)!,
      to: utilityCopies.get(original.to)!,
      path: original.path.map((p) => add(p, delta)),
      riser: original.riser ? add(original.riser, delta) : null,
    };
    output.push({ kind: "utilityPipes", id });
  }
  for (const wallId of wallIds) {
    const wall = project.walls[wallId]!;
    for (const pointId of [wall.startPointId, wall.endPointId])
      if (!pointMap.has(pointId)) {
        const id = newId();
        pointMap.set(pointId, id);
        project.points[id] = {
          ...structuredClone(project.points[pointId]!),
          id,
          position: add(project.points[pointId]!.position, delta),
        };
      }
    const id = newId();
    wallMap.set(wallId, id);
    project.walls[id] = {
      ...structuredClone(wall),
      id,
      startPointId: pointMap.get(wall.startPointId)!,
      endPointId: pointMap.get(wall.endPointId)!,
    };
    if (selection.some((s) => s.kind === "walls" && s.id === wallId)) output.push({ kind: "walls", id });
  }
  for (const roomId of roomIds) {
    const room = project.rooms[roomId]!;
    const id = newId();
    project.rooms[id] = {
      ...structuredClone(room),
      id,
      name: `${room.name} – Kopie`,
      polygon: { pointIds: room.polygon.pointIds.map((p) => pointMap.get(p)!) },
      wallIds: room.wallIds.map((w) => wallMap.get(w)!),
    };
    output.push({ kind: "rooms", id });
  }
  for (const kind of ["doors", "windows"] as const)
    for (const opening of Object.values(project[kind])) {
      const selected = selection.some((s) => s.kind === kind && s.id === opening.id);
      if (!wallMap.has(opening.wallId) && !selected) continue;
      const id = newId();
      const copy = {
        ...structuredClone(opening),
        id,
        wallId: wallMap.get(opening.wallId) ?? opening.wallId,
        position: opening.position + (wallMap.has(opening.wallId) ? 0 : opening.width + 100),
      };
      // Die Tabellen behalten ihre konkreten Öffnungstypen.
      if ("openingDirection" in copy) project.doors[id] = copy;
      else if ("sillHeight" in copy) project.windows[id] = copy;
      if (selected) output.push({ kind, id });
    }
  for (const selected of selection.filter((s) => s.kind === "dimensions")) {
    const original = project.dimensions[selected.id]!;
    const id = newId();
    const copy = structuredClone(original);
    copy.id = id;
    for (const key of ["start", "end"] as const) {
      const anchor = copy[key];
      if (anchor.kind === "point" && pointMap.has(anchor.pointId))
        anchor.pointId = pointMap.get(anchor.pointId)!;
      else
        copy[key] = {
          kind: "position",
          position: add(
            anchor.kind === "point" ? project.points[anchor.pointId]!.position : anchor.position,
            delta,
          ),
        };
    }
    project.dimensions[id] = copy;
    output.push({ kind: "dimensions", id });
  }
  const furnitureCopies = new Map<string, string>();
  for (const selected of selection.filter((s) => s.kind === "furniture")) {
    const original = project.furniture[selected.id]!;
    const id = newId();
    project.furniture[id] = {
      ...structuredClone(original),
      id,
      name: `${original.name} - Kopie`,
      position: add(original.position, delta),
    };
    furnitureCopies.set(original.id, id);
    output.push({ kind: "furniture", id });
  }
  const nodeCopies = new Map<string, string>();
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
    for (const selected of selection.filter((s) => s.kind === kind)) {
      const original = project.electrical[kind][selected.id]!;
      const id = newId();
      let label = `${original.label}-K`;
      let number = 2;
      while (Object.values(project.electrical[kind]).some((item) => item.label === label))
        label = `${original.label}-K${number++}`;
      const copy = {
        ...structuredClone(original),
        id,
        name: `${original.name} - Kopie`,
        label,
        position: add(original.position, delta),
      };
      nodeCopies.set(original.id, id);
      if ("socketType" in copy) {
        project.electrical.outlets[id] = copy;
        nodeCopies.set(original.id, id);
      } else if ("connectionPointId" in copy) {
        copy.connectionPointId = copy.connectionPointId
          ? (nodeCopies.get(copy.connectionPointId) ?? copy.connectionPointId)
          : null;
        copy.furnitureId = copy.furnitureId
          ? (furnitureCopies.get(copy.furnitureId) ?? copy.furnitureId)
          : null;
        project.electrical.devices[id] = copy;
      } else if ("closed" in copy) project.electrical.switches[id] = copy;
      else if ("mode" in copy) project.electrical.controls[id] = copy;
      else if ("secondaryVoltage" in copy) project.electrical.transformers[id] = copy;
      else if ("type" in copy) project.electrical.junctions[id] = copy;
      else if ("phaseNeutralVoltage" in copy) project.electrical.supplies[id] = copy;
      else if ("serialNumber" in copy) project.electrical.meters[id] = copy;
      else project.electrical.distributionBoards[id] = copy;
      output.push({ kind, id });
    }
  for (const selected of selection.filter((s) => s.kind === "devices")) {
    const copy = project.electrical.devices[nodeCopies.get(selected.id)!]!;
    if (copy.switchId) copy.switchId = nodeCopies.get(copy.switchId) ?? copy.switchId;
    if (copy.controlId) copy.controlId = nodeCopies.get(copy.controlId) ?? copy.controlId;
    if (copy.transformerId) copy.transformerId = nodeCopies.get(copy.transformerId) ?? copy.transformerId;
  }
  for (const selected of selection.filter((s) => s.kind === "controls")) {
    const copy = project.electrical.controls[nodeCopies.get(selected.id)!]!;
    copy.switchIds = copy.switchIds.flatMap((id) => (nodeCopies.has(id) ? [nodeCopies.get(id)!] : []));
  }
  for (const selected of selection.filter((s) => s.kind === "switches")) {
    const copy = project.electrical.switches[nodeCopies.get(selected.id)!]!;
    if (copy.supply.kind === "switch")
      copy.supply.switchId = nodeCopies.get(copy.supply.switchId) ?? copy.supply.switchId;
  }
  for (const selected of selection.filter((s) => s.kind === "distributionBoards")) {
    const copy = project.electrical.distributionBoards[nodeCopies.get(selected.id)!]!;
    if (copy.supplyId) copy.supplyId = nodeCopies.get(copy.supplyId) ?? copy.supplyId;
    if (copy.meterId) copy.meterId = nodeCopies.get(copy.meterId) ?? copy.meterId;
  }
  for (const selected of selection.filter((s) => s.kind === "meters")) {
    const copy = project.electrical.meters[nodeCopies.get(selected.id)!]!;
    if (copy.supplyId) copy.supplyId = nodeCopies.get(copy.supplyId) ?? copy.supplyId;
  }
  for (const selected of selection.filter((s) => s.kind === "cables")) {
    const original = project.electrical.cables[selected.id]!;
    const id = newId();
    const points = cablePath(project, original);
    const bothCopied = nodeCopies.has(original.startNodeId) && nodeCopies.has(original.endNodeId);
    const path =
      original.riser || original.path.length || bothCopied
        ? original.path.map((p) => add(p, delta))
        : [add(multiply(add(points[0]!, points.at(-1)!), 0.5), delta)];
    project.electrical.cables[id] = {
      ...structuredClone(original),
      riser: original.riser ? add(original.riser, delta) : null,
      conductorConnections: original.conductorConnections.filter(
        (pair) =>
          !(
            nodeCopies.has(original.startNodeId) &&
            project.electrical.distributionBoards[original.startNodeId] &&
            pair.startContactId.includes(":")
          ) &&
          !(
            nodeCopies.has(original.endNodeId) &&
            project.electrical.distributionBoards[original.endNodeId] &&
            pair.endContactId.includes(":")
          ),
      ),
      endPath: original.endPath.map((p) => add(p, delta)),
      connectionAssignment:
        (nodeCopies.has(original.startNodeId) && project.electrical.devices[original.startNodeId]) ||
        (nodeCopies.has(original.endNodeId) && project.electrical.devices[original.endNodeId])
          ? original.connectionAssignment
          : "none",
      id,
      label: `${original.label}-K`,
      startNodeId: nodeCopies.get(original.startNodeId) ?? original.startNodeId,
      endNodeId: nodeCopies.get(original.endNodeId) ?? original.endNodeId,
      path,
    };
    output.push({ kind: "cables", id });
  }
  for (const selected of output) {
    const item =
      selected.kind === "furniture"
        ? project.furniture[selected.id]
        : selected.kind in project.electrical
          ? (
              project.electrical[selected.kind as keyof typeof project.electrical] as Record<
                string,
                { metadata: import("../../models/common").Metadata }
              >
            )[selected.id]
          : null;
    const record = item?.metadata.asset;
    if (record && typeof record === "object" && !Array.isArray(record)) {
      const mounting = record.mounting;
      if (
        mounting &&
        typeof mounting === "object" &&
        !Array.isArray(mounting) &&
        typeof mounting.wallId === "string"
      ) {
        if (wallMap.has(mounting.wallId)) mounting.wallId = wallMap.get(mounting.wallId)!;
        else record.mounting = null;
      }
      record.homeAssistantEntity = "";
    }
  }
  return output;
}
