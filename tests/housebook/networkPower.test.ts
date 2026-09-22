import { expect, it } from "vitest";
import { distributionFixture } from "../electrical/distributionFixture";
import { addNetworkNode, changeNetworkNode, deleteNetworkNodes, networkLayer } from "../../src/network/model";
import { ensureNetworkPower, networkPower } from "../../src/network/power";
import { transact } from "../../src/editor/history/transaction";
import { addCable } from "../../src/electrical/cables";
import { setCableContacts } from "../../src/electrical/contacts";
import { suggestContacts } from "../../src/electrical/contactSuggestions";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";

it("verbindet einen Router mit einer Steckdose und erhält den Anschluss beim Verschieben und Import", () => {
  const { project, outlet, upper } = distributionFixture();
  const node = addNetworkNode(project, upper.id, { x: 1000, y: 500 }, "router");
  let power = "",
    cable = "";
  const connected = transact(project, (d) => {
    power = ensureNetworkPower(d, node);
    cable = addCable(d, power, outlet, []);
    setCableContacts(d, cable, suggestContacts(d, power, outlet), true);
  });
  expect(connected.electrical.devices[power]!.connectionPointId).toBe(outlet);
  const moved = transact(connected, (d) =>
    changeNetworkNode(d, node, (n) => {
      n.position.x = 2100;
    }),
  );
  expect(moved.electrical.devices[power]!.position.x).toBe(2100);
  expect(networkPower(importProjectText(exportProjectText(moved)), node)?.id).toBe(power);
  const removed = transact(moved, (d) => deleteNetworkNodes(d, new Set([node])));
  expect(removed.electrical.devices[power]).toBeUndefined();
  expect(removed.electrical.cables[cable]).toBeUndefined();
  expect(project.electrical.devices[power]).toBeUndefined();
});

it("respektiert die Netzwerk-Ebenensperre auch beim Bearbeiten des Stromanschlusses", () => {
  const { project, upper } = distributionFixture();
  const node = addNetworkNode(project, upper.id, { x: 0, y: 0 }, "router");
  const id = ensureNetworkPower(project, node);
  project.layers[networkLayer(project)!.id]!.locked = true;
  expect(() =>
    transact(project, (d) => {
      d.electrical.devices[id]!.ratedPower = 15;
    }),
  ).toThrow(/gesperrt/);
});
