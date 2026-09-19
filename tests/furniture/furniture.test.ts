import { describe, expect, it } from "vitest";
import { rectangleFixture } from "../fixtures";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { addFurniture } from "../../src/furniture/actions";
import { furnitureCorners, containsFurniture } from "../../src/geometry/furniture";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { transact } from "../../src/editor/history/transaction";
import { moveSelection, deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { useProjectStore } from "../../src/stores/projectStore";

function fixture() {
  const { project, room } = rectangleFixture();
  const id = addFurniture(project, room.floorId, { x: 2000, y: 1600 }, "sofa");
  return { project, room, id, item: project.furniture[id]! };
}

describe("Möbelgeometrie und Modellaktionen", () => {
  it("rotiert um den Mittelpunkt und trifft auch schmale gedrehte Objekte exakt", () => {
    const { item } = fixture();
    item.rotation = Math.PI / 2;
    const corners = furnitureCorners(item);
    expect(corners[0]!.x).toBeCloseTo(2450);
    expect(corners[0]!.y).toBeCloseTo(500);
    expect(containsFurniture(item, { x: 2000, y: 2600 })).toBe(true);
    expect(containsFurniture(item, { x: 2600, y: 1600 })).toBe(false);
    item.rotation = Math.PI / 4;
    expect(containsFurniture(item, { x: 2000 + 700 / Math.SQRT2, y: 1600 + 700 / Math.SQRT2 })).toBe(true);
    expect(containsFurniture(item, { x: 3000, y: 600 })).toBe(false);
  });
  it("ordnet Räume beim Platzieren, Verschieben und Löschen anhand des Mittelpunkts zu", () => {
    const { project, room, id } = fixture();
    expect(project.furniture[id]!.roomId).toBe(room.id);
    const moved = transact(project, (draft) =>
      moveSelection(draft, [{ kind: "furniture", id }], { x: 5000, y: 0 }),
    );
    expect(moved.furniture[id]!.roomId).toBeNull();
    expect(project.furniture[id]!.position.x).toBe(2000);
    const removed = transact(project, (draft) => deleteSelection(draft, [{ kind: "rooms", id: room.id }]));
    expect(removed.furniture[id]!.roomId).toBeNull();
    expect(removed.furniture[id]!.position).toEqual({ x: 2000, y: 1600 });
  });
  it("dupliziert mit neuer ID und unabhängigen Metadaten; Undo/Redo erhält Maße", () => {
    const { project, id } = fixture();
    project.furniture[id]!.metadata = { manufacturer: "Eigenbau" };
    useProjectStore.getState().replace(project);
    expect(
      useProjectStore.getState().commit("Kopie", (draft) => {
        duplicateSelection(draft, [{ kind: "furniture", id }]);
      }),
    ).toBe(true);
    const items = Object.values(useProjectStore.getState().project.furniture);
    expect(items).toHaveLength(2);
    const copy = items.find((item) => item.id !== id)!;
    expect(copy.position).toEqual({ x: 2500, y: 1100 });
    expect(copy.width).toBe(2200);
    expect(copy.metadata).toEqual(project.furniture[id]!.metadata);
    useProjectStore.getState().undo();
    expect(Object.keys(useProjectStore.getState().project.furniture)).toEqual([id]);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.furniture[copy.id]).toEqual(copy);
  });
  it("beachtet Sichtbarkeit, Geschoss und Ebenensperre", () => {
    const { project, room, id, item } = fixture();
    expect(hitTest(project, room.floorId, item.position, 0.1)).toEqual({ kind: "furniture", id });
    project.layers[item.layerId]!.visible = false;
    expect(hitTest(project, room.floorId, item.position, 0.1)?.kind).toBe("rooms");
    expect(hitTest(project, crypto.randomUUID(), item.position, 0.1)).toBeNull();
    project.layers[item.layerId]!.visible = true;
    project.layers[item.layerId]!.locked = true;
    expect(() =>
      transact(project, (draft) => moveSelection(draft, [{ kind: "furniture", id }], { x: 100, y: 0 })),
    ).toThrow(/gesperrt/);
    expect(() => transact(project, (draft) => deleteSelection(draft, [{ kind: "furniture", id }]))).toThrow(
      /gesperrt/,
    );
    expect(() => addFurniture(project, room.floorId, { x: 0, y: 0 }, "bed")).toThrow(/entsperren/);
  });
  it.each([0, -1, Infinity, NaN])("verwirft ungültige Maße %s atomar", (value) => {
    const { project, id } = fixture();
    expect(() =>
      transact(project, (draft) => {
        draft.furniture[id]!.width = value;
      }),
    ).toThrow();
    expect(project.furniture[id]!.width).toBe(2200);
  });
  it("validiert Fremdschlüssel, Layer und global eindeutige IDs", () => {
    const { project, id, item } = fixture();
    item.roomId = crypto.randomUUID();
    expect(() => parseProject(project)).toThrow();
    item.roomId = null;
    item.layerId = project.layerOrder[0]!;
    expect(() => parseProject(project)).toThrow();
    const empty = createProject();
    const fresh = addFurniture(empty, empty.floorOrder[0]!, { x: 0, y: 0 }, "custom");
    empty.furniture[fresh]!.id = empty.id;
    expect(() => parseProject(empty)).toThrow();
    expect(id).not.toBe(project.id);
  });
});
