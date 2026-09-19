import { describe, expect, it } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical, deleteCircuit } from "../../src/electrical/actions";
import { setSwitchSupply, switchChain } from "../../src/electrical/switchTopology";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { parseProject } from "../../src/core/validation";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";

function fixture() {
  const data = simulationFixture([25, 100]);
  const { project, upper, terminal, devices } = data;
  const switches = [0, 1, 2].map((i) => {
    const id = addElectrical(project, upper.id, { x: 400 + i * 500, y: 1000 }, "switches");
    project.electrical.switches[id]!.circuitId = terminal;
    return id;
  });
  setSwitchSupply(project, switches[1]!, { kind: "switch", switchId: switches[0]! });
  setSwitchSupply(project, switches[2]!, { kind: "switch", switchId: switches[1]! });
  Object.assign(project.electrical.devices[devices[0]!]!, {
    switchId: switches[2],
    circuitId: terminal,
    connectionPointId: null,
  });
  Object.assign(project.electrical.devices[devices[1]!]!, {
    switchId: switches[0],
    circuitId: terminal,
    connectionPointId: null,
  });
  return { ...data, switches };
}

describe("Schalter in Reihe", () => {
  it("versorgt eine Lampe nur bei drei geschlossenen Schaltern; Abzweige und gemeinsame Lasten bleiben korrekt", () => {
    const { project, switches, devices, terminal } = fixture();
    for (let combination = 0; combination < 8; combination++) {
      const scenario = emptyScenario();
      switches.forEach((id, i) => {
        scenario.switchStates[id] = !!(combination & (1 << i));
      });
      const result = simulate(project, scenario);
      expect(result.devices[devices[0]!]!.status).toBe(combination === 7 ? "running" : "unpowered");
      expect(result.devices[devices[1]!]!.status).toBe(combination & 1 ? "running" : "unpowered");
      expect(result.nodes[terminal]!.knownPower).toBe(
        (combination === 7 ? 25 : 0) + (combination & 1 ? 100 : 0),
      );
    }
    expect(switchChain(project, switches[2]!).switches.map((item) => item.id)).toEqual(switches);
    expect(importProjectText(exportProjectText(project))).toEqual(project);
  });
  it("verhindert Kreise, fehlende Referenzen und Verbindungen unterschiedlicher Stromkreise", () => {
    const { project, switches, feeder } = fixture();
    expect(() =>
      transact(project, (draft) =>
        setSwitchSupply(draft, switches[0]!, { kind: "switch", switchId: switches[2]! }),
      ),
    ).toThrow(/Kreis/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.switches[switches[0]!]!.supply = { kind: "switch", switchId: switches[2]! };
      }),
    ).toThrow(/Kreis/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.switches[switches[1]!]!.circuitId = feeder;
      }),
    ).toThrow(/Stromkreis/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.switches[switches[0]!]!.supply = { kind: "switch", switchId: crypto.randomUUID() };
      }),
    ).toThrow(/fehlt/);
    expect(parseProject(project)).toEqual(project);
  });
  it("trennt die Versorgung bei entferntem Vorgänger statt den offenen Abschnitt zu überbrücken", () => {
    const { project, switches, devices, terminal } = fixture();
    const removed = transact(project, (draft) =>
      deleteSelection(draft, [{ kind: "switches", id: switches[1]! }]),
    );
    expect(removed.electrical.switches[switches[2]!]!.supply).toEqual({ kind: "disconnected" });
    expect(simulate(removed, emptyScenario()).devices[devices[0]!]!.status).toBe("unpowered");
    expect(simulate(removed, emptyScenario()).devices[devices[1]!]!.status).toBe("running");
    const deletedCircuit = transact(project, (draft) => deleteCircuit(draft, terminal));
    expect(
      Object.values(deletedCircuit.electrical.switches).every((item) => item.supply.kind === "disconnected"),
    ).toBe(true);
  });
  it("remappt kopierte Schalterketten und schützt gesperrte nachgeschaltete Objekte", () => {
    const { project, switches, devices } = fixture();
    const copied = transact(project, (draft) => {
      const selection = duplicateSelection(draft, [
        ...switches.map((id) => ({ kind: "switches" as const, id })),
        { kind: "devices", id: devices[0]! },
      ]);
      const newDevice = draft.electrical.devices[selection.find((item) => item.kind === "devices")!.id]!;
      const chain = switchChain(draft, newDevice.switchId!).switches;
      expect(chain).toHaveLength(3);
      expect(chain.every((item) => !switches.includes(item.id))).toBe(true);
    });
    expect(Object.keys(copied.electrical.switches)).toHaveLength(6);
    project.layers[project.electrical.switches[switches[0]!]!.layerId]!.locked = true;
    expect(() =>
      transact(project, (draft) => setSwitchSupply(draft, switches[1]!, { kind: "circuit" })),
    ).toThrow(/gesperrt/);
  });
});
