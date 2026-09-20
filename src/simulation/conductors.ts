import type { Project } from "../models/project";
import type { SimulationScenario } from "./models";
import { electricalNodes } from "../electrical/cables";
import { contactsFor } from "../electrical/contacts";
import { switchRole } from "../electrical/switchingControls";
import { protectionChain } from "../electrical/supply";
import { calculateLoad } from "./load";
import { ConductorNetwork } from "./conductorNetwork";
import { analyzeConductorFaults } from "./conductorFaults";
import type { ConductorFaultResult, ResidualProtectionResult } from "./conductorFaults";

export interface ConductorResult {
  faults: ConductorFaultResult[];
  protections: ResidualProtectionResult[];
  trippedProtectionIds: string[];
  relays: { id: string; closed: boolean; coilVoltage: number | null }[];
  issues: string[];
  devices: {
    id: string;
    status: "running" | "off" | "unpowered" | "incomplete";
    voltage: number | null;
    current: number | null;
    power: number | null;
    estimated: boolean;
    issues: string[];
  }[];
  contacts: number;
  connections: number;
}
/** Ideal continuity of explicitly connected contacts; no geometric or logical supply inference. */
export function solveConductors(project: Project, scenario: SimulationScenario): ConductorResult {
  const initial = solveConductorPass(project, scenario);
  let result = initial;
  const tripped = new Set<string>();
  const protections = new Map(initial.protections.map((p) => [p.id, p]));
  for (let pass = 0; pass < Object.keys(project.electrical.protectionDevices).length; pass++) {
    const next = result.protections.filter((p) => p.status === "trip" && !tripped.has(p.id));
    if (!next.length) break;
    next.forEach((p) => {
      tripped.add(p.id);
      protections.set(p.id, p);
    });
    result = solveConductorPass(project, {
      ...scenario,
      disabledNodeIds: [...scenario.disabledNodeIds, ...tripped],
    });
    result.protections.forEach((p) => {
      if (!tripped.has(p.id)) protections.set(p.id, p);
    });
  }
  return {
    ...result,
    trippedProtectionIds: [...tripped],
    protections: [...protections.values()],
    faults: result.faults.map((fault, i) => ({
      ...fault,
      initialCurrent: initial.faults[i]!.current,
      issues:
        fault.current === 0 && (initial.faults[i]!.current ?? 0) > 0
          ? initial.faults[i]!.issues
          : fault.issues,
      status: fault.current === 0 && (initial.faults[i]!.current ?? 0) > 0 ? "cleared" : fault.status,
    })),
  };
}

function solveConductorPass(project: Project, scenario: SimulationScenario): ConductorResult {
  const network = new ConductorNetwork();
  const parent = new Map<string, string>(),
    tokens = new Map<string, Set<string>>(),
    disabled = new Set(scenario.disabledNodeIds);
  const key = (id: string, pin: string) => `${id}/${pin}`;
  const root = (pin: string): string => {
    let r = pin;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    let p = pin;
    while (parent.has(p) && parent.get(p) !== r) {
      const next = parent.get(p)!;
      parent.set(p, r);
      p = next;
    }
    return r;
  };
  const join = (a: string, b: string, protections: string[] = []) => {
    if (parent.has(a) && parent.has(b)) {
      parent.set(root(a), root(b));
      network.add(a, b, protections);
    }
  };
  const internal = (id: string, a: string, b: string) => {
    if (!disabled.has(id)) join(key(id, a), key(id, b));
  };
  for (const id of Object.keys(electricalNodes(project)))
    for (const port of contactsFor(project, id)) parent.set(key(id, port.id), key(id, port.id));
  let connections = 0;
  for (const cable of Object.values(project.electrical.cables))
    if (!disabled.has(cable.id))
      for (const pair of cable.conductorConnections) {
        join(key(cable.startNodeId, pair.startContactId), key(cable.endNodeId, pair.endContactId));
        connections++;
      }
  for (const item of Object.values(project.electrical.switches)) {
    const role = switchRole(project, item.id),
      closed = scenario.switchStates[item.id] ?? (role === "Taster" ? false : item.closed);
    if (role === "Wechselschalter") internal(item.id, "COM", closed ? "T1" : "T2");
    else if (role === "Kreuzschalter") {
      internal(item.id, "T1_IN", closed ? "T1_OUT" : "T2_OUT");
      internal(item.id, "T2_IN", closed ? "T2_OUT" : "T1_OUT");
    } else if (closed) internal(item.id, "L", role === "Taster" ? "NO" : "L_OUT");
  }
  for (const item of Object.values(project.electrical.controls))
    if (item.mode === "impulseRelay" && (scenario.relayStates[item.id] ?? item.initialOn))
      internal(item.id, "COM", "NO");
  for (const id of Object.keys(project.electrical.meters))
    for (const pin of ["L1", "L2", "L3", "N", "PE"])
      if (pin === "PE") join(key(id, "IN_PE"), key(id, "OUT_PE"));
      else internal(id, `IN_${pin}`, `OUT_${pin}`);
  for (const circuit of Object.values(project.electrical.circuits)) {
    const id = circuit.distributionBoardId;
    // Protective continuity is never switched by a breaker, circuit or board scenario.
    join(key(id, "IN_PE"), key(id, `${circuit.id}:PE`));
    if (disabled.has(circuit.id) || disabled.has(id)) continue;
    const chain = protectionChain(project, circuit.protectionDeviceId);
    const ids = chain.map((p) => p.id);
    const branch = (a: string, b: string) => join(key(id, a), key(id, b), ids);
    if (!chain.some((p) => disabled.has(p.id))) {
      if (circuit.phase === "L1/L2/L3")
        for (const p of ["L1", "L2", "L3"]) branch(`IN_${p}`, `${circuit.id}:${p}`);
      else if (circuit.phase !== "unknown") branch(`IN_${circuit.phase}`, `${circuit.id}:L`);
    }
    if (!chain.some((p) => disabled.has(p.id) && ["RCD", "RCBO"].includes(p.type)))
      branch("IN_N", `${circuit.id}:N`);
  }
  const sources = new Map<string, { ln: number; ll: number }>();
  const seed = (id: string, pin: string, sourceId: string, phase: string) => {
    const r = root(key(id, pin));
    const set = tokens.get(r) ?? new Set<string>();
    set.add(`${sourceId}|${phase}`);
    tokens.set(r, set);
  };
  for (const item of Object.values(project.electrical.supplies)) {
    sources.set(item.id, {
      ln: item.phaseNeutralVoltage ?? project.electrical.settings.phaseNeutralVoltage,
      ll: item.phasePhaseVoltage ?? project.electrical.settings.phasePhaseVoltage,
    });
    if (disabled.has(item.id)) continue;
    for (const phase of item.phases === 1 ? ["L1"] : ["L1", "L2", "L3"])
      if (!scenario.disabledPhases[item.id]?.includes(phase as "L1"))
        seed(item.id, item.phases === 1 ? "L" : phase, item.id, phase);
    seed(item.id, "N", item.id, "N");
    seed(item.id, "PE", item.id, "PE");
  }
  const contact = (id: string, pin: string) => {
    const set = tokens.get(root(key(id, pin)));
    return set?.size === 1 ? ([...set][0]!.split("|") as [string, string]) : null;
  };
  const singleFeed = (id: string, line: string, neutral: string) => {
    const a = contact(id, line),
      b = contact(id, neutral);
    return a && b && a[0] === b[0] && /^L[123]$/.test(a[1]) && b[1] === "N" ? a[0] : null;
  };
  // Ideal isolated transformer secondaries are seeded only from a complete primary circuit.
  for (let pass = 0; pass < Object.keys(project.electrical.transformers).length; pass++)
    for (const tx of Object.values(project.electrical.transformers)) {
      if (sources.has(tx.id) || disabled.has(tx.id)) continue;
      const sourceId = singleFeed(tx.id, "PRI_L", "PRI_N");
      if (!sourceId) continue;
      const voltage = (sources.get(sourceId)!.ln * tx.secondaryVoltage) / tx.primaryVoltage;
      sources.set(tx.id, { ln: voltage, ll: voltage });
      seed(tx.id, "SEC_1", tx.id, "L1");
      seed(tx.id, "SEC_2", tx.id, "N");
    }
  const issues: string[] = [];
  for (const [component, set] of tokens)
    if (set.size > 1)
      issues.push(
        `Widersprüchliche Einspeisungen/Leiter an ${component}: ${[...set].map((s) => s.split("|")[1]).join(", ")}. Dieses Netz wird nicht berechnet.`,
      );
  const devices: ConductorResult["devices"] = Object.values(project.electrical.devices).map((device) => {
    const item: ConductorResult["devices"][number] = {
      id: device.id,
      status: "unpowered",
      voltage: null,
      current: null,
      power: null,
      estimated: false,
      issues: [],
    };
    let sourceId: string | null = null;
    if (device.phases === 1)
      sourceId = singleFeed(device.id, device.transformerId ? "X1" : "L", device.transformerId ? "X2" : "N");
    else {
      const feeds = ["L1", "L2", "L3"].map((pin) => contact(device.id, pin));
      if (
        feeds.every((f) => f && f[0] === feeds[0]?.[0] && /^L[123]$/.test(f[1])) &&
        new Set(feeds.map((f) => f?.[1])).size === 3
      )
        sourceId = feeds[0]![0];
    }
    if (!sourceId || disabled.has(device.id)) {
      item.issues.push("Kein vollständiger dokumentierter Leiterstromkreis oder Versorgung unterbrochen.");
      return item;
    }
    item.voltage = sources.get(sourceId)![device.phases === 3 ? "ll" : "ln"];
    const state = scenario.deviceStates[device.id] ?? device.operatingMode;
    if (state === "off") return { ...item, status: "off", power: 0, current: 0 };
    if (state === "standby") return { ...item, status: "incomplete", issues: ["Standby-Leistung fehlt."] };
    const load = calculateLoad(device, item.voltage, scenario.assumeUnityPowerFactor);
    return { ...item, ...load, status: load.issues.length ? "incomplete" : "running" };
  });
  const relays = Object.values(project.electrical.controls)
    .filter((c) => c.mode === "impulseRelay")
    .map((c) => {
      const source = singleFeed(c.id, "A1", "A2");
      return {
        id: c.id,
        closed: !disabled.has(c.id) && (scenario.relayStates[c.id] ?? c.initialOn),
        coilVoltage: !disabled.has(c.id) && source ? sources.get(source)!.ln : null,
      };
    });
  const analysis = analyzeConductorFaults(project, scenario, network, contact, (id) => sources.get(id)!.ln);
  if (issues.length) {
    analysis.protections.forEach((p) => {
      p.status = "uncertain";
    });
    analysis.faults.forEach((f) => {
      f.status = "incomplete";
      f.current = null;
      f.issues.push(
        "Widersprüchliche Einspeisung im Leitergraphen; keine Fehlerstrom- oder Schutzbewertung.",
      );
    });
  }
  return {
    devices,
    issues,
    contacts: parent.size,
    connections,
    relays,
    ...analysis,
    trippedProtectionIds: [],
  };
}

/** One complete press/release; only actual rising coil voltage toggles a bistable contact. */
export function pulseConductorSwitch(
  project: Project,
  scenario: SimulationScenario,
  switchId: string,
): string[] {
  if (switchRole(project, switchId) !== "Taster" || scenario.disabledNodeIds.includes(switchId)) return [];
  const before = solveConductors(project, scenario);
  const pressed = structuredClone(scenario);
  pressed.switchStates[switchId] = true;
  const during = solveConductors(project, pressed);
  if (before.issues.length || during.issues.length) return [];
  const changed: string[] = [];
  for (const relay of during.relays) {
    const old = before.relays.find((r) => r.id === relay.id);
    if (relay.coilVoltage !== null && old?.coilVoltage === null) {
      const control = project.electrical.controls[relay.id]!;
      scenario.relayStates[relay.id] = !(scenario.relayStates[relay.id] ?? control.initialOn);
      changed.push(relay.id);
    }
  }
  return changed;
}
