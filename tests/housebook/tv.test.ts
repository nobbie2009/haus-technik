import { expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addNetworkNode, networkLayer, deleteNetworkNodes } from "../../src/network/model";
import { networkCableLength } from "../../src/network/cables";
import { tvCatalog, portName } from "../../src/network/tv";
import { housebook, setHousebook } from "../../src/housebook/model";
import { transact } from "../../src/editor/history/transaction";
import { parseProject } from "../../src/core/validation";
import { newId } from "../../src/utils/uuid";
import { planPrimitives } from "../../src/housebook/export";

function fixture() {
  const p = createProject(),
    floor = p.floorOrder[0]!;
  const dish = addNetworkNode(p, floor, { x: 0, y: 0 }, "satDish");
  const ms = addNetworkNode(p, floor, { x: 3000, y: 4000 }, "multiswitch");
  const b = housebook(p);
  b.networkLinks.push({
    id: newId(),
    name: "SAT-1",
    from: dish,
    fromPort: 1,
    to: ms,
    toPort: 1,
    cableType: "Koax 75 Ohm",
    medium: "coax",
    allowance: 200,
    path: [{ x: 3000, y: 0 }],
  });
  setHousebook(p, b);
  return { p, dish, ms };
}
it("TV-Vorlagen, Anschlussnamen, Leitungsweg und Export bleiben erhalten", () => {
  const { p } = fixture(),
    b = housebook(p);
  expect(b.networkNodes[1]!.ports).toBe(13);
  expect(portName(b.networkNodes[1]!, 6)).toBe("Teilnehmer 1");
  expect(networkCableLength(p, b.networkNodes[0]!, b.networkNodes[1]!, b.networkLinks[0]!)).toBe(7200);
  expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  expect(
    planPrimitives(p, p.floorOrder[0]!).some((s) => s.kind === "text" && s.text.includes("SAT-Schüssel")),
  ).toBe(true);
  for (const kind of Object.keys(tvCatalog) as (keyof typeof tvCatalog)[]) {
    addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, kind);
  }
  expect(() => parseProject(p)).not.toThrow();
});
it("Koax trennt Netzwerkports und verhindert doppelte Belegung", () => {
  const { p, ms } = fixture();
  const router = addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "router");
  expect(() =>
    transact(p, (d) => {
      const b = housebook(d);
      b.networkLinks.push({ ...b.networkLinks[0]!, id: newId(), from: router });
      setHousebook(d, b);
    }),
  ).toThrow(/Koaxanschlüsse/);
  expect(() =>
    transact(p, (d) => {
      const b = housebook(d);
      b.networkLinks.push({ ...b.networkLinks[0]!, id: newId(), to: ms, toPort: 2 });
      setHousebook(d, b);
    }),
  ).toThrow(/mehrfach/);
});
it("Sperren, Löschen und Etagenhöhe gelten auch für Koax", () => {
  const { p, dish, ms } = fixture();
  const removed = transact(p, (d) => deleteNetworkNodes(d, new Set([dish])));
  expect(housebook(removed).networkLinks).toHaveLength(0);
  networkLayer(p)!.locked = true;
  expect(() => transact(p, (d) => deleteNetworkNodes(d, new Set([ms])))).toThrow(/gesperrt/);
  networkLayer(p)!.locked = false;
  const upper = newId();
  p.floors[upper] = { ...p.floors[p.floorOrder[0]!]!, id: upper, name: "OG", elevation: 3000 };
  p.floorOrder.push(upper);
  const b = housebook(p);
  b.networkNodes[1]!.floorId = upper;
  b.networkLinks[0]!.path = [];
  setHousebook(p, b);
  expect(networkCableLength(p, b.networkNodes[0]!, b.networkNodes[1]!, b.networkLinks[0]!)).toBe(8200);
  expect(() => parseProject(p)).not.toThrow();
});
