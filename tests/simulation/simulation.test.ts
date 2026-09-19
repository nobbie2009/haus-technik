import { describe, expect, it } from "vitest";
import { simulationFixture } from "./fixture";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { calculateLoad } from "../../src/simulation/load";
import { addElectrical } from "../../src/electrical/actions";
import { useProjectStore } from "../../src/stores/projectStore";
import { useSimulationStore } from "../../src/stores/simulationStore";

describe("Statische Stromkreissimulation", () => {
  it("berechnet 2255 W, 9,804 A und 61,28 % für das B16-Beispiel über einen unabhängigen Graphen", () => {
    const { project, terminal, branch, source } = simulationFixture();
    const before = JSON.stringify(project);
    const result = simulate(project, emptyScenario());
    expect(result.nodes[terminal]!.knownPower).toBe(2255);
    expect(result.nodes[terminal]!.maxCurrent).toBeCloseTo(2255 / 230, 8);
    expect(result.nodes[branch]!.utilization).toBeCloseTo((2255 / 230 / 16) * 100, 8);
    expect(result.nodes[source]!.deviceIds).toHaveLength(4);
    expect(result.nodes[source]!.estimated).toBe(true);
    expect(
      result.graph.edges.every((edge) => result.graph.nodes[edge.from] && result.graph.nodes[edge.to]),
    ).toBe(true);
    expect(JSON.stringify(project)).toBe(before);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("summiert unterschiedliche Wirk- und Blindstromanteile statt Strombeträge", () => {
    const { project, devices, terminal } = simulationFixture([230, 230]);
    project.electrical.devices[devices[0]!]!.powerFactor = 1;
    project.electrical.devices[devices[1]!]!.powerFactor = 0.5;
    const result = simulate(project, emptyScenario());
    expect(result.nodes[terminal]!.maxCurrent).toBeCloseTo(Math.sqrt(7), 8);
    expect(result.nodes[terminal]!.knownPower).toBe(460);
    expect(result.nodes[terminal]!.estimated).toBe(false);
  });
  it("kennzeichnet fehlenden Leistungsfaktor ohne stillschweigende Annahme", () => {
    const { project, terminal } = simulationFixture([230]);
    const result = simulate(project, { ...emptyScenario(), assumeUnityPowerFactor: false });
    expect(result.nodes[terminal]).toMatchObject({
      knownPower: 230,
      maxCurrent: null,
      incompleteCount: 1,
      utilization: null,
    });
  });
  it("berechnet aus Strom und Faktor die Leistung, oder aus P und I den Faktor", () => {
    const { project, devices } = simulationFixture([230]);
    const device = project.electrical.devices[devices[0]!]!;
    device.ratedCurrent = 2;
    expect(calculateLoad(device, 230, false)).toMatchObject({
      power: 230,
      current: 2,
      powerFactor: 0.5,
      estimated: false,
    });
    device.ratedPower = null;
    device.powerFactor = 0.5;
    expect(calculateLoad(device, 230, false)).toMatchObject({ power: 230, current: 2, powerFactor: 0.5 });
  });
  it("weist widersprüchliche Spannung oder Kennwerte und nicht bestimmbare Blindlast aus", () => {
    const { project, devices } = simulationFixture([230]);
    const device = project.electrical.devices[devices[0]!]!;
    device.ratedVoltage = 120;
    expect(calculateLoad(device, 230, true)).toMatchObject({ power: null, current: null });
    device.ratedVoltage = null;
    device.ratedCurrent = 0.5;
    expect(calculateLoad(device, 230, true).issues.join()).toContain("unvereinbar");
    device.ratedCurrent = null;
    device.ratedPower = 0;
    device.powerFactor = 0;
    expect(calculateLoad(device, 230, false).current).toBeNull();
    device.ratedCurrent = 2;
    expect(calculateLoad(device, 230, false)).toMatchObject({ power: 0, current: 2 });
  });
  it("rechnet symmetrischen Drehstrom mit Außenleiterspannung und Strom je Phase", () => {
    const { project, devices, terminal } = simulationFixture([Math.sqrt(3) * 400 * 10 * 0.8]);
    project.electrical.circuits[terminal]!.phase = "L1/L2/L3";
    Object.assign(project.electrical.devices[devices[0]!]!, { phases: 3, powerFactor: 0.8 });
    const result = simulate(project, emptyScenario());
    expect(result.devices[devices[0]!]!.voltage).toBe(400);
    for (const current of Object.values(result.nodes[terminal]!.phaseCurrents))
      expect(current).toBeCloseTo(10, 8);
  });
  it("zählt Lasten in Unterverteilungen und direkt an der Zuleitung genau einmal", () => {
    const { project, feeder, terminal, source, upper } = simulationFixture();
    const direct = addElectrical(project, upper.id, { x: 0, y: 0 }, "devices");
    Object.assign(project.electrical.devices[direct]!, {
      circuitId: feeder,
      phases: 3,
      ratedPower: 1000,
      powerFactor: 1,
      operatingMode: "on",
    });
    const result = simulate(project, emptyScenario());
    expect(result.nodes[feeder]!.knownPower).toBe(3255);
    expect(result.nodes[terminal]!.knownPower).toBe(2255);
    expect(result.nodes[source]!.knownPower).toBe(3255);
    expect(result.nodes[source]!.deviceIds).toHaveLength(5);
  });
  it("schaltet eine Sicherung samt allen nachgeschalteten Verbrauchern im Graphen ab", () => {
    const { project, devices, upstream, terminal } = simulationFixture();
    const result = simulate(project, { ...emptyScenario(), disabledNodeIds: [upstream] });
    for (const id of devices)
      expect(result.devices[id]).toMatchObject({ status: "unpowered", power: 0, current: 0, voltage: 0 });
    expect(result.nodes[terminal]!.knownPower).toBe(0);
  });
  it("erkennt Überlast, ohne eine zeitlose B16-Auslösekennlinie vorzutäuschen", () => {
    const { project, branch, devices } = simulationFixture([4600]);
    const result = simulate(project, emptyScenario());
    expect(result.nodes[branch]).toMatchObject({ overload: true, utilization: 125, maxCurrent: 20 });
    expect(result.devices[devices[0]!]!.status).toBe("running");
    project.electrical.protectionDevices[branch]!.type = "RCD";
    expect(simulate(project, emptyScenario()).nodes[branch]!.overload).toBe(true);
  });
  it("summiert gemeinsam geschützte Stromkreise und schaltet sie gemeinsam ab", () => {
    const { project, terminal, branch, devices, upper } = simulationFixture([2300]);
    const other = { ...project.electrical.circuits[terminal]!, id: crypto.randomUUID() };
    project.electrical.circuits[other.id] = other;
    const device = addElectrical(project, upper.id, { x: 100, y: 0 }, "devices");
    Object.assign(project.electrical.devices[device]!, {
      circuitId: other.id,
      ratedPower: 2300,
      operatingMode: "on",
    });
    const result = simulate(project, emptyScenario());
    expect(result.nodes[branch]!.maxCurrent).toBe(20);
    expect(result.nodes[terminal]!.maxCurrent).toBe(10);
    const disconnected = simulate(project, { ...emptyScenario(), disabledNodeIds: [branch] });
    for (const id of [...devices, device]) expect(disconnected.devices[id]!.status).toBe("unpowered");
  });
  it("schaltet eine Phase ab, ohne Verbraucher einer anderen Phase abzuschalten", () => {
    const { project, terminal, devices, source, upper } = simulationFixture([230]);
    const other = {
      ...project.electrical.circuits[terminal]!,
      id: crypto.randomUUID(),
      phase: "L2" as const,
    };
    project.electrical.circuits[other.id] = other;
    const device = addElectrical(project, upper.id, { x: 100, y: 0 }, "devices");
    Object.assign(project.electrical.devices[device]!, {
      circuitId: other.id,
      ratedPower: 230,
      operatingMode: "on",
    });
    const result = simulate(project, { ...emptyScenario(), disabledPhases: { [source]: ["L1"] } });
    expect(result.devices[devices[0]!]!.status).toBe("unpowered");
    expect(result.devices[device]!.status).toBe("running");
    expect(result.nodes[source]!.phaseCurrents).toEqual({ L1: 0, L2: 1, L3: 0 });
  });
  it("verschiebt Lasten mit unbekannter Phase bei Phasenausfall nicht auf die verbleibende Phase", () => {
    const { project, terminal, source, devices } = simulationFixture([230]);
    project.electrical.circuits[terminal]!.phase = "unknown";
    const result = simulate(project, { ...emptyScenario(), disabledPhases: { [source]: ["L1", "L2"] } });
    expect(result.devices[devices[0]!]!).toMatchObject({
      status: "incomplete",
      power: null,
      current: null,
      phaseIds: [],
    });
    expect(result.nodes[source]!.maxCurrent).toBeNull();
  });
  it("fordert alle Phasen für Drehstromverbraucher und erkennt inkompatible Zuordnungen", () => {
    const { project, terminal, devices, source } = simulationFixture([1000]);
    project.electrical.devices[devices[0]!]!.phases = 3;
    expect(simulate(project, emptyScenario()).devices[devices[0]!]!.status).toBe("incomplete");
    project.electrical.circuits[terminal]!.phase = "L1/L2/L3";
    expect(
      simulate(project, { ...emptyScenario(), disabledPhases: { [source]: ["L2"] } }).devices[devices[0]!]!
        .status,
    ).toBe("unpowered");
  });
  it("erzeugt ohne Einspeisung keine Versorgung allein aus der Standardspannung", () => {
    const { project, main, devices } = simulationFixture([230]);
    project.electrical.distributionBoards[main]!.supplyId = null;
    expect(simulate(project, emptyScenario()).devices[devices[0]!]!).toMatchObject({
      status: "unpowered",
      voltage: null,
      power: 0,
    });
  });
  it("zeigt fehlende Daten und Standby als unvollständig, ausgeschaltete Geräte aber mit Nulllast", () => {
    const { project, devices, terminal } = simulationFixture([230, 230, 230]);
    project.electrical.devices[devices[0]!]!.ratedPower = null;
    project.electrical.devices[devices[1]!]!.operatingMode = "standby";
    project.electrical.devices[devices[2]!]!.operatingMode = "off";
    const result = simulate(project, emptyScenario());
    expect(result.nodes[terminal]!.incompleteCount).toBe(2);
    expect(result.devices[devices[2]!]!).toMatchObject({ status: "off", power: 0, current: 0, voltage: 230 });
  });
  it("lässt Projekt, Historie und Autosave durch Schaltversuche unverändert und beendet bei Dokumentänderung", () => {
    const { project, devices } = simulationFixture();
    useProjectStore.getState().replace(project);
    const before = useProjectStore.getState();
    useSimulationStore.getState().start();
    useSimulationStore.getState().update((scenario) => {
      scenario.deviceStates[devices[0]!] = "off";
    });
    expect(useProjectStore.getState()).toBe(before);
    expect(useSimulationStore.getState().result!.devices[devices[0]!]!.status).toBe("off");
    useProjectStore.getState().commit("Projektname", (draft) => {
      draft.name = "Änderung";
    });
    expect(useSimulationStore.getState()).toMatchObject({ active: false, result: null });
  });
});
