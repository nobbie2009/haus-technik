import type { Project } from "../models/project";
import type { SimulationScenario } from "./models";
import { electricalNodes } from "../electrical/cables";
import { contactsFor } from "../electrical/contacts";
import { switchRole } from "../electrical/switchingControls";
import { protectionChain } from "../electrical/supply";
import { calculateLoad } from "./load";

export interface ConductorResult {
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
  const join = (a: string, b: string) => {
    if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b));
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
    const closed = scenario.switchStates[item.id] ?? item.closed,
      role = switchRole(project, item.id);
    if (role === "Wechselschalter") internal(item.id, "COM", closed ? "T1" : "T2");
    else if (role === "Kreuzschalter") {
      internal(item.id, "T1_IN", closed ? "T1_OUT" : "T2_OUT");
      internal(item.id, "T2_IN", closed ? "T2_OUT" : "T1_OUT");
    } else if (closed && role !== "Taster") internal(item.id, "L", "L_OUT");
  }
  for (const id of Object.keys(project.electrical.meters))
    for (const pin of ["L1", "L2", "L3", "N", "PE"]) internal(id, `IN_${pin}`, `OUT_${pin}`);
  for (const circuit of Object.values(project.electrical.circuits)) {
    if (disabled.has(circuit.id)) continue;
    const chain = protectionChain(project, circuit.protectionDeviceId);
    if (chain.some((p) => disabled.has(p.id))) continue;
    const id = circuit.distributionBoardId;
    if (circuit.phase === "L1/L2/L3")
      for (const p of ["L1", "L2", "L3"]) internal(id, `IN_${p}`, `${circuit.id}:${p}`);
    else if (circuit.phase !== "unknown") internal(id, `IN_${circuit.phase}`, `${circuit.id}:L`);
    internal(id, "IN_N", `${circuit.id}:N`);
    internal(id, "IN_PE", `${circuit.id}:PE`);
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
  return { devices, issues, contacts: parent.size, connections };
}
