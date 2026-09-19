import { describe, expect, it } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical, deleteCircuit } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection, moveSelection } from "../../src/editor/actions/edit";
import { emptyScenario } from "../../src/simulation/models";
import { simulate } from "../../src/simulation/solve";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";
import { useProjectStore } from "../../src/stores/projectStore";

function fixture() {
  const data = simulationFixture([25, 40, 100]);
  const { project, devices, terminal } = data;
  const id = addElectrical(
    project,
    project.electrical.devices[devices[0]!]!.floorId,
    { x: 500, y: 0 },
    "switches",
  );
  project.electrical.switches[id]!.circuitId = terminal;
  for (const device of devices.slice(0, 2))
    Object.assign(project.electrical.devices[device]!, {
      connectionPointId: null,
      circuitId: terminal,
      switchId: id,
    });
  return { ...data, id };
}

describe("Lichtschalter", () => {
  it("schaltet mehrere Lampen im Graphen und lässt andere Verbraucher versorgt", () => {
    const { project, id, devices, terminal } = fixture();
    const before = JSON.stringify(project);
    const scenario = emptyScenario();
    const on = simulate(project, scenario);
    expect(on.graph.nodes[devices[0]!]!.parentId).toBe(id);
    expect(on.nodes[terminal]!.knownPower).toBe(165);
    expect(on.nodes[id]!.knownPower).toBe(65);
    scenario.switchStates[id] = false;
    const off = simulate(project, scenario);
    expect(off.nodes[terminal]!.knownPower).toBe(100);
    expect(off.devices[devices[0]!]!.status).toBe("unpowered");
    expect(off.devices[devices[0]!]!.voltage).toBe(0);
    expect(off.devices[devices[2]!]!.status).toBe("running");
    expect(JSON.stringify(project)).toBe(before);
  });
  it("übernimmt dokumentierte Stellung, respektiert Geräte-Aus und vorgeschaltete Sicherung", () => {
    const { project, id, devices, branch } = fixture();
    project.electrical.switches[id]!.closed = false;
    const scenario = emptyScenario();
    expect(simulate(project, scenario).nodes[id]!.knownPower).toBe(0);
    scenario.switchStates[id] = true;
    scenario.deviceStates[devices[0]!] = "off";
    expect(simulate(project, scenario).nodes[id]!.knownPower).toBe(40);
    scenario.disabledNodeIds.push(branch);
    expect(simulate(project, scenario).devices[devices[1]!]!.status).toBe("unpowered");
  });
  it("lehnt fremde Stromkreise, fehlende Schalter, Steckdosenanschluss und Drehstrom atomar ab", () => {
    const { project, id, devices, feeder, outlet } = fixture();
    for (const mutate of [
      (draft: typeof project) => {
        draft.electrical.switches[id]!.circuitId = feeder;
      },
      (draft: typeof project) => {
        draft.electrical.devices[devices[0]!]!.switchId = crypto.randomUUID();
      },
      (draft: typeof project) => {
        Object.assign(draft.electrical.devices[devices[0]!]!, { circuitId: null, connectionPointId: outlet });
      },
      (draft: typeof project) => {
        draft.electrical.devices[devices[0]!]!.phases = 3;
      },
    ])
      expect(() => transact(project, mutate)).toThrow();
    expect(parseProject(project)).toEqual(project);
  });
  it("dupliziert Schalter, Lampen und Leitungen mit neuen internen Referenzen", () => {
    const { project, id, devices } = fixture();
    const cable = addCable(project, id, devices[0]!, []);
    const next = transact(project, (draft) => {
      const copies = duplicateSelection(draft, [
        { kind: "switches", id },
        { kind: "devices", id: devices[0]! },
        { kind: "cables", id: cable },
      ]);
      const switchCopy = copies.find((item) => item.kind === "switches")!.id;
      const deviceCopy = copies.find((item) => item.kind === "devices")!.id;
      const cableCopy = copies.find((item) => item.kind === "cables")!.id;
      expect(draft.electrical.devices[deviceCopy]!.switchId).toBe(switchCopy);
      expect(draft.electrical.cables[cableCopy]!.startNodeId).toBe(switchCopy);
      expect(draft.electrical.cables[cableCopy]!.endNodeId).toBe(deviceCopy);
    });
    expect(importProjectText(exportProjectText(next))).toEqual(next);
  });
  it("löst beim Löschen Referenzen und Kabel und stellt alles mit Undo wieder her", () => {
    const { project, id, devices } = fixture();
    const cable = addCable(project, id, devices[0]!, []);
    useProjectStore.getState().replace(project);
    useProjectStore
      .getState()
      .commit("Schalter löschen", (draft) => deleteSelection(draft, [{ kind: "switches", id }]));
    const after = useProjectStore.getState().project;
    expect(after.electrical.switches[id]).toBeUndefined();
    expect(after.electrical.devices[devices[0]!]!.switchId).toBeNull();
    expect(after.electrical.cables[cable]).toBeUndefined();
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.electrical).toEqual(project.electrical);
  });
  it("entfernt Stromkreiszuordnungen konsistent und respektiert Ebenensperren", () => {
    const { project, id, devices, terminal } = fixture();
    const next = transact(project, (draft) => deleteCircuit(draft, terminal));
    expect(next.electrical.switches[id]!.circuitId).toBeNull();
    expect(next.electrical.devices[devices[0]!]!.switchId).toBeNull();
    project.layers[project.electrical.switches[id]!.layerId]!.locked = true;
    expect(() =>
      transact(project, (draft) => moveSelection(draft, [{ kind: "switches", id }], { x: 10, y: 0 })),
    ).toThrow(/gesperrt/);
    expect(() => transact(project, (draft) => deleteSelection(draft, [{ kind: "switches", id }]))).toThrow(
      /gesperrt/,
    );
  });
});
