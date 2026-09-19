import { describe, it, expect } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical } from "../../src/electrical/actions";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { parseProject } from "../../src/core/validation";
import { objectSupply } from "../../src/electrical/supply";
import { deleteSelection } from "../../src/editor/actions/edit";
import { transact } from "../../src/editor/history/transaction";

describe("Idealer Klingeltransformator", () => {
  it("berechnet Sekundärspannung und reflektiert nur den Primärstrom an Sicherungen", () => {
    const { project, devices, terminal, source, branch } = simulationFixture([4]);
    const id = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 1000 }, "transformers");
    project.electrical.transformers[id]!.circuitId = terminal;
    const device = project.electrical.devices[devices[0]!]!;
    Object.assign(device, {
      connectionPointId: null,
      circuitId: terminal,
      transformerId: id,
      ratedVoltage: 8,
      powerFactor: 1,
    });
    parseProject(project);
    const before = JSON.stringify(project),
      scenario = emptyScenario();
    let result = simulate(project, scenario);
    expect(result.devices[device.id]!.voltage).toBe(8);
    expect(result.devices[device.id]!.current).toBeCloseTo(0.5);
    expect(result.nodes[id]!.maxCurrent).toBeCloseTo(0.5);
    expect(result.nodes[id]!.utilization).toBeCloseTo(50);
    expect(result.nodes[branch]!.maxCurrent).toBeCloseTo(4 / 230);
    expect(result.nodes[source]!.knownPower).toBe(4);
    expect(objectSupply(project, "devices", device.id).voltage).toBe(8);
    scenario.disabledNodeIds = [branch];
    result = simulate(project, scenario);
    expect(result.devices[device.id]!.status).toBe("unpowered");
    expect(result.nodes[source]!.knownPower).toBe(0);
    expect(JSON.stringify(project)).toBe(before);
    const detached = transact(project, (p) => deleteSelection(p, [{ kind: "transformers", id }]));
    expect(detached.electrical.devices[device.id]!.circuitId).toBeNull();
  });
  it("meldet Überlast in VA und behandelt fehlende Daten als unvollständig", () => {
    const { project, devices, terminal, branch, upper } = simulationFixture([6]);
    const id = addElectrical(project, upper.id, { x: 0, y: 1000 }, "transformers");
    project.electrical.transformers[id]!.circuitId = terminal;
    const device = project.electrical.devices[devices[0]!]!;
    Object.assign(device, {
      connectionPointId: null,
      circuitId: terminal,
      transformerId: id,
      ratedVoltage: 8,
      powerFactor: 0.5,
    });
    let result = simulate(project, emptyScenario());
    expect(result.nodes[id]!.overload).toBe(true);
    expect(result.nodes[id]!.utilization).toBeCloseTo(150);
    expect(result.nodes[branch]!.maxCurrent).toBeCloseTo(12 / 230);
    device.ratedPower = null;
    result = simulate(project, emptyScenario());
    expect(result.nodes[id]!.maxCurrent).toBeNull();
    expect(result.nodes[id]!.incompleteCount).toBe(1);
    expect(() =>
      transact(project, (p) => {
        p.electrical.transformers[id]!.primaryVoltage = 0;
      }),
    ).toThrow();
  });
});
