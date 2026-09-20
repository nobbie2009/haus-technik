import { describe, expect, it } from "vitest";
import { conductorFixture, relayConductorFixture } from "./conductorFixture";
import { emptyScenario } from "../../src/simulation/models";
import { solveConductors, pulseConductorSwitch } from "../../src/simulation/conductors";
import { addElectrical } from "../../src/electrical/actions";
import { parseProject } from "../../src/core/validation";
import { cleanScenario, scenarioSchema } from "../../src/housebook/model";
import { newId } from "../../src/utils/uuid";

describe("Verdrahtete Relaissteuerung", () => {
  it("schaltet nur durch eine steigende Spulenspannung, ohne Dokumentänderung", () => {
    const { project, relay, button, device } = relayConductorFixture();
    parseProject(project);
    const before = JSON.stringify(project),
      scenario = emptyScenario();
    expect(solveConductors(project, scenario).devices.find((d) => d.id === device)!.status).toBe("unpowered");
    expect(pulseConductorSwitch(project, scenario, button)).toEqual([relay]);
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("running");
    expect(pulseConductorSwitch(project, scenario, button)).toEqual([relay]);
    expect(scenario.relayStates[relay]).toBe(false);
    expect(scenario.switchStates).toEqual({});
    expect(JSON.stringify(project)).toBe(before);
  });
  it.each(["cable", "neutral", "source", "button", "relay"])(
    "unterbrochener Steuerkreis (%s) erzeugt keinen Impuls",
    (kind) => {
      const { project, button, relay, controlCable, source } = relayConductorFixture();
      const scenario = emptyScenario();
      if (kind === "neutral") {
        for (const cable of Object.values(project.electrical.cables))
          cable.conductorConnections = cable.conductorConnections.filter((p) => p.endContactId !== "A2");
      } else scenario.disabledNodeIds = [{ cable: controlCable, source, button, relay }[kind as "cable"]!];
      expect(pulseConductorSwitch(project, scenario, button)).toEqual([]);
      expect(scenario.relayStates).toEqual({});
    },
  );
  it("behält den bistabilen Zustand bei Spannungsausfall und toggelt einen gehaltenen Taster nicht erneut", () => {
    const { project, relay, button, source } = relayConductorFixture();
    const scenario = emptyScenario();
    pulseConductorSwitch(project, scenario, button);
    scenario.disabledNodeIds = [source];
    pulseConductorSwitch(project, scenario, button);
    expect(scenario.relayStates[relay]).toBe(true);
    scenario.disabledNodeIds = [];
    scenario.switchStates[button] = true;
    expect(pulseConductorSwitch(project, scenario, button)).toEqual([]);
    expect(scenario.relayStates[relay]).toBe(true);
  });
});

describe("Fehlerströme und idealisierte FI-Reaktion", () => {
  it("ein Neutralleiter am FI vorbei erzeugt auch bei L–N einen Differenzstrom", () => {
    const { project, device, source, load, connect, rcd } = conductorFixture(),
      scenario = emptyScenario();
    project.electrical.cables[load]!.conductorConnections = project.electrical.cables[
      load
    ]!.conductorConnections.filter((p) => p.endContactId !== "N");
    connect(source, device, [["N", "N"]]);
    scenario.conductorFaults = [{ deviceId: device, kind: "line-neutral", resistanceOhms: 4600 }];
    expect(solveConductors(project, scenario).trippedProtectionIds).toEqual([rcd]);
  });
  it("addiert symmetrische dreiphasige Fehlerströme vektoriell statt betragsmäßig", () => {
    const { project, device, source, board, circuit, feed, floor, connect } = conductorFixture(),
      scenario = emptyScenario();
    project.electrical.supplies[source]!.phases = 3;
    delete project.electrical.cables[feed];
    connect(
      source,
      board,
      ["L1", "L2", "L3", "N", "PE"].map((pin) => [pin, `IN_${pin}`]),
    );
    const devices = [device];
    for (const phase of ["L2", "L3"] as const) {
      const id = newId();
      project.electrical.circuits[id] = { ...project.electrical.circuits[circuit]!, id, phase };
      const other = addElectrical(project, floor, { x: devices.length * 1000, y: 1000 }, "devices");
      connect(board, other, [
        [`${id}:L`, "L"],
        [`${id}:PE`, "PE"],
      ]);
      devices.push(other);
    }
    scenario.conductorFaults = devices.map((deviceId) => ({
      deviceId,
      kind: "line-pe",
      resistanceOhms: 4600,
    }));
    const result = solveConductors(project, scenario);
    expect(result.protections[0]!.residualMilliAmps).toBeCloseTo(0, 9);
    expect(result.trippedProtectionIds).toEqual([]);
    expect(result.faults.every((f) => f.status === "active")).toBe(true);
  });
  it("berechnet 50 mA, öffnet den verdrahteten 30-mA-FI und erhält das Projekt/Szenario", () => {
    const { project, device, rcd } = conductorFixture();
    parseProject(project);
    const scenario = emptyScenario();
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 4600 }];
    const before = JSON.stringify({ project, scenario });
    const result = solveConductors(project, scenario);
    expect(result.faults[0]).toMatchObject({ initialCurrent: 0.05, current: 0, status: "cleared" });
    expect(result.trippedProtectionIds).toEqual([rcd]);
    expect(result.devices[0]!.status).toBe("unpowered");
    expect(JSON.stringify({ project, scenario })).toBe(before);
  });
  it("ein L–N-Fehler löst bei gemeinsamem Rückweg keinen FI aus", () => {
    const { project, device } = conductorFixture(),
      scenario = emptyScenario();
    scenario.conductorFaults = [{ deviceId: device, kind: "line-neutral", resistanceOhms: 4.6 }];
    const result = solveConductors(project, scenario);
    expect(result.faults[0]!.current).toBeCloseTo(50);
    expect(result.protections[0]!.residualMilliAmps).toBe(0);
    expect(result.trippedProtectionIds).toEqual([]);
  });
  it("fehlender PE ist unbekannt statt null Fehlerstrom oder erfolgreiche Abschaltung", () => {
    const { project, device, load } = conductorFixture(),
      scenario = emptyScenario();
    project.electrical.cables[load]!.conductorConnections = project.electrical.cables[
      load
    ]!.conductorConnections.filter((p) => p.endContactId !== "PE");
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 4600 }];
    const result = solveConductors(project, scenario);
    expect(result.faults[0]).toMatchObject({ current: null, status: "incomplete" });
    expect(result.trippedProtectionIds).toEqual([]);
  });
  it("summiert zwei gleichphasige Fehler von je 20 mA am gemeinsamen FI", () => {
    const { project, floor, board, circuit, device, connect, rcd } = conductorFixture(),
      scenario = emptyScenario();
    const other = addElectrical(project, floor, { x: 4000, y: 0 }, "devices");
    connect(board, other, [
      [`${circuit}:L`, "L"],
      [`${circuit}:PE`, "PE"],
    ]);
    scenario.conductorFaults = [device, other].map((deviceId) => ({
      deviceId,
      kind: "line-pe",
      resistanceOhms: 11500,
    }));
    const result = solveConductors(project, scenario);
    expect(result.trippedProtectionIds).toEqual([rcd]);
    expect(result.protections[0]!.residualMilliAmps).toBeCloseTo(40);
  });
  it("unterhalb der Schwelle bleibt der Fehler aktiv; fehlende Schwelle ist unbestimmt", () => {
    const { project, device, rcd } = conductorFixture(),
      scenario = emptyScenario();
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 23000 }];
    expect(solveConductors(project, scenario).faults[0]!.status).toBe("active");
    project.electrical.protectionDevices[rcd]!.residualCurrent = null;
    expect(solveConductors(project, scenario).protections[0]!.status).toBe("uncertain");
  });
  it("behauptet bei parallelen Speisepfaden keine bestimmte FI-Reaktion", () => {
    const { project, source, device, connect } = conductorFixture(),
      scenario = emptyScenario();
    connect(source, device, [["L", "L"]]);
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 4600 }];
    const result = solveConductors(project, scenario);
    expect(result.faults[0]!.issues.join(" ")).toContain("Parallele");
    expect(result.trippedProtectionIds).toEqual([]);
  });
  it("schaltet PE auch bei deaktiviertem FI nicht ab", () => {
    const { project, device, source, load, rcd, connect } = conductorFixture(),
      scenario = emptyScenario();
    project.electrical.cables[load]!.conductorConnections = project.electrical.cables[
      load
    ]!.conductorConnections.filter((p) => p.endContactId !== "L");
    connect(source, device, [["L", "L"]]);
    scenario.disabledNodeIds = [rcd];
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 4600 }];
    expect(solveConductors(project, scenario).faults[0]).toMatchObject({ current: 0.05, status: "active" });
  });
  it("validiert neue Szenarien und lädt alte ohne Übernahme vorheriger Fehler", () => {
    const { project, device } = conductorFixture(),
      scenario = emptyScenario();
    expect(cleanScenario(project, scenario).conductorFaults).toEqual([]);
    scenario.conductorFaults = [{ deviceId: device, kind: "line-pe", resistanceOhms: 0 }];
    expect(scenarioSchema.safeParse(scenario).success).toBe(false);
    scenario.conductorFaults[0]!.resistanceOhms = 4600;
    expect(scenarioSchema.parse(scenario).conductorFaults).toEqual(scenario.conductorFaults);
    delete project.electrical.devices[device];
    expect(cleanScenario(project, scenario).conductorFaults).toEqual([]);
  });
});
