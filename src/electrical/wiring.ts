import type { Project } from "../models/project";
import { electricalNodes } from "./cables";
import { contactsFor, connectionPair } from "./contacts";
import { deviceSymbolKind } from "../rendering/deviceAppearance";
import { transformerVoltage } from "./transformers";

/** Resolve documented phase paths. N/PE and crossing geometry never carry circuit assignments. */
export function resolveWiring(project: Project) {
  const e = project.electrical,
    nodes = electricalNodes(project);
  const edges = new Map<string, { node: string; here: string; there: string }[]>();
  const roots = new Map<string, Set<string>>();
  const addRoot = (id: string, circuit: string) => {
    if (!e.circuits[circuit]) return;
    const set = roots.get(id) ?? new Set<string>();
    set.add(circuit);
    roots.set(id, set);
  };
  const wired = new Set<string>();
  for (const c of Object.values(e.cables)) {
    wired.add(c.startNodeId);
    wired.add(c.endNodeId);
    for (const row of c.conductorConnections) {
      if (
        contactsFor(project, c.startNodeId).find((p) => p.id === row.startContactId)?.role !== "line" ||
        contactsFor(project, c.endNodeId).find((p) => p.id === row.endContactId)?.role !== "line"
      )
        continue;
      for (const [a, b, pin, other] of [
        [c.startNodeId, c.endNodeId, row.startContactId, row.endContactId],
        [c.endNodeId, c.startNodeId, row.endContactId, row.startContactId],
      ]) {
        if (e.distributionBoards[a!]) {
          if (pin!.includes(":")) addRoot(b!, pin!.split(":")[0]!);
          continue;
        }
        if (e.distributionBoards[b!] || e.supplies[b!] || e.meters[b!]) continue;
        const list = edges.get(a!) ?? [];
        list.push({ node: b!, here: pin!, there: other! });
        edges.set(a!, list);
      }
    }
  }
  const circuits = new Map<string, string | null>();
  const supplied = new Set<string>();
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const start of wired) {
    if (seen.has(start) || e.distributionBoards[start] || e.supplies[start] || e.meters[start]) continue;
    const queue = [start],
      members: string[] = [],
      explicit = new Set<string>(),
      fallback = new Set<string>();
    while (queue.length) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      members.push(id);
      for (const root of roots.get(id) ?? []) explicit.add(root);
      const item = e.switches[id] ?? e.outlets[id] ?? e.transformers[id];
      if (item?.circuitId && item.metadata.wiringManaged !== true) fallback.add(item.circuitId);
      if (
        typeof item?.metadata.wiringSourceCircuit === "string" &&
        e.circuits[item.metadata.wiringSourceCircuit]
      )
        fallback.add(item.metadata.wiringSourceCircuit);
      for (const edge of edges.get(id) ?? []) if (!seen.has(edge.node)) queue.push(edge.node);
    }
    const candidates = explicit.size ? explicit : fallback;
    const circuit = candidates.size === 1 ? [...candidates][0]! : null;
    if (candidates.size > 1)
      issues.push(
        `${members
          .map((id) => nodes[id]?.label)
          .filter(Boolean)
          .join(", ")}: Leitungen verbinden unterschiedliche Stromkreise. Abgang eindeutig wählen.`,
      );
    for (const id of members) {
      circuits.set(id, circuit);
      if (explicit.size) supplied.add(id);
    }
  }
  const switches = new Map<string, string | null>();
  const upstreamSwitches = new Map<string, string | null>();
  for (const sw of Object.values(e.switches)) {
    const visited = new Set<string>(),
      queue = [sw.id],
      gates = new Set<string>();
    while (queue.length) {
      const id = queue.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const edge of edges.get(id) ?? []) {
        if (id === sw.id && edge.here !== "L") continue;
        if (edge.node === sw.id) continue;
        if (e.switches[edge.node]) {
          if (edge.there === "L_OUT") gates.add(edge.node);
        } else if (e.junctions[edge.node] || e.outlets[edge.node]) queue.push(edge.node);
      }
    }
    if (gates.size > 1)
      issues.push(
        `${sw.label}: Mehrere vorgeschaltete Schalter. Schaltgruppe oder eindeutige Zuleitung erforderlich.`,
      );
    upstreamSwitches.set(sw.id, gates.size === 1 ? [...gates][0]! : null);
  }
  for (const device of Object.values(e.devices)) {
    if (!wired.has(device.id) || device.controlId || device.transformerId) continue;
    const visited = new Set<string>(),
      queue = [device.id],
      gates = new Set<string>();
    while (queue.length) {
      const id = queue.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const edge of edges.get(id) ?? []) {
        if (e.switches[edge.node]) {
          if (edge.there === "L_OUT") gates.add(edge.node);
        } else if (e.junctions[edge.node] || e.outlets[edge.node]) queue.push(edge.node);
      }
    }
    if (gates.size > 1) {
      circuits.set(device.id, null);
      issues.push(
        `${device.label}: Mehrere Lichtschalter führen zur Lampe. Eine Schaltgruppe oder einen eindeutigen Anschluss verwenden.`,
      );
    }
    switches.set(device.id, gates.size === 1 ? [...gates][0]! : null);
  }
  return { circuits, switches, wired, issues, supplied, upstreamSwitches };
}

/** One source of truth: cable-derived fields are updated together, including after deletion. */
export function syncWiring(project: Project, strict = false): string[] {
  const resolved = resolveWiring(project),
    e = project.electrical;
  if (strict && resolved.issues.length) throw new Error(resolved.issues.join(" "));
  for (const item of [
    ...Object.values(e.switches),
    ...Object.values(e.outlets),
    ...Object.values(e.transformers),
  ]) {
    if (!resolved.wired.has(item.id) && item.metadata.wiringManaged !== true) continue;
    if (resolved.supplied.has(item.id)) delete item.metadata.wiringSourceCircuit;
    else if (item.metadata.wiringManaged !== true && item.circuitId)
      item.metadata.wiringSourceCircuit = item.circuitId;
    item.circuitId = resolved.circuits.has(item.id)
      ? resolved.circuits.get(item.id)!
      : typeof item.metadata.wiringSourceCircuit === "string" && e.circuits[item.metadata.wiringSourceCircuit]
        ? item.metadata.wiringSourceCircuit
        : null;
    item.metadata.wiringManaged = true;
    if (e.switches[item.id]) {
      const upstream = resolved.upstreamSwitches.get(item.id);
      e.switches[item.id]!.supply = upstream
        ? { kind: "switch", switchId: upstream }
        : item.circuitId
          ? { kind: "circuit" }
          : { kind: "disconnected" };
    }
  }
  for (const device of Object.values(e.devices)) {
    if (device.controlId || device.transformerId) continue;
    if (!resolved.wired.has(device.id) && device.metadata.wiringManaged !== true) continue;
    const circuit = resolved.circuits.get(device.id) ?? null;
    device.switchId = circuit ? (resolved.switches.get(device.id) ?? null) : null;
    device.connectionPointId = null;
    device.circuitId = circuit;
    device.metadata.wiringManaged = true;
    const outletCable = Object.values(e.cables).find((c) => {
      const pair = connectionPair(project, c.startNodeId, c.endNodeId);
      return (
        pair?.device.id === device.id &&
        pair.kind === "outlet" &&
        (device.phases === 3 ? ["L1", "L2", "L3"] : ["L", "N"]).every((pin) =>
          c.conductorConnections.some((r) => r.startContactId === pin && r.endContactId === pin),
        )
      );
    });
    if (outletCable && !device.switchId) {
      device.connectionPointId =
        outletCable.startNodeId === device.id ? outletCable.endNodeId : outletCable.startNodeId;
      device.circuitId = null;
    }
  }
  for (const cable of Object.values(e.cables)) {
    const circuit =
      resolved.circuits.get(cable.startNodeId) ?? resolved.circuits.get(cable.endNodeId) ?? null;
    if (!resolved.circuits.has(cable.startNodeId) && !resolved.circuits.has(cable.endNodeId)) continue;
    cable.circuitId = circuit;
    cable.metadata.wiringManaged = true;
    cable.connectionAssignment = "none";
    const pair = connectionPair(project, cable.startNodeId, cable.endNodeId);
    if (
      pair &&
      ((pair.kind === "switch" && pair.device.switchId === pair.otherId) ||
        (pair.kind === "outlet" && pair.device.connectionPointId === pair.otherId))
    )
      cable.connectionAssignment = pair.kind;
  }
  fillConsumerDefaults(project);
  return resolved.issues;
}

export function fillConsumerDefaults(project: Project, before?: Project) {
  for (const device of Object.values(project.electrical.devices)) {
    if (before && JSON.stringify(before.electrical.devices[device.id]) === JSON.stringify(device)) continue;
    if (deviceSymbolKind(device) === "lamp" && device.ratedPower === null) device.ratedPower = 5;
    const id = device.connectionPointId
      ? project.electrical.outlets[device.connectionPointId]?.circuitId
      : device.circuitId;
    if (device.ratedVoltage !== null) continue;
    const outletVoltage = project.electrical.outlets[device.connectionPointId ?? ""]?.ratedVoltage;
    if (!id) {
      if (outletVoltage != null) device.ratedVoltage = outletVoltage;
      continue;
    }
    if (device.transformerId) {
      const transformer = project.electrical.transformers[device.transformerId];
      if (transformer) device.ratedVoltage = transformerVoltage(transformer, device);
      continue;
    }
    const circuit = project.electrical.circuits[id];
    if (!circuit) continue;
    let board = project.electrical.distributionBoards[circuit.distributionBoardId];
    const seen = new Set<string>();
    while (board && !seen.has(board.id)) {
      seen.add(board.id);
      const sourceId = board.supplyId ?? project.electrical.meters[board.meterId ?? ""]?.supplyId;
      const source = project.electrical.supplies[sourceId ?? ""];
      if (source) {
        device.ratedVoltage =
          device.phases === 3
            ? (source.phasePhaseVoltage ?? project.electrical.settings.phasePhaseVoltage)
            : (circuit.nominalVoltage ??
              source.phaseNeutralVoltage ??
              project.electrical.settings.phaseNeutralVoltage);
        break;
      }
      const upstream = project.electrical.circuits[board.upstreamCircuitId ?? ""];
      if (!upstream) break;
      board = project.electrical.distributionBoards[upstream.distributionBoardId];
    }
    if (device.ratedVoltage === null)
      device.ratedVoltage = outletVoltage ?? (device.phases === 1 ? circuit.nominalVoltage : null);
  }
}
