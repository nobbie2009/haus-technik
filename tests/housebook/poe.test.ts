import { expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addNetworkNode, changeNetworkNode, deleteNetworkNodes, networkLayer } from "../../src/network/model";
import { housebook, setHousebook } from "../../src/housebook/model";
import { analyzePoe } from "../../src/network/poe";
import { ensureNetworkPower } from "../../src/network/power";
import { transact } from "../../src/editor/history/transaction";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";

function fixture() {
  const project = createProject("PoE-Beispiel");
  const floor = project.floorOrder[0]!;
  const source = addNetworkNode(project, floor, { x: 0, y: 0 }, "poeSwitch");
  const device = addNetworkNode(project, floor, { x: 1500, y: 0 }, "poeDoorbell");
  const book = housebook(project);
  book.networkNodes.find((n) => n.id === source)!.poe!.budgetW = 60;
  book.networkLinks.push({
    id: crypto.randomUUID(),
    name: "Türklingel",
    from: source,
    to: device,
    fromPort: 1,
    toPort: 1,
    cableType: "Cat 6A",
    allowance: 0,
    medium: "ethernet",
  });
  setHousebook(project, book);
  return { project, book, source, device };
}

it("leitet Doorbell-Versorgung und Strom aus derselben Ethernet-Verbindung ab, auch rückwärts und nach Import", () => {
  const { project, book, source, device } = fixture();
  expect(analyzePoe(book).consumers[0]).toMatchObject({
    nodeId: device,
    sourceId: source,
    sourcePort: 1,
    currentA: 0.25,
    ready: true,
  });
  const link = book.networkLinks[0]!;
  [link.from, link.to] = [link.to, link.from];
  setHousebook(project, book);
  expect(analyzePoe(housebook(importProjectText(exportProjectText(project))))).toEqual(analyzePoe(book));
  expect(analyzePoe(book).sources.get(source)?.reservedW).toBe(15.4);
  expect(() => ensureNetworkPower(project, device)).toThrow(/PoE/);
  deleteNetworkNodes(project, new Set([source]));
  expect(analyzePoe(housebook(project)).consumers[0]?.ready).toBe(false);
});

it("prüft Portschalter, Standard, unbekannte Leistung und Leistungslimit", () => {
  const { book, source, device } = fixture();
  const pse = book.networkNodes.find((n) => n.id === source)!.poe!;
  const pd = book.networkNodes.find((n) => n.id === device)!.poe!;
  pse.enabledPorts = [];
  expect(analyzePoe(book).consumers[0]?.message).toMatch(/ausgeschaltet/);
  pse.enabledPorts = [1];
  pse.standard = "af";
  pd.standard = "at";
  expect(analyzePoe(book).consumers[0]?.message).toMatch(/benötigt PoE\+/);
  pd.standard = "af";
  pd.powerW = 0;
  expect(analyzePoe(book).consumers[0]?.ready).toBe(false);
  pd.powerW = 20;
  expect(analyzePoe(book).consumers[0]?.message).toMatch(/überschreitet/);
});

it("reserviert das Gesamtbudget für alle Verbraucher, ohne eine willkürliche Einschaltreihenfolge", () => {
  const { book, source, device } = fixture();
  const second = {
    ...structuredClone(book.networkNodes.find((n) => n.id === device)!),
    id: crypto.randomUUID(),
  };
  book.networkNodes.push(second);
  book.networkLinks.push({ ...book.networkLinks[0]!, id: crypto.randomUUID(), to: second.id, fromPort: 2 });
  book.networkNodes.find((n) => n.id === source)!.poe!.budgetW = 30;
  expect(analyzePoe(book).sources.get(source)?.reservedW).toBe(30.8);
  expect(analyzePoe(book).consumers.every((c) => !c.ready && c.message.includes("überschritten"))).toBe(true);
});

it("behauptet keine Versorgung durch normale Datenports, falsche Eingangsports oder Koax", () => {
  const { book, source } = fixture();
  const saved = book.networkNodes.find((n) => n.id === source)!.poe;
  delete book.networkNodes.find((n) => n.id === source)!.poe;
  expect(analyzePoe(book).consumers[0]?.ready).toBe(false);
  book.networkNodes.find((n) => n.id === source)!.poe = saved;
  book.networkLinks[0]!.toPort = 2;
  expect(analyzePoe(book).consumers[0]?.ready).toBe(false);
  book.networkLinks[0]!.toPort = 1;
  book.networkLinks[0]!.medium = "coax";
  expect(analyzePoe(book).consumers[0]?.ready).toBe(false);
});

it("validiert Portangaben und respektiert die Ebenensperre", () => {
  const { project, device } = fixture();
  expect(() =>
    transact(project, (p) =>
      changeNetworkNode(p, device, (n) => {
        n.poe!.inputPort = 2;
      }),
    ),
  ).toThrow(/PoE-Port/);
  project.layers[networkLayer(project)!.id]!.locked = true;
  expect(() =>
    transact(project, (p) =>
      changeNetworkNode(p, device, (n) => {
        n.poe!.powerW = 6;
      }),
    ),
  ).toThrow();
});
