import type { Project } from "../models/project";
import type { ProtectionDevice } from "./models";
import { deviceCircuitId } from "./selectors";
import { distributionPath } from "./distributionTopology";

export function protectionChain(project: Project, id: string | null): ProtectionDevice[] {
  const result: ProtectionDevice[] = [];
  const visited = new Set<string>();
  while (id && !visited.has(id)) {
    visited.add(id);
    const item: ProtectionDevice | undefined = project.electrical.protectionDevices[id];
    if (!item) break;
    result.push(item);
    id = item.upstreamProtectionDeviceId;
  }
  return result.reverse();
}

/** Planungsdaten aus expliziten Beziehungen. Keine Messung, Last- oder Auslösesimulation. */
export function circuitSupply(project: Project, circuitId: string | null, phases: 1 | 3 = 1) {
  const e = project.electrical;
  const circuit = circuitId ? e.circuits[circuitId] : undefined;
  const board = circuit ? e.distributionBoards[circuit.distributionBoardId] : undefined;
  const path = board ? distributionPath(project, board.id) : null;
  const meter = path?.meter;
  const supply = path?.supply;
  const circuits = [...(path?.feeders ?? []), ...(circuit ? [circuit] : [])];
  const key = phases === 3 ? "phasePhaseVoltage" : "phaseNeutralVoltage";
  const matchingVoltageKind = (circuit?.phase === "L1/L2/L3" ? 3 : 1) === phases;
  const circuitVoltage = matchingVoltageKind ? circuit?.nominalVoltage : null;
  const voltage = supply ? (supply[key] ?? e.settings[key]) : (circuitVoltage ?? e.settings[key]);
  const chain = circuits.flatMap((item) => protectionChain(project, item.protectionDeviceId));
  const routeLabels = [
    ...(meter ? [meter.label || meter.name] : []),
    ...(path?.boards.flatMap((item, index) => {
      const outgoing = circuits[index];
      return [
        item.label || item.name,
        ...protectionChain(project, outgoing?.protectionDeviceId ?? null).map((p) => p.label),
        ...(outgoing ? [outgoing.label || outgoing.name] : []),
      ];
    }) ?? []),
  ];
  const overcurrent = chain.filter((item) => ["MCB", "RCBO", "fuse"].includes(item.type));
  const knownRatings = overcurrent.flatMap((item) => (item.ratedCurrent === null ? [] : [item.ratedCurrent]));
  const overcurrentRating = knownRatings.length ? Math.min(...knownRatings) : null;
  const capacity = supply?.ratedCurrent ?? null;
  const limits = [...knownRatings, ...(capacity === null ? [] : [capacity])];
  const warnings: string[] = [];
  for (const feeder of path?.feeders ?? []) {
    if (
      feeder.phase !== "unknown" &&
      feeder.phase !== "L1/L2/L3" &&
      (phases === 3 || (circuit && circuit.phase !== "unknown" && circuit.phase !== feeder.phase))
    )
      warnings.push(
        `${feeder.label}: Phasenzuordnung der Unterverteilung widerspricht dem einspeisenden Stromkreis.`,
      );
    if (
      !protectionChain(project, feeder.protectionDeviceId).some((item) =>
        ["MCB", "RCBO", "fuse"].includes(item.type),
      )
    )
      warnings.push(`${feeder.label}: Für die Verteilerzuleitung ist kein Überstromschutz dokumentiert.`);
    if (supply && feeder.nominalVoltage !== null) {
      const feederKey = feeder.phase === "L1/L2/L3" ? "phasePhaseVoltage" : "phaseNeutralVoltage";
      if (feeder.nominalVoltage !== (supply[feederKey] ?? e.settings[feederKey]))
        warnings.push(`${feeder.label}: Dokumentierte Spannung der Zuleitung weicht von der Einspeisung ab.`);
    }
  }
  if (phases === 3 && supply?.phases === 1)
    warnings.push("Dreiphasiger Anschluss an einphasiger Einspeisung ist nicht möglich.");
  if (circuit && phases === 3 && circuit.phase !== "L1/L2/L3" && circuit.phase !== "unknown")
    warnings.push("Dreiphasiges Objekt ist einem einphasigen Stromkreis zugeordnet.");
  if (supply && circuitVoltage != null && circuitVoltage !== voltage)
    warnings.push(
      "Die eingetragene Stromkreisspannung weicht von der Einspeisung ab. Maßgeblich bleibt die Einspeisung.",
    );
  if (circuit && !overcurrent.length)
    warnings.push("Kein Überstromschutz zugeordnet. Ein FI/RCD allein ersetzt keine Sicherung.");
  if (overcurrent.some((item) => item.ratedCurrent === null))
    warnings.push("Bemessungsstrom mindestens einer Sicherung fehlt.");
  for (const rcd of chain.filter((item) => item.type === "RCD" && item.ratedCurrent !== null))
    if (overcurrentRating !== null && overcurrentRating > rcd.ratedCurrent!)
      warnings.push(
        `${rcd.label}: FI-Bemessungsstrom ist kleiner als die dokumentierte Stromkreisabsicherung.`,
      );
  const otherChainIds = new Set(
    Object.values(e.circuits)
      .filter((other) => !circuits.some((item) => item.id === other.id))
      .flatMap((other) =>
        [...distributionPath(project, other.distributionBoardId).feeders, other].flatMap((item) =>
          protectionChain(project, item.protectionDeviceId).map((p) => p.id),
        ),
      ),
  );
  for (const protection of overcurrent.filter((item) => otherChainIds.has(item.id)))
    warnings.push(
      `${protection.label} schützt mehrere Stromkreise gemeinsam. Ihr Nennstrom steht nicht jedem Stromkreis zusätzlich zur Verfügung.`,
    );
  return {
    circuit,
    board,
    meter,
    supply,
    chain,
    routeLabels,
    voltage,
    voltageOrigin: supply
      ? `${supply.label || supply.name}${supply[key] === null ? " · Projektstandard" : ""}`
      : circuitVoltage != null
        ? "Stromkreisvorgabe · ohne Einspeisung"
        : "Projektstandard · ohne Einspeisung",
    overcurrentRating,
    capacity,
    planningCurrentLimit: limits.length ? Math.min(...limits) : null,
    warnings,
  };
}

export function objectSupply(project: Project, kind: "outlets" | "devices", id: string) {
  const item = project.electrical[kind][id]!;
  const circuitId =
    kind === "devices"
      ? deviceCircuitId(project, project.electrical.devices[id]!)
      : project.electrical.outlets[id]!.circuitId;
  const result = circuitSupply(project, circuitId, item.phases);
  const device = kind === "devices" ? project.electrical.devices[id] : null;
  const transformer = device?.transformerId ? project.electrical.transformers[device.transformerId] : null;
  if (transformer) {
    result.voltage = (result.voltage * transformer.secondaryVoltage) / transformer.primaryVoltage;
    result.voltageOrigin = `${transformer.label} · idealer Trafo`;
    result.planningCurrentLimit = transformer.ratedVA / transformer.secondaryVoltage;
    result.routeLabels.push(transformer.label);
  }
  if (item.ratedVoltage !== null && item.ratedVoltage !== result.voltage)
    result.warnings.push("Bauteil-/Gerätenennspannung weicht von der geplanten Versorgungsspannung ab.");
  if (
    kind === "outlets" &&
    item.ratedCurrent !== null &&
    result.overcurrentRating !== null &&
    result.overcurrentRating > item.ratedCurrent
  )
    result.warnings.push("Die Stromkreisabsicherung übersteigt den dokumentierten Steckdosen-Nennstrom.");
  return result;
}

export function circuitOptionLabel(project: Project, id: string): string {
  const circuit = project.electrical.circuits[id]!;
  const board = project.electrical.distributionBoards[circuit.distributionBoardId]!;
  const protection = circuit.protectionDeviceId
    ? project.electrical.protectionDevices[circuit.protectionDeviceId]
    : null;
  return `${circuit.label} · ${circuit.name} · ${board.label || board.name} · ${protection?.label ?? "ohne Sicherung"}`;
}
