import type { Project } from "../models/project";
import { buildSupplyGraph } from "./graph";
import { calculateLoad } from "./load";
import { phases } from "./models";
import { controlClosed, switchControl } from "../electrical/switchingControls";
import type { DeviceResult, NodeResult, Phase, SimulationResult, SimulationScenario } from "./models";

interface Feed {
  sourceId: string | null;
  configured: Phase[];
  available: Phase[];
}
const currents = () => ({ L1: 0, L2: 0, L3: 0 });

/** Statische radiale Lastrechnung und Erreichbarkeit. Keine Kurzschluss-/Auslöse-/Leitungsberechnung. */
export function simulate(project: Project, scenario: SimulationScenario): SimulationResult {
  const graph = buildSupplyGraph(project);
  const result: SimulationResult = { graph, nodes: {}, devices: {}, issues: [] };
  const disabled = new Set(scenario.disabledNodeIds);
  const children: Record<string, string[]> = {};
  const feeds: Record<string, Feed> = {};
  const queue: string[] = [];
  const re: Record<string, Record<Phase, number>> = {},
    im: Record<string, Record<Phase, number>> = {};
  for (const node of Object.values(graph.nodes)) {
    if (!node.parentId || !graph.nodes[node.parentId]) queue.push(node.id);
    else (children[node.parentId] ??= []).push(node.id);
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor]!,
      node = graph.nodes[id]!;
    let feed: Feed =
      node.parentId && feeds[node.parentId]
        ? { ...feeds[node.parentId]! }
        : { sourceId: null, configured: [], available: [] };
    if (node.kind === "supply") {
      const supply = project.electrical.supplies[id]!;
      const configured: Phase[] = supply.phases === 3 ? [...phases] : ["L1"];
      feed = {
        sourceId: id,
        configured,
        available: configured.filter((phase) => !scenario.disabledPhases[id]?.includes(phase)),
      };
    }
    if (node.phase !== "unknown" && node.phase !== "L1/L2/L3") {
      feed.configured = feed.configured.filter((phase) => phase === node.phase);
      feed.available = feed.available.filter((phase) => phase === node.phase);
    }
    if (disabled.has(id)) feed.available = [];
    if (
      node.kind === "switch" &&
      !switchControl(project, id) &&
      !(scenario.switchStates[id] ?? project.electrical.switches[id]!.closed)
    )
      feed.available = [];
    if (node.kind === "control" && !controlClosed(project, project.electrical.controls[id]!, scenario))
      feed.available = [];
    feeds[id] = feed;
    queue.push(...(children[id] ?? []));
  }
  for (const node of Object.values(graph.nodes)) {
    if (!feeds[node.id]) {
      feeds[node.id] = { sourceId: null, configured: [], available: [] };
      result.issues.push("Zyklische Versorgungstopologie ist nicht berechenbar.");
    }
    const ratedCurrent =
      node.kind === "protection"
        ? project.electrical.protectionDevices[node.id]!.ratedCurrent
        : node.kind === "supply"
          ? project.electrical.supplies[node.id]!.ratedCurrent
          : null;
    result.nodes[node.id] = {
      id: node.id,
      sourceId: feeds[node.id]!.sourceId,
      availablePhases: [...feeds[node.id]!.available],
      deviceIds: [],
      knownPower: 0,
      phaseCurrents: currents(),
      maxCurrent: 0,
      ratedCurrent,
      utilization: null,
      overload: false,
      incompleteCount: 0,
      estimated: false,
    };
    re[node.id] = currents();
    im[node.id] = currents();
  }
  for (const device of Object.values(project.electrical.devices)) {
    const feed = { ...feeds[device.id]! };
    const transformer = device.transformerId ? project.electrical.transformers[device.transformerId] : null;
    const gate = device.controlId ?? device.switchId;
    if (transformer && gate && !feeds[gate]?.available.length) feed.available = [];
    const state = scenario.deviceStates[device.id] ?? device.operatingMode;
    const source = feed.sourceId ? project.electrical.supplies[feed.sourceId] : null;
    const primaryVoltage = source
      ? device.phases === 3
        ? (source.phasePhaseVoltage ?? project.electrical.settings.phasePhaseVoltage)
        : (source.phaseNeutralVoltage ?? project.electrical.settings.phaseNeutralVoltage)
      : null;
    const voltage =
      transformer && primaryVoltage !== null
        ? (primaryVoltage * transformer.secondaryVoltage) / transformer.primaryVoltage
        : primaryVoltage;
    const actualPhases =
      device.phases === 3 ? [...phases] : feed.configured.length === 1 ? [...feed.configured] : [];
    const item: DeviceResult = {
      id: device.id,
      state,
      status: "incomplete",
      voltage,
      power: null,
      current: null,
      powerFactor: null,
      estimated: false,
      phaseIds: actualPhases,
      issues: [],
    };
    const malformedPhases =
      source && (feed.configured.length === 0 || (device.phases === 3 && feed.configured.length !== 3));
    const unavailable =
      !source ||
      !feed.available.length ||
      (actualPhases.length > 0 && !actualPhases.every((p) => feed.available.includes(p)));
    if (state === "off") {
      item.status = "off";
      item.power = 0;
      item.current = 0;
      if (unavailable) item.voltage = source ? 0 : null;
    } else if (malformedPhases) {
      item.voltage = null;
      item.issues.push("Phasenzuordnung widerspricht der Einspeisung oder Zuleitung.");
    } else if (unavailable) {
      item.status = "unpowered";
      item.power = 0;
      item.current = 0;
      item.voltage = source ? 0 : null;
      item.issues.push(source ? "Versorgung im Szenario unterbrochen." : "Keine zugeordnete Einspeisung.");
    } else if (!actualPhases.length && feed.available.length !== feed.configured.length) {
      item.voltage = null;
      item.issues.push("Phase unbekannt: Versorgung bei Phasenausfall nicht bestimmbar.");
    } else if (state === "standby")
      item.issues.push("Standby-Leistung ist nicht erfasst. Im Szenario ein- oder ausschalten.");
    else {
      const load = calculateLoad(device, voltage!, scenario.assumeUnityPowerFactor);
      Object.assign(item, load);
      if (!actualPhases.length)
        item.issues.push("Phase fehlt: einphasigen Stromkreis L1, L2 oder L3 zuordnen.");
      item.status = item.issues.length ? "incomplete" : "running";
    }
    result.devices[device.id] = item;
    const seen = new Set<string>();
    let ancestor: string | null = device.id;
    let primarySide = false;
    while (ancestor && !seen.has(ancestor)) {
      seen.add(ancestor);
      const node: NodeResult = result.nodes[ancestor]!;
      if (!node) break;
      node.deviceIds.push(device.id);
      node.knownPower += item.power ?? 0;
      node.estimated ||= item.estimated;
      if (item.status === "incomplete") node.incompleteCount++;
      if (
        item.current !== null &&
        item.powerFactor !== null &&
        item.phaseIds.length &&
        item.status === "running"
      )
        for (const phase of item.phaseIds) {
          const current =
            item.current *
            (primarySide && transformer ? transformer.secondaryVoltage / transformer.primaryVoltage : 1);
          re[ancestor]![phase] += current * item.powerFactor;
          im[ancestor]![phase] += current * Math.sqrt(Math.max(0, 1 - item.powerFactor ** 2));
        }
      if (transformer && ancestor === transformer.id) primarySide = true;
      ancestor = graph.nodes[ancestor]!.parentId;
    }
  }
  for (const node of Object.values(result.nodes)) {
    const transformer = project.electrical.transformers[node.id];
    if (transformer) node.ratedCurrent = transformer.ratedVA / transformer.secondaryVoltage;
    for (const phase of phases)
      node.phaseCurrents[phase] = Math.hypot(re[node.id]![phase], im[node.id]![phase]);
    const knownMax = Math.max(...Object.values(node.phaseCurrents));
    node.maxCurrent = node.incompleteCount ? null : knownMax;
    node.utilization =
      node.ratedCurrent && node.maxCurrent !== null ? (node.maxCurrent / node.ratedCurrent) * 100 : null;
    node.overload = node.ratedCurrent !== null && knownMax > node.ratedCurrent + 1e-9;
    if (!Number.isFinite(node.knownPower) || !Number.isFinite(knownMax)) {
      node.knownPower = 0;
      node.phaseCurrents = currents();
      node.maxCurrent = null;
      node.utilization = null;
      node.incompleteCount++;
      result.issues.push("Summierte Lasten liegen außerhalb des berechenbaren Bereichs.");
    }
  }
  return result;
}
