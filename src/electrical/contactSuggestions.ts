import type { Project } from "../models/project";
import type { Cable } from "./models";
import { contactsFor, connectionPair, type Contact } from "./contacts";
import { deviceCircuitId } from "./selectors";

export function connectionContacts(
  project: Project,
  start: string,
  end: string,
  boardCircuits: Record<string, string | null> = {},
  editedCableId?: string,
) {
  const e = project.electrical;
  const circuitFor = (id: string): string | null => {
    if (boardCircuits[id]) return boardCircuits[id]!;
    if (e.devices[id]) return deviceCircuitId(project, e.devices[id]!);
    const item = e.outlets[id] ?? e.switches[id] ?? e.transformers[id];
    if (item) return item.circuitId;
    if (e.junctions[id]) {
      const ids = [
        ...new Set(
          Object.values(e.cables)
            .filter((c) => c.startNodeId === id || c.endNodeId === id)
            .map((c) => c.circuitId)
            .filter((v): v is string => !!v),
        ),
      ];
      if (ids.length === 1) return ids[0]!;
    }
    return null;
  };
  const circuitIds = [circuitFor(start), circuitFor(end)].filter((id): id is string => !!id);
  const circuits = [...new Set(circuitIds)].map((id) => e.circuits[id]!).filter(Boolean);
  const junctionPhases = new Map<string, Set<string>>();
  // Propagate only documented phase contacts from sources through junction chains.
  // Each junction can gain at most three phases, so cycles terminate as well.
  let changed = true;
  while (changed) {
    changed = false;
    for (const cable of Object.values(e.cables)) {
      if (cable.id === editedCableId) continue;
      for (const reverse of [false, true]) {
        const id = reverse ? cable.startNodeId : cable.endNodeId;
        const other = reverse ? cable.endNodeId : cable.startNodeId;
        if (!e.junctions[id]) continue;
        const source = !!(
          e.distributionBoards[other] ||
          e.supplies[other] ||
          e.outlets[other] ||
          e.meters[other] ||
          e.switches[other]
        );
        for (const row of cable.conductorConnections) {
          const pin = reverse ? row.startContactId : row.endContactId;
          const otherPin = reverse ? row.endContactId : row.startContactId;
          if (!/^L[123]$/.test(pin) || (!source && !junctionPhases.get(other)?.has(otherPin))) continue;
          const pins = junctionPhases.get(id) ?? new Set<string>();
          if (!pins.has(pin)) {
            pins.add(pin);
            junctionPhases.set(id, pins);
            changed = true;
          }
        }
      }
    }
  }
  const explicitLines = junctionPhases.get(start) ?? junctionPhases.get(end);
  const singleCircuit =
    circuits.length === 1 &&
    (["L1", "L2", "L3"].includes(circuits[0]!.phase) ||
      (circuits[0]!.phase === "unknown" &&
        (e.protectionDevices[circuits[0]!.protectionDeviceId ?? ""]?.poles ?? 3) < 3));
  const phase =
    explicitLines?.size === 1
      ? [...explicitLines][0]!
      : singleCircuit && ["L1", "L2", "L3"].includes(circuits[0]!.phase)
        ? circuits[0]!.phase
        : "L1";
  const soleLines = (id: string) =>
    e.outlets[id]?.phases === 1 ||
    e.supplies[id]?.phases === 1 ||
    e.supplies[e.meters[id]?.supplyId ?? ""]?.phases === 1;
  const single =
    explicitLines?.size === 1 || singleCircuit || (!circuits.length && (soleLines(start) || soleLines(end)));
  const forNode = (id: string) => {
    let contacts = contactsFor(project, id);
    if (e.distributionBoards[id]) {
      if (!(id in boardCircuits)) return [];
      contacts = contacts.filter((c) =>
        boardCircuits[id] ? c.id.startsWith(`${boardCircuits[id]}:`) : c.id.startsWith("IN_"),
      );
    }
    return contacts.filter(
      (c) =>
        !single ||
        !/^(?:IN_|OUT_)?L[123]$/.test(c.id.split(":").at(-1)!) ||
        c.id
          .split(":")
          .at(-1)!
          .replace(/^(IN_|OUT_)/, "") === phase,
    );
  };
  return { start: forNode(start), end: forNode(end) };
}

export function suggestContacts(
  project: Project,
  startId: string,
  endId: string,
  choices: Record<string, string | null> = {},
  editedCableId?: string,
): Cable["conductorConnections"] {
  const contacts = connectionContacts(project, startId, endId, choices, editedCableId);
  const pair = connectionPair(project, startId, endId);
  if (pair?.kind === "switch") {
    const reverse = pair.device.id === startId;
    return [{ startContactId: reverse ? "L" : "L_OUT", endContactId: reverse ? "L_OUT" : "L" }];
  }
  // A supply/junction feeds the input of a simple switch; consumers use L_OUT above.
  for (const side of ["start", "end"] as const) {
    const id = side === "start" ? startId : endId;
    if (project.electrical.switches[id] && contacts[side].some((c) => c.id === "L_OUT"))
      contacts[side] = contacts[side].filter((c) => c.id === "L");
  }
  const rows: Cable["conductorConnections"] = [];
  const pin = (c: Contact) =>
    c.id
      .split(":")
      .at(-1)!
      .replace(/^(IN_|OUT_|PRI_)/, "");
  for (const role of ["line", "neutral", "protective"] as const) {
    const a = contacts.start.filter((c) => c.role === role);
    const b = contacts.end.filter((c) => c.role === role);
    if (a.length === 1 && b.length === 1) {
      // Never guess an input/output contact of a switch or a secondary winding.
      rows.push({ startContactId: a[0]!.id, endContactId: b[0]!.id });
    } else {
      for (const contact of a) {
        const matches = b.filter((c) => pin(c) === pin(contact));
        if (matches.length === 1 && a.filter((c) => pin(c) === pin(contact)).length === 1)
          rows.push({ startContactId: contact.id, endContactId: matches[0]!.id });
      }
    }
  }
  return rows;
}
