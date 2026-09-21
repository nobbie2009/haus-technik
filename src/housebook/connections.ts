import type { Project } from "../models/project";
import type { Selection } from "../editor/types";
import { elementKinds, elementTables } from "../core/elementTables";
import { buildSupplyGraph } from "../simulation/graph";
import { housebook } from "./model";
import { utilities, type Medium } from "../utilities/model";
import { pointInPolygon } from "../geometry/dimensions";

export function connectionObjects(p: Project) {
  const tables = elementTables(p);
  const rows = elementKinds.flatMap((kind) =>
    Object.values(tables[kind]).map((item) => ({
      id: item.id,
      name: "name" in item ? String(item.name) : kind,
      floor: [
        p.floors[item.floorId]?.name,
        "position" in item
          ? Object.values(p.rooms)
              .filter(
                (room) =>
                  room.floorId === item.floorId &&
                  pointInPolygon(
                    item.position,
                    room.polygon.pointIds.map((id) => p.points[id]!.position),
                  ),
              )
              .map((room) => room.name)
              .join(", ")
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
      target: { kind, id: item.id } as Selection,
    })),
  );
  for (const kind of ["circuits", "protectionDevices"] as const)
    for (const item of Object.values(p.electrical[kind])) {
      const board = p.electrical.distributionBoards[item.distributionBoardId];
      rows.push({
        id: item.id,
        name: `${item.label} · ${item.name}`,
        floor: board ? (p.floors[board.floorId]?.name ?? "") : "",
        target: { kind: "distributionBoards", id: item.distributionBoardId },
      });
    }
  return rows;
}
function reachable(starts: string[], edges: { from: string; to: string }[], blocked = new Set<string>()) {
  const seen = new Set<string>(),
    queue = [...starts];
  const neighbors = new Map<string, string[]>();
  for (const edge of edges) {
    neighbors.set(edge.from, [...(neighbors.get(edge.from) ?? []), edge.to]);
    neighbors.set(edge.to, [...(neighbors.get(edge.to) ?? []), edge.from]);
  }
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id) || blocked.has(id)) continue;
    seen.add(id);
    queue.push(...(neighbors.get(id) ?? []));
  }
  return seen;
}
/** Documentation only; electrical parent assignments and pipe topology are not live measurements. */
export function connections(p: Project, id: string, mode: "trace" | "shutdown", medium: Medium = "cold") {
  const graph = buildSupplyGraph(p),
    net = utilities(p),
    book = housebook(p);
  let ids = new Set<string>(),
    note = "";
  if (graph.nodes[id]) {
    ids.add(id);
    if (mode === "trace") {
      let current: (typeof graph.nodes)[string] | undefined = graph.nodes[id];
      while (current?.parentId && !ids.has(current.parentId)) {
        ids.add(current.parentId);
        current = graph.nodes[current.parentId];
      }
      note = "Versorgungsweg anhand der eingetragenen Zuordnungen bis zur Einspeisung.";
    } else {
      const queue = [id];
      while (queue.length) {
        const parent = queue.shift()!;
        for (const edge of graph.edges.filter((e) => e.from === parent)) {
          if (!ids.has(edge.to)) {
            ids.add(edge.to);
            queue.push(edge.to);
          }
        }
      }
      note =
        "Nachgeordnete Objekte laut Versorgungszuordnung. Tatsächliche Schaltzustände und Ersatzversorgungen vor Ort prüfen.";
    }
    const cables = Object.values(p.electrical.cables);
    const physicalId = (key: string) =>
      p.electrical.circuits[key]?.distributionBoardId ??
      p.electrical.protectionDevices[key]?.distributionBoardId ??
      key;
    // Resolve documented routes through junctions without including unrelated branches.
    for (const edge of graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to))) {
      const start = physicalId(edge.from),
        end = physicalId(edge.to);
      const previous = new Map<string, { node: string; cable: string }>(),
        queue = [start],
        seen = new Set([start]);
      while (queue.length && !seen.has(end)) {
        const current = queue.shift()!;
        for (const cable of cables.filter((c) => c.startNodeId === current || c.endNodeId === current)) {
          const next = cable.startNodeId === current ? cable.endNodeId : cable.startNodeId;
          if (!seen.has(next)) {
            seen.add(next);
            previous.set(next, { node: current, cable: cable.id });
            queue.push(next);
          }
        }
      }
      if (seen.has(end)) {
        let current = end;
        while (current !== start) {
          const link = previous.get(current)!;
          ids.add(current);
          ids.add(link.node);
          ids.add(link.cable);
          current = link.node;
        }
      }
    }
    for (const cable of cables) if (ids.has(cable.startNodeId) && ids.has(cable.endNodeId)) ids.add(cable.id);
  } else if (net.nodes[id]) {
    const edges = Object.values(net.pipes).filter((pipe) => pipe.medium === medium);
    if (mode === "trace") {
      ids = reachable([id], edges);
      note = "Zusammenhängendes Rohrnetz des gewählten Mediums; keine Fließrichtungsberechnung.";
    } else {
      const sources = Object.values(net.nodes)
        .filter((n) => n.kind === "source" && n.media.includes(medium))
        .map((n) => n.id);
      const closed = new Set(
        Object.values(net.nodes)
          .filter((n) => n.closed)
          .map((n) => n.id),
      );
      const before = reachable(sources, edges, closed);
      const after = reachable(sources, edges, new Set([...closed, id]));
      ids = new Set([...before].filter((key) => !after.has(key)));
      note = sources.length
        ? "Neu von allen dokumentierten Hausanschlüssen getrennte Objekte. Alternative Rohrwege werden berücksichtigt; keine Druck- oder Durchflussberechnung."
        : "Kein Hausanschluss für dieses Medium erfasst: Abschaltwirkung nicht bestimmbar.";
    }
    for (const pipe of edges) if (ids.has(pipe.from) && ids.has(pipe.to)) ids.add(pipe.id);
  } else if (book.networkNodes.some((n) => n.id === id)) {
    ids = reachable([id], book.networkLinks);
    note =
      "Dokumentiertes Kabelnetz einschließlich Netzwerk-/SAT-Verbindungen. Die Verbindungen haben keine zuverlässige Versorgungsrichtung; eine Abschaltwirkung wird nicht behauptet.";
    if (mode === "shutdown") ids.clear();
  } else note = "Für dieses Objekt ist keine verfolgbare Versorgungszuordnung vorhanden.";
  return { ids: [...ids], note };
}
