import type { Project } from "../models/project";
import type { Cable } from "./models";
import { switchControl, switchRole } from "./switchingControls";

export interface Contact {
  id: string;
  label: string;
  role: "line" | "neutral" | "protective" | "secondary";
}
/** Generische Kontaktvorlagen, keine herstellerspezifischen Klemmenpläne. */
export function contactsFor(project: Project, id: string): Contact[] {
  const supply = project.electrical.supplies[id];
  const standard = (prefix: string, three = true): Contact[] => [
    ...(three ? ["L1", "L2", "L3"] : ["L"]).map((phase): Contact => ({
      id: `${prefix}${phase}`,
      label: `${prefix}${phase}`,
      role: "line",
    })),
    { id: `${prefix}N`, label: `${prefix}N`, role: "neutral" },
    { id: `${prefix}PE`, label: `${prefix}PE`, role: "protective" },
  ];
  if (supply) return standard("", supply.phases === 3);
  if (project.electrical.junctions[id]) return standard("");
  if (project.electrical.meters[id]) return [...standard("IN_"), ...standard("OUT_")];
  if (project.electrical.distributionBoards[id])
    return [
      ...standard("IN_"),
      ...Object.values(project.electrical.circuits)
        .filter((c) => c.distributionBoardId === id)
        .flatMap((c) =>
          standard(`${c.id}:`, c.phase === "L1/L2/L3").map((port) => ({
            ...port,
            label: `${c.label || c.name} · ${port.id.split(":").at(-1)}`,
          })),
        ),
    ];
  const role = switchRole(project, id);
  if (project.electrical.switches[id] && switchControl(project, id)) {
    const pins =
      role === "Taster"
        ? ["L", "NO"]
        : role === "Wechselschalter"
          ? ["COM", "T1", "T2"]
          : ["T1_IN", "T2_IN", "T1_OUT", "T2_OUT"];
    return pins.map((pin) => ({ id: pin, label: pin, role: "line" }));
  }
  if (project.electrical.transformers[id])
    return [
      { id: "PRI_L", label: "Primär L", role: "line" },
      { id: "PRI_N", label: "Primär N", role: "neutral" },
      { id: "SEC_1", label: "Sekundär 1", role: "secondary" },
      { id: "SEC_2", label: "Sekundär 2", role: "secondary" },
    ];
  if (project.electrical.controls[id]?.mode === "impulseRelay")
    return [
      { id: "A1", label: "A1 · Steuerung", role: "line" },
      { id: "A2", label: "A2 · Steuerung", role: "neutral" },
      { id: "COM", label: "Kontakt Eingang", role: "line" },
      { id: "NO", label: "Kontakt Ausgang", role: "line" },
    ];
  if (project.electrical.switches[id])
    return [
      { id: "L", label: "L · Eingang", role: "line" },
      { id: "L_OUT", label: "L′ · geschalteter Ausgang", role: "line" },
    ];
  const item = project.electrical.devices[id] ?? project.electrical.outlets[id];
  if (!item) return [];
  if (project.electrical.devices[id]?.transformerId)
    return [
      { id: "X1", label: "X1 · Kleinspannung", role: "secondary" },
      { id: "X2", label: "X2 · Kleinspannung", role: "secondary" },
    ];
  return [
    ...(item.phases === 3 ? ["L1", "L2", "L3"] : ["L"]).map((phase): Contact => ({
      id: phase,
      label: phase,
      role: "line",
    })),
    { id: "N", label: "N · Neutralleiter", role: "neutral" },
    { id: "PE", label: "PE · sofern am Gerät vorhanden", role: "protective" },
  ];
}

export function connectionPair(project: Project, startId: string, endId: string) {
  const device = project.electrical.devices[startId] ?? project.electrical.devices[endId];
  const otherId = device?.id === startId ? endId : startId;
  const lightSwitch = switchControl(project, otherId) ? undefined : project.electrical.switches[otherId];
  const outlet = project.electrical.outlets[otherId];
  return device && (lightSwitch || outlet)
    ? {
        device,
        otherId,
        kind: lightSwitch ? ("switch" as const) : ("outlet" as const),
        circuitId: (lightSwitch ?? outlet)!.circuitId,
      }
    : null;
}

export function contactConnectionIssues(project: Project, cable: Cable): string[] {
  const issues: string[] = [];
  const start = contactsFor(project, cable.startNodeId),
    end = contactsFor(project, cable.endNodeId);
  const seenStart = new Set<string>(),
    seenEnd = new Set<string>();
  for (const row of cable.conductorConnections) {
    const a = start.find((contact) => contact.id === row.startContactId);
    const b = end.find((contact) => contact.id === row.endContactId);
    if (!a || !b) issues.push("Kontakt fehlt in der Kontaktvorlage des Endobjekts.");
    else if (a.role !== b.role)
      issues.push("Unvereinbare Kontakte: Außenleiter, N und PE getrennt zuordnen.");
    if (seenStart.has(row.startContactId) || seenEnd.has(row.endContactId))
      issues.push("Ein Kontakt darf innerhalb dieser Leitung nur einmal belegt werden.");
    seenStart.add(row.startContactId);
    seenEnd.add(row.endContactId);
  }
  if (cable.conductorCount !== null && cable.conductorConnections.length > cable.conductorCount)
    issues.push("Mehr Kontaktverbindungen als dokumentierte Adern.");
  if (cable.connectionAssignment !== "none") {
    const pair = connectionPair(project, cable.startNodeId, cable.endNodeId);
    if (!pair || pair.kind !== cable.connectionAssignment)
      issues.push("Anschlusszuordnung passt nicht zu den Endobjekten.");
    else {
      const deviceStart = pair.device.id === cable.startNodeId;
      const maps = (other: string, device: string) =>
        cable.conductorConnections.some(
          (row) =>
            (deviceStart ? row.startContactId : row.endContactId) === device &&
            (deviceStart ? row.endContactId : row.startContactId) === other,
        );
      if (pair.kind === "switch") {
        if (!maps("L_OUT", "L"))
          issues.push("Die Schalterzuordnung benötigt L′ am Schalter zu L am Verbraucher.");
        if (
          pair.device.switchId !== pair.otherId ||
          !pair.circuitId ||
          pair.device.circuitId !== pair.circuitId ||
          pair.device.connectionPointId ||
          pair.device.phases !== 1
        )
          issues.push(
            "Schalteranschluss und gespeicherte Verbraucherzuordnung widersprechen sich. Anschlussbelegung zuerst lösen.",
          );
      } else {
        const phases = pair.device.phases === 3 ? ["L1", "L2", "L3"] : ["L"];
        if (!phases.every((phase) => maps(phase, phase)) || (pair.device.phases === 1 && !maps("N", "N")))
          issues.push("Für die Steckdosenzuordnung alle Außenleiter passend verbinden; einphasig auch N.");
        if (
          pair.device.connectionPointId !== pair.otherId ||
          pair.device.switchId ||
          pair.device.circuitId ||
          project.electrical.outlets[pair.otherId]!.phases !== pair.device.phases
        )
          issues.push(
            "Steckdosenanschluss und gespeicherte Verbraucherzuordnung widersprechen sich. Anschlussbelegung zuerst lösen.",
          );
      }
      if (cable.circuitId !== pair.circuitId)
        issues.push("Leitungsstromkreis widerspricht dem zugeordneten Anschluss.");
      if (
        Object.values(project.electrical.cables).some(
          (other) =>
            other.id !== cable.id &&
            other.connectionAssignment !== "none" &&
            connectionPair(project, other.startNodeId, other.endNodeId)?.device.id === pair.device.id,
        )
      )
        issues.push("Für diesen Verbraucher besteht bereits eine Leitung mit Anschlusszuordnung.");
    }
  }
  return [...new Set(issues)];
}

/** Eine entfernte Anschlussleitung löst nur die von ihr ausdrücklich verwaltete Zuordnung. */
export function detachConnectionAssignment(project: Project, cable: Cable): void {
  if (cable.connectionAssignment === "none") return;
  const device = project.electrical.devices[cable.startNodeId] ?? project.electrical.devices[cable.endNodeId];
  if (!device) return;
  const other = device.id === cable.startNodeId ? cable.endNodeId : cable.startNodeId;
  if (
    cable.connectionAssignment === "switch" &&
    (device.switchId === other || (!device.switchId && !project.electrical.switches[other]))
  ) {
    device.switchId = null;
    if (device.circuitId === cable.circuitId) device.circuitId = null;
  }
  if (cable.connectionAssignment === "outlet" && device.connectionPointId === other)
    device.connectionPointId = null;
}

export function setCableContacts(
  project: Project,
  cableId: string,
  connections: Cable["conductorConnections"],
  assign: boolean,
): void {
  const cable = project.electrical.cables[cableId]!;
  const old = structuredClone(cable);
  detachConnectionAssignment(project, cable);
  cable.conductorConnections = structuredClone(connections);
  cable.connectionAssignment = "none";
  if (assign) {
    const pair = connectionPair(project, cable.startNodeId, cable.endNodeId);
    if (!pair)
      throw new Error(
        "Für diese Objektkombination ist noch keine automatische Anschlusszuordnung verfügbar.",
      );
    const { device, otherId, kind, circuitId } = pair;
    if (device.controlId || device.transformerId)
      throw new Error("Schaltgruppen- oder Trafoanschluss zuerst am Verbraucher lösen.");
    if (kind === "switch") {
      if (!circuitId) throw new Error("Dem Lichtschalter zuerst einen Stromkreis zuordnen.");
      if (
        device.connectionPointId ||
        (device.switchId && device.switchId !== otherId) ||
        (device.circuitId && device.circuitId !== circuitId)
      )
        throw new Error("Bestehenden Anschluss am Verbraucher zuerst lösen. Es wird nichts umgehängt.");
      device.circuitId = circuitId;
      device.switchId = otherId;
    } else {
      if (
        device.switchId ||
        device.circuitId ||
        (device.connectionPointId && device.connectionPointId !== otherId)
      )
        throw new Error("Bestehenden Anschluss am Verbraucher zuerst lösen. Es wird nichts umgehängt.");
      device.connectionPointId = otherId;
    }
    cable.connectionAssignment = kind;
    cable.circuitId = circuitId;
  } else if (old.connectionAssignment !== "none") cable.circuitId = null;
  const issues = contactConnectionIssues(project, cable);
  if (issues.length) throw new Error(issues.join(" "));
}
