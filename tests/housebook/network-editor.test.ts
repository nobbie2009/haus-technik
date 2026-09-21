import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import {
  addNetworkNode,
  changeNetworkNode,
  ensureNetworkLayer,
  networkLayer,
  networkNodeTable,
} from "../../src/network/model";
import { housebook, setHousebook } from "../../src/housebook/model";
import { moveSelection, deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { transact } from "../../src/editor/history/transaction";
import { newId } from "../../src/utils/uuid";
import { planPrimitives } from "../../src/housebook/export";

describe("Netzwerk im Grundriss", () => {
  it("platziert, selektiert und verschiebt Netzwerkgeräte ohne doppelte Datenhaltung", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    const id = addNetworkNode(p, floor, { x: 1000, y: 2000 }, "router");
    const selection = [{ kind: "networkNodes" as const, id }];
    expect(hitTest(p, floor, { x: 1000, y: 2000 }, 0.1, false, "network")).toEqual(selection[0]);
    expect(hitTest(p, floor, { x: 1000, y: 2000 }, 0.1, false, "electrical")).toBeNull();
    const moved = transact(p, (draft) => moveSelection(draft, selection, { x: 500, y: -200 }));
    expect(housebook(moved).networkNodes[0]).toMatchObject({
      name: "Router 1",
      ports: 4,
      position: { x: 1500, y: 1800 },
    });
    expect(housebook(p).networkNodes[0]!.position).toEqual({ x: 1000, y: 2000 });
    expect(networkNodeTable(moved)[id]!.position).toEqual({ x: 1500, y: 1800 });
    expect(parseProject(JSON.parse(JSON.stringify(moved)))).toEqual(moved);
  });
  it("beachtet Sichtbarkeit, Ebenensperre und vorhandene Portbelegung", () => {
    let p = createProject();
    const id = addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "router");
    const other = addNetworkNode(p, p.floorOrder[0]!, { x: 1000, y: 0 }, "switch");
    const b = housebook(p);
    b.networkLinks.push({
      id: newId(),
      name: "LAN",
      from: id,
      to: other,
      fromPort: 4,
      toPort: 1,
      cableType: "Cat 6A",
      allowance: 0,
    });
    setHousebook(p, b);
    expect(() =>
      transact(p, (d) =>
        changeNetworkNode(d, id, (n) => {
          n.ports = 2;
        }),
      ),
    ).toThrow();
    p = transact(p, (d) => {
      networkLayer(d)!.locked = true;
    });
    expect(() =>
      transact(p, (d) => moveSelection(d, [{ kind: "networkNodes", id }], { x: 100, y: 0 })),
    ).toThrow(/gesperrt/);
    expect(() => transact(p, (d) => deleteSelection(d, [{ kind: "networkNodes", id }]))).toThrow(/gesperrt/);
    expect(() => addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "server")).toThrow(/entsperren/);
    networkLayer(p)!.visible = false;
    expect(hitTest(p, p.floorOrder[0]!, { x: 0, y: 0 }, 0.1, false, "network")).toBeNull();
    expect(
      planPrimitives(p, p.floorOrder[0]!).filter((r) => r.kind === "text" && r.text.includes("Router 1")),
    ).toHaveLength(0);
  });
  it("dupliziert Geräte und löst beim Löschen Kabel sowie WLAN-Messpunkte", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    const id = addNetworkNode(p, floor, { x: 0, y: 0 }, "router"),
      other = addNetworkNode(p, floor, { x: 1000, y: 0 }, "socket");
    const book = housebook(p);
    book.networkLinks.push({
      id: newId(),
      name: "LAN",
      from: id,
      to: other,
      fromPort: 1,
      toPort: 1,
      cableType: "Cat 6A",
      allowance: 0,
    });
    book.wifiMeasurements.push({
      id: newId(),
      name: "WLAN",
      floorId: floor,
      position: { x: 500, y: 500 },
      sourceId: id,
      signalDbm: -60,
      notes: "",
    });
    setHousebook(p, book);
    const duplicated = transact(p, (d) => {
      duplicateSelection(d, [{ kind: "networkNodes", id }]);
    });
    expect(housebook(duplicated).networkNodes).toHaveLength(3);
    expect(housebook(duplicated).networkLinks).toHaveLength(1);
    const deleted = transact(duplicated, (d) => deleteSelection(d, [{ kind: "networkNodes", id }]));
    expect(housebook(deleted).networkLinks).toHaveLength(0);
    expect(housebook(deleted).wifiMeasurements).toHaveLength(0);
    expect(housebook(deleted).networkNodes).toHaveLength(2);
  });
  it("übernimmt alte Hausakten-Geräte beim Bereitstellen der Netzwerkebene unverändert", () => {
    const p = createProject();
    addNetworkNode(p, p.floorOrder[0]!, { x: 3000, y: 1200 }, "server");
    const layer = networkLayer(p)!;
    delete p.layers[layer.id];
    p.layerOrder = p.layerOrder.filter((id) => id !== layer.id);
    const legacy = parseProject(p),
      before = housebook(legacy);
    ensureNetworkLayer(legacy);
    ensureNetworkLayer(legacy);
    expect(Object.values(legacy.layers).filter((l) => l.kind === "network")).toHaveLength(1);
    expect(housebook(legacy)).toEqual(before);
    expect(
      planPrimitives(legacy, legacy.floorOrder[0]!).some(
        (r) => r.kind === "text" && r.text.includes("Server / NAS"),
      ),
    ).toBe(true);
  });
});
