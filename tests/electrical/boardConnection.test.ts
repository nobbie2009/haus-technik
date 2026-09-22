import { expect, it } from "vitest";
import { distributionFixture } from "./distributionFixture";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import { addElectrical } from "../../src/electrical/actions";
import { boardCircuit, suggestBoardContacts, assignBoardTarget } from "../../src/electrical/boardConnection";
import { addCable } from "../../src/electrical/cables";
import { setCableContacts, contactsFor } from "../../src/electrical/contacts";
import { transact } from "../../src/editor/history/transaction";

it.each([false, true])("legt Sicherungsabgang und Kontakte atomar an, umgekehrt %s", (reverse) => {
  const { project, main, outlet } = distributionFixture();
  project.electrical.outlets[outlet]!.circuitId = null;
  const protection = addProtectionDevice(project, main);
  const id = crypto.randomUUID();
  const next = transact(project, (d) => {
    const circuit = boardCircuit(d, main, `protection:${protection}`, id)!;
    const cable = addCable(d, reverse ? outlet : main, reverse ? main : outlet, []);
    setCableContacts(d, cable, suggestBoardContacts(d, main, outlet, circuit, reverse), false);
    d.electrical.cables[cable]!.circuitId = circuit;
    assignBoardTarget(d, outlet, circuit);
  });
  expect(next.electrical.circuits[id]!.protectionDeviceId).toBe(protection);
  expect(next.electrical.outlets[outlet]!.circuitId).toBe(id);
  expect(Object.values(next.electrical.cables)[0]!.conductorConnections).toHaveLength(3);
  expect(project.electrical.circuits[id]).toBeUndefined();
  expect(contactsFor(next, main).find((c) => c.id === `${id}:L`)!.label).toContain(
    next.electrical.protectionDevices[protection]!.label,
  );
});

it("verwendet vorhandene Stromkreise und weist fremde Sicherungen zurück", () => {
  const { project, main, sub, terminal, upstream } = distributionFixture();
  expect(boardCircuit(project, sub, `circuit:${terminal}`, crypto.randomUUID())).toBe(terminal);
  expect(() => boardCircuit(project, sub, `protection:${upstream}`, crypto.randomUUID())).toThrow();
  expect(() => boardCircuit(project, main, `circuit:${terminal}`, crypto.randomUUID())).toThrow();
});

it("hängt bestehende Verbraucher nicht unbemerkt um", () => {
  const { project, outlet, feeder } = distributionFixture();
  expect(() => assignBoardTarget(project, outlet, feeder)).toThrow(/anderen Stromkreis/);
});

it("setzt die Versorgung eines einfachen Schalters und dokumentiert Abzweigdosen über die Leitung", () => {
  const { project, main, feeder, terminal } = distributionFixture();
  const sw = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 0 }, "switches");
  project.electrical.switches[sw]!.supply = { kind: "disconnected" };
  assignBoardTarget(project, sw, terminal);
  expect(project.electrical.switches[sw]!.supply.kind).toBe("circuit");
  const junction = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 0 }, "junctions");
  expect(suggestBoardContacts(project, main, junction, feeder, false)).toHaveLength(5);
  expect(() => assignBoardTarget(project, junction, feeder)).toThrow(/Leitung/);
});
