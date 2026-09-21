import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";
import { setCableContacts } from "../../src/electrical/contacts";
import { emptyScenario } from "../../src/simulation/models";
import { solveConductors } from "../../src/simulation/conductors";
import { parseProject } from "../../src/core/validation";
import { distributionFixture } from "../electrical/distributionFixture";
import { deleteCircuit } from "../../src/electrical/actions";
import { transact } from "../../src/editor/history/transaction";
function fixture() {
  const project = createProject(),
    floor = project.floorOrder[0]!;
  const source = addElectrical(project, floor, { x: 0, y: 0 }, "supplies"),
    sw = addElectrical(project, floor, { x: 1000, y: 0 }, "switches"),
    device = addElectrical(project, floor, { x: 2000, y: 0 }, "devices");
  project.electrical.supplies[source]!.phases = 1;
  project.electrical.switches[sw]!.closed = true;
  Object.assign(project.electrical.devices[device]!, {
    ratedPower: 230,
    operatingMode: "on",
    ratedVoltage: 230,
  });
  const connect = (a: string, b: string, pairs: string[][]) => {
    const id = addCable(project, a, b, []);
    setCableContacts(
      project,
      id,
      pairs.map(([a, b]) => ({ startContactId: a!, endContactId: b! })),
      false,
    );
    return id;
  };
  const feed = connect(source, sw, [["L", "L"]]);
  connect(sw, device, [["L_OUT", "L"]]);
  const neutral = connect(source, device, [["N", "N"]]);
  return { project, source, sw, device, feed, neutral, connect };
}
describe("Expliziter Leitergraph", () => {
  it("führt Verteilerabgänge über die zugeordneten Schutzkontakte und löst gelöschte Abgänge", () => {
    let { project, source, main, feeder, upstream } = distributionFixture();
    const floor = project.floorOrder[0]!,
      device = addElectrical(project, floor, { x: 3000, y: 0 }, "devices");
    Object.assign(project.electrical.devices[device]!, {
      phases: 3,
      ratedPower: 3000,
      ratedVoltage: 400,
      operatingMode: "on",
    });
    const cable = addCable(project, source, main, []);
    setCableContacts(
      project,
      cable,
      ["L1", "L2", "L3", "N"].map((pin) => ({ startContactId: pin, endContactId: `IN_${pin}` })),
      false,
    );
    const branch = addCable(project, main, device, []);
    setCableContacts(
      project,
      branch,
      ["L1", "L2", "L3"].map((pin) => ({ startContactId: `${feeder}:${pin}`, endContactId: pin })),
      false,
    );
    expect(solveConductors(project, emptyScenario()).devices[0]!).toMatchObject({
      status: "running",
      voltage: 400,
    });
    const scenario = emptyScenario();
    scenario.disabledNodeIds = [upstream];
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("unpowered");
    project = transact(project, (p) => deleteCircuit(p, feeder));
    expect(project.electrical.cables[branch]!.conductorConnections).toEqual([]);
    expect(() => parseProject(project)).not.toThrow();
  });
  it("versorgt über dokumentierte Adern ohne implizite Stromkreiszuordnung", () => {
    const { project, device } = fixture();
    parseProject(project);
    const result = solveConductors(project, emptyScenario());
    expect(result.devices.find((d) => d.id === device)).toMatchObject({
      status: "running",
      voltage: 230,
      current: 1,
      power: 230,
    });
    expect(result.issues).toEqual([]);
  });
  it("benötigt Neutralleiter und geschlossenen Schaltkontakt", () => {
    const { project, neutral, sw } = fixture(),
      scenario = emptyScenario();
    scenario.disabledNodeIds = [neutral];
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("unpowered");
    scenario.disabledNodeIds = [];
    scenario.switchStates[sw] = false;
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("unpowered");
  });
  it("trennt Quelle, Geräte-Aus und fehlende Lastdaten", () => {
    const { project, source, device } = fixture(),
      scenario = emptyScenario();
    scenario.deviceStates[device] = "off";
    expect(solveConductors(project, scenario).devices[0]!).toMatchObject({ status: "off", current: 0 });
    scenario.disabledNodeIds = [source];
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("unpowered");
    scenario.disabledNodeIds = [];
    scenario.deviceStates[device] = "on";
    project.electrical.devices[device]!.ratedPower = null;
    expect(solveConductors(project, scenario).devices[0]!.status).toBe("incomplete");
  });
  it("meldet verbundene Quellen anstatt eine Spannung zu erfinden", () => {
    const { project, source, connect } = fixture();
    const other = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 1000 }, "supplies");
    project.electrical.supplies[other]!.phases = 1;
    connect(source, other, [["L", "L"]]);
    const result = solveConductors(project, emptyScenario());
    expect(result.issues).toHaveLength(1);
    expect(result.devices[0]!.status).toBe("unpowered");
  });
  it("leitet eine ideale Trafosekundärspannung aus der primären Verdrahtung ab", () => {
    const { project, source, device, connect } = fixture();
    project.electrical.cables = {};
    const transformer = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 1000 }, "transformers");
    Object.assign(project.electrical.transformers[transformer]!, {
      primaryVoltage: 230,
      secondaryVoltage: 12,
    });
    project.electrical.devices[device]!.transformerId = transformer;
    project.electrical.devices[device]!.ratedVoltage = 12;
    connect(source, transformer, [
      ["L", "PRI_L"],
      ["N", "PRI_N"],
    ]);
    connect(transformer, device, [
      ["SEC_1", "X1"],
      ["SEC_2", "X2"],
    ]);
    expect(solveConductors(project, emptyScenario()).devices[0]!).toMatchObject({
      voltage: 12,
      status: "running",
    });
  });
  it.each([6, 9, 12, 24])("führt den %s-V-Abgriff mit gemeinsamem Rückleiter", (voltage) => {
    const { project, source, device, connect } = fixture();
    project.electrical.cables = {};
    const tx = addElectrical(project, project.floorOrder[0]!, { x: 1000, y: 1000 }, "transformers");
    Object.assign(project.electrical.transformers[tx]!, {
      secondaryVoltage: 6,
      secondaryVoltages: [6, 9, 12, 24],
    });
    Object.assign(project.electrical.devices[device]!, { transformerId: tx, ratedVoltage: voltage });
    connect(source, tx, [
      ["L", "PRI_L"],
      ["N", "PRI_N"],
    ]);
    connect(tx, device, [
      [`SEC_${voltage}V`, "X1"],
      ["SEC_0", "X2"],
    ]);
    expect(solveConductors(project, emptyScenario()).devices[0]).toMatchObject({
      voltage,
      status: "running",
    });
    const disabled = emptyScenario();
    disabled.disabledNodeIds = [tx];
    expect(solveConductors(project, disabled).devices[0]!.status).toBe("unpowered");
    connect(tx, device, [[`SEC_${voltage === 6 ? 9 : 6}V`, "X1"]]);
    const shorted = solveConductors(project, emptyScenario());
    expect(shorted.issues.length).toBeGreaterThan(0);
    expect(shorted.devices[0]!.status).toBe("unpowered");
  });
});
