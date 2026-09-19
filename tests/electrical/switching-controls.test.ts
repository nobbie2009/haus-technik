import { describe, it, expect } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical, deleteCircuit } from "../../src/electrical/actions";
import { emptyScenario } from "../../src/simulation/models";
import { simulate } from "../../src/simulation/solve";
import { operateSwitch } from "../../src/simulation/operateSwitch";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { switchRole } from "../../src/electrical/switchingControls";

export function controlFixture(count = 3) {
  const data = simulationFixture([25]);
  const { project, upper, terminal, devices } = data;
  const group = addElectrical(project, upper.id, { x: 0, y: -1500 }, "controls");
  const switches = Array.from({ length: count }, (_, i) =>
    addElectrical(project, upper.id, { x: i * 1500, y: 0 }, "switches"),
  );
  switches.forEach((id) => {
    project.electrical.switches[id]!.circuitId = terminal;
  });
  Object.assign(project.electrical.controls[group]!, { circuitId: terminal, switchIds: switches });
  Object.assign(project.electrical.devices[devices[0]!]!, {
    circuitId: terminal,
    connectionPointId: null,
    controlId: group,
  });
  return { ...data, group, switches, device: devices[0]! };
}
describe("Wechsel-, Kreuz- und Stromstoßschaltung", () => {
  it.each([2, 3, 4])("jede der %s Schaltstellen invertiert den Ausgang aus jeder Stellung", (count) => {
    const { project, switches, device, group } = controlFixture(count);
    const before = JSON.stringify(project);
    parseProject(project);
    expect(switchRole(project, switches[0]!)).toBe("Wechselschalter");
    if (count > 2) expect(switchRole(project, switches[1]!)).toBe("Kreuzschalter");
    for (let mask = 0; mask < 2 ** count; mask++) {
      const scenario = emptyScenario();
      switches.forEach((id, i) => {
        scenario.switchStates[id] = !!(mask & (1 << i));
      });
      const initial = simulate(project, scenario).devices[device]!.status;
      for (const id of switches) {
        const next = structuredClone(scenario);
        operateSwitch(project, next, id);
        expect(simulate(project, next).devices[device]!.status).not.toBe(initial);
        operateSwitch(project, next, id);
        expect(simulate(project, next).devices[device]!.status).toBe(initial);
      }
    }
    project.electrical.controls[group]!.inverted = true;
    expect(simulate(project, emptyScenario()).devices[device]!.status).toBe("unpowered");
    project.electrical.controls[group]!.inverted = false;
    expect(JSON.stringify(project)).toBe(before);
  });
  it("mehrere Taster schalten ein Relais, Spannungsausfall verhindert Impulse und erhält den Zustand", () => {
    const { project, switches, device, group, branch } = controlFixture();
    project.electrical.controls[group]!.mode = "impulseRelay";
    const scenario = emptyScenario();
    const before = JSON.stringify(project);
    expect(simulate(project, scenario).devices[device]!.status).toBe("unpowered");
    operateSwitch(project, scenario, switches[0]!);
    expect(simulate(project, scenario).devices[device]!.status).toBe("running");
    expect(scenario.switchStates).toEqual({});
    scenario.disabledNodeIds = [branch];
    operateSwitch(project, scenario, switches[1]!);
    expect(scenario.relayStates[group]).toBe(true);
    expect(simulate(project, scenario).devices[device]!.status).toBe("unpowered");
    scenario.disabledNodeIds = [];
    expect(simulate(project, scenario).devices[device]!.status).toBe("running");
    operateSwitch(project, scenario, switches[2]!);
    expect(simulate(project, scenario).devices[device]!.status).toBe("unpowered");
    expect(JSON.stringify(project)).toBe(before);
  });
  it("verhindert doppelte, zyklische und widersprüchliche Zuordnungen", () => {
    const { project, group, switches, device } = controlFixture();
    expect(() =>
      transact(project, (p) => {
        p.electrical.controls[group]!.switchIds.push(switches[0]!);
      }),
    ).toThrow();
    expect(() =>
      transact(project, (p) => {
        p.electrical.switches[switches[0]!]!.supply = { kind: "switch", switchId: switches[1]! };
      }),
    ).toThrow();
    expect(() =>
      transact(project, (p) => {
        p.electrical.devices[device]!.switchId = switches[0]!;
      }),
    ).toThrow();
    expect(() =>
      transact(project, (p) => {
        p.electrical.controls[group]!.switchIds = [crypto.randomUUID()];
      }),
    ).toThrow();
  });
  it("Löschen einer Schaltstelle trennt die Gruppe, Kopieren referenziert nur kopierte Mitglieder", () => {
    const { project, group, switches, device, terminal } = controlFixture();
    const removed = transact(project, (p) => deleteSelection(p, [{ kind: "switches", id: switches[1]! }]));
    expect(simulate(removed, emptyScenario()).devices[device]!.status).toBe("unpowered");
    const copied = transact(project, (p) =>
      duplicateSelection(p, [
        { kind: "controls", id: group },
        ...switches.map((id) => ({ kind: "switches" as const, id })),
        { kind: "devices", id: device },
      ]),
    );
    const next = Object.values(copied.electrical.controls).find((g) => g.id !== group)!;
    expect(next.switchIds).toHaveLength(3);
    expect(next.switchIds.some((id) => switches.includes(id))).toBe(false);
    const detached = transact(project, (p) => deleteCircuit(p, terminal));
    expect(detached.electrical.controls[group]!.switchIds).toEqual([]);
    expect(detached.electrical.devices[device]!.controlId).toBeNull();
  });
});
