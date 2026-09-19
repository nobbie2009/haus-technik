import { describe, expect, it } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical, deleteCircuit } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";
import { contactsFor, setCableContacts } from "../../src/electrical/contacts";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { parseProject } from "../../src/core/validation";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";

function fixture(reverse = false) {
  const data = simulationFixture([25]);
  const { project, terminal, devices, upper } = data;
  const device = devices[0]!;
  project.electrical.devices[device]!.connectionPointId = null;
  const lightSwitch = addElectrical(project, upper.id, { x: 700, y: 0 }, "switches");
  project.electrical.switches[lightSwitch]!.circuitId = terminal;
  const cable = addCable(project, reverse ? device : lightSwitch, reverse ? lightSwitch : device, []);
  const rows = [{ startContactId: reverse ? "L" : "L_OUT", endContactId: reverse ? "L_OUT" : "L" }];
  return { ...data, device, lightSwitch, cable, rows };
}

describe("Kontaktverbindungen", () => {
  it.each([false, true])(
    "verknüpft L′ und L ausdrücklich und richtungsunabhängig (umgekehrt: %s)",
    (reverse) => {
      const { project, device, lightSwitch, cable, rows, terminal } = fixture(reverse);
      const next = transact(project, (draft) => setCableContacts(draft, cable, rows, true));
      expect(next.electrical.devices[device]).toMatchObject({ switchId: lightSwitch, circuitId: terminal });
      expect(next.electrical.cables[cable]!.connectionAssignment).toBe("switch");
      const scenario = emptyScenario();
      expect(simulate(next, scenario).devices[device]!.power).toBe(25);
      scenario.switchStates[lightSwitch] = false;
      expect(simulate(next, scenario).devices[device]!.status).toBe("unpowered");
      expect(importProjectText(exportProjectText(next))).toEqual(next);
    },
  );
  it("dokumentiert Kontakte ohne bestehende unabhängige Zuordnungen zu ändern", () => {
    const { project, device, cable, rows, lightSwitch, terminal } = fixture();
    project.electrical.devices[device]!.switchId = lightSwitch;
    project.electrical.devices[device]!.circuitId = terminal;
    const next = transact(project, (draft) => setCableContacts(draft, cable, rows, false));
    const removed = transact(next, (draft) => deleteSelection(draft, [{ kind: "cables", id: cable }]));
    expect(removed.electrical.devices[device]!.switchId).toBe(lightSwitch);
  });
  it("verhindert ungültige Kontakte, N/PE-Verwechslung, Doppelbelegung, fehlenden Schaltausgang und zu wenige Adern", () => {
    const { project, cable, rows } = fixture();
    for (const invalid of [
      [{ startContactId: "PE", endContactId: "PE" }],
      [{ startContactId: "L_OUT", endContactId: "N" }],
      [rows[0]!, rows[0]!],
      [{ startContactId: "L", endContactId: "L" }],
    ])
      expect(() => transact(project, (draft) => setCableContacts(draft, cable, invalid, true))).toThrow();
    expect(contactsFor(project, Object.keys(project.electrical.switches)[0]!)).toHaveLength(2);
    expect(() =>
      parseProject({
        ...project,
        electrical: {
          ...project.electrical,
          cables: {
            [cable]: {
              ...project.electrical.cables[cable],
              conductorConnections: [{ startContactId: "NOPE", endContactId: "L" }],
            },
          },
        },
      }),
    ).toThrow();
  });
  it("löst die Anschlusszuordnung beim Löschen oder Umstellen auf reine Dokumentation", () => {
    const { project, device, cable, rows, terminal } = fixture();
    const connected = transact(project, (draft) => setCableContacts(draft, cable, rows, true));
    for (const mutate of [
      (draft: typeof project) => deleteSelection(draft, [{ kind: "cables", id: cable }]),
      (draft: typeof project) => setCableContacts(draft, cable, [], false),
      (draft: typeof project) => deleteCircuit(draft, terminal),
    ]) {
      const detached = transact(connected, mutate);
      expect(detached.electrical.devices[device]!.switchId).toBeNull();
      expect(detached.electrical.devices[device]!.circuitId).toBeNull();
      expect(simulate(detached, emptyScenario()).devices[device]!.status).toBe("unpowered");
    }
    expect(
      transact(connected, (draft) =>
        deleteSelection(draft, [{ kind: "switches", id: connected.electrical.devices[device]!.switchId! }]),
      ).electrical.devices[device]!.circuitId,
    ).toBeNull();
    expect(() =>
      transact(connected, (draft) => {
        draft.electrical.devices[device]!.switchId = null;
      }),
    ).toThrow(/widersprechen/);
  });
  it("dupliziert Belegung mit neuen Endobjekten; eine allein kopierte Leitung übernimmt keine Zuordnung", () => {
    const { project, device, lightSwitch, cable, rows } = fixture();
    const connected = transact(project, (draft) => setCableContacts(draft, cable, rows, true));
    const all = transact(connected, (draft) =>
      duplicateSelection(draft, [
        { kind: "cables", id: cable },
        { kind: "switches", id: lightSwitch },
        { kind: "devices", id: device },
      ]),
    );
    expect(Object.values(all.electrical.cables).every((item) => item.connectionAssignment === "switch")).toBe(
      true,
    );
    const single = transact(connected, (draft) => duplicateSelection(draft, [{ kind: "cables", id: cable }]));
    expect(
      Object.values(single.electrical.cables).filter((item) => item.connectionAssignment === "none"),
    ).toHaveLength(1);
  });
  it("verknüpft Steckdose und Gerät nur bei passender Phasenbelegung und ausreichender Aderzahl", () => {
    const { project, device, outlet } = fixture();
    const cable = addCable(project, outlet, device, []);
    const rows = [
      { startContactId: "L", endContactId: "L" },
      { startContactId: "N", endContactId: "N" },
    ];
    const connected = transact(project, (draft) => setCableContacts(draft, cable, rows, true));
    expect(connected.electrical.devices[device]!.connectionPointId).toBe(outlet);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.conductorCount = 1;
        setCableContacts(draft, cable, rows, true);
      }),
    ).toThrow(/Adern/);
    expect(() =>
      transact(connected, (draft) => {
        draft.electrical.devices[device]!.phases = 3;
      }),
    ).toThrow();
    expect(
      transact(connected, (draft) => deleteSelection(draft, [{ kind: "cables", id: cable }])).electrical
        .devices[device]!.connectionPointId,
    ).toBeNull();
  });
  it("verhindert unbemerkte Umzuordnung und Änderungen gesperrter Objekte", () => {
    const { project, device, lightSwitch, cable, rows, feeder } = fixture();
    project.electrical.devices[device]!.circuitId = feeder;
    expect(() => transact(project, (draft) => setCableContacts(draft, cable, rows, true))).toThrow(
      /zuerst lösen/,
    );
    project.electrical.devices[device]!.circuitId = null;
    const connected = transact(project, (draft) => setCableContacts(draft, cable, rows, true));
    const extra = addCable(connected, lightSwitch, device, []);
    expect(() => transact(connected, (draft) => setCableContacts(draft, extra, rows, true))).toThrow(
      /bereits/,
    );
    project.layers[project.electrical.devices[device]!.layerId]!.locked = true;
    expect(() => transact(project, (draft) => setCableContacts(draft, cable, rows, true))).toThrow(
      /gesperrt/,
    );
  });
});
