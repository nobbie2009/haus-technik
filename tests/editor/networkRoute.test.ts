import { expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addNetworkNode, networkLayer } from "../../src/network/model";
import { confirmNetworkRoute, undoNetworkPoint } from "../../src/network/drawing";
import { useProjectStore } from "../../src/stores/projectStore";
import { useEditorStore } from "../../src/stores/editorStore";
import { housebook, setHousebook } from "../../src/housebook/model";
import { networkCableLength } from "../../src/network/cables";
import { parseProject } from "../../src/core/validation";
import { analyzePoe } from "../../src/network/poe";
import { planPrimitives } from "../../src/housebook/export";

function setup() {
  const p = createProject("Netzwerk-Beispiel"),
    ground = p.floorOrder[0]!,
    upper = crypto.randomUUID();
  p.floors[upper] = { ...p.floors[ground]!, id: upper, name: "Obergeschoss", elevation: 3000 };
  p.floorOrder.push(upper);
  const from = addNetworkNode(p, ground, { x: 0, y: 0 }, "poeSwitch");
  const to = addNetworkNode(p, upper, { x: 2000, y: 1000 }, "poeDoorbell");
  const b = housebook(p);
  b.networkNodes[0]!.poe!.budgetW = 60;
  setHousebook(p, b);
  useProjectStore.getState().replace(p);
  useEditorStore.getState().cancel();
  useEditorStore.getState().setFloor(ground);
  useEditorStore.getState().setTool("networkCable");
  useEditorStore.setState({ viewport: { scale: 1, originPx: { x: 0, y: 0 } } });
  return { p, ground, upper, from, to };
}

it("erkennt das angeklickte Gerät auch wenn das Raster die Cursorposition verschiebt", () => {
  const { from } = setup();
  confirmNetworkRoute({ x: 100, y: 100 }, { x: 0, y: 0 });
  expect(useEditorStore.getState().networkStartId).toBe(from);
  useEditorStore.getState().cancel();
});

it("zeichnet über Geschosse und speichert erst nach Anschlussbestätigung; Export und PoE verwenden denselben Weg", () => {
  const { p, ground, upper, from, to } = setup();
  confirmNetworkRoute({ x: 0, y: 0 });
  confirmNetworkRoute({ x: 1000, y: 0 });
  useEditorStore.getState().setFloor(upper);
  confirmNetworkRoute({ x: 1000, y: 1000 });
  confirmNetworkRoute({ x: 2000, y: 1000 });
  const request = useEditorStore.getState().networkRequest!;
  expect(request.from).toBe(from);
  expect(request.to).toBe(to);
  expect(request.route.map((p) => p.floorId)).toEqual([ground, upper, upper]);
  expect(housebook(useProjectStore.getState().project).networkLinks).toHaveLength(0);
  const b = housebook(p);
  const link = {
    ...request,
    id: crypto.randomUUID(),
    name: "NET-1",
    fromPort: 1,
    toPort: 1,
    cableType: "Cat 6A",
    allowance: 500,
    medium: "ethernet" as const,
  };
  b.networkLinks.push(link);
  setHousebook(p, b);
  expect(networkCableLength(p, b.networkNodes[0]!, b.networkNodes[1]!, link)).toBe(6500);
  expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  expect(analyzePoe(b).consumers[0]?.ready).toBe(true);
  for (const floor of [ground, upper])
    expect(planPrimitives(p, floor).some((v) => v.kind === "text" && v.text.includes("NET-1"))).toBe(true);
  useEditorStore.getState().cancel();
  expect(useEditorStore.getState().networkRequest).toBeNull();
});

it("nimmt Geschossübergang zurück und bricht ohne gespeichertes Kabel ab", () => {
  const { ground, upper } = setup();
  confirmNetworkRoute({ x: 0, y: 0 });
  useEditorStore.getState().setFloor(upper);
  undoNetworkPoint();
  expect(useEditorStore.getState().floorId).toBe(ground);
  undoNetworkPoint();
  expect(useEditorStore.getState().networkStartId).toBeNull();
  expect(housebook(useProjectStore.getState().project).networkLinks).toHaveLength(0);
});

it("verhindert Zeichnen auf gesperrter Ebene und unbekannte Geschosse im Import", () => {
  const { p, from, to } = setup();
  networkLayer(useProjectStore.getState().project)!.locked = true;
  confirmNetworkRoute({ x: 0, y: 0 });
  expect(useEditorStore.getState().networkStartId).toBeNull();
  const b = housebook(p);
  b.networkLinks.push({
    id: crypto.randomUUID(),
    from,
    to,
    name: "Fehler",
    fromPort: 1,
    toPort: 1,
    cableType: "Cat 6",
    allowance: 0,
    route: [{ floorId: crypto.randomUUID(), position: { x: 0, y: 0 } }],
  });
  setHousebook(p, b);
  expect(() => parseProject(p)).toThrow(/unbekannte Etage/);
});
