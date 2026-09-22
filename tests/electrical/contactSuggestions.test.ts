import { expect, it } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";
import { connectionContacts, suggestContacts } from "../../src/electrical/contactSuggestions";

it.each([false, true])("schlägt L, N und PE richtungsunabhängig vor (%s)", (reverse) => {
  const { project, outlet, devices } = simulationFixture([10]);
  const device = devices[0]!;
  const rows = suggestContacts(project, reverse ? device : outlet, reverse ? outlet : device);
  expect(rows).toEqual(["L", "N", "PE"].map((pin) => ({ startContactId: pin, endContactId: pin })));
  project.electrical.devices[device]!.metadata.hasProtectiveEarth = false;
  expect(suggestContacts(project, outlet, device)).toHaveLength(2);
});

it("bietet an einer einphasigen Abzweigdose keine anderen Phasen an", () => {
  const { project, sub, terminal, devices, upper } = simulationFixture([10]);
  const junction = addElectrical(project, upper.id, { x: 500, y: 500 }, "junctions");
  const cable = addCable(project, sub, junction, []);
  project.electrical.cables[cable]!.circuitId = terminal;
  project.electrical.cables[cable]!.conductorConnections = [
    { startContactId: `${terminal}:L`, endContactId: "L1" },
  ];
  const contacts = connectionContacts(project, junction, devices[0]!);
  expect(contacts.start.filter((c) => c.role === "line").map((c) => c.id)).toEqual(["L1"]);
  expect(suggestContacts(project, junction, devices[0]!)[0]).toEqual({
    startContactId: "L1",
    endContactId: "L",
  });
});

it("behält bei Drehstrom die Phasenauswahl und schlägt dennoch N/PE vor", () => {
  const { project, main, feeder, devices } = simulationFixture([10]);
  project.electrical.devices[devices[0]!]!.connectionPointId = null;
  const rows = suggestContacts(project, main, devices[0]!, { [main]: feeder });
  expect(rows).toEqual([
    { startContactId: `${feeder}:N`, endContactId: "N" },
    { startContactId: `${feeder}:PE`, endContactId: "PE" },
  ]);
  expect(
    connectionContacts(project, main, devices[0]!, { [main]: feeder }).start.filter((c) => c.role === "line"),
  ).toHaveLength(3);
});
