import { describe, expect, it } from "vitest";
import { copyContent, pasteContent } from "../../src/editor/actions/clipboard";
import { deleteSelection } from "../../src/editor/actions/edit";
import { addFurniture } from "../../src/furniture/actions";
import { transact } from "../../src/editor/history/transaction";
import { getRoomMeasurements } from "../../src/core/selectors";
import { validateProject } from "../../src/core/validation";
import { rectangleFixture } from "../fixtures";

describe("Zwischenablage", () => {
  it("kopiert einen Raum mit Wänden und fügt ihn versetzt ein", () => {
    const { project, room } = rectangleFixture();
    const floorId = project.floorOrder[0]!;
    const clip = copyContent(project, [{ kind: "rooms", id: room.id }], floorId);
    let pasted: ReturnType<typeof pasteContent> = [];
    const next = transact(project, (draft) => {
      pasted = pasteContent(draft, clip, floorId, { offset: { x: 6000, y: 0 } });
    });
    expect(Object.keys(next.rooms)).toHaveLength(2);
    expect(Object.keys(next.walls)).toHaveLength(8);
    expect(pasted).toEqual([{ kind: "rooms", id: expect.any(String) }]);
    const copy = getRoomMeasurements(next, pasted[0]!.id);
    expect(copy.area).toBeCloseTo(4350 * 3200);
    expect(Math.min(...copy.polygon.map((p) => p.x))).toBeCloseTo(6000);
    expect(validateProject(next).success).toBe(true);
  });

  it("stellt Ausgeschnittenes an der ursprünglichen Stelle wieder her", () => {
    const { project, room } = rectangleFixture();
    const floorId = project.floorOrder[0]!;
    const selection = [{ kind: "rooms" as const, id: room.id }];
    const clip = copyContent(project, selection, floorId);
    const cut = transact(project, (draft) => deleteSelection(draft, selection));
    expect(Object.keys(cut.rooms)).toHaveLength(0);
    let pasted: ReturnType<typeof pasteContent> = [];
    const restored = transact(cut, (draft) => {
      pasted = pasteContent(draft, clip, floorId, { offset: { x: 0, y: 0 } });
    });
    expect(Object.keys(restored.rooms)).toHaveLength(1);
    expect(getRoomMeasurements(restored, pasted[0]!.id).polygon).toEqual(
      getRoomMeasurements(project, room.id).polygon,
    );
    expect(validateProject(restored).success).toBe(true);
  });

  it("setzt Möbel mittig an die Zielposition und übernimmt das aktuelle Geschoss", () => {
    const { project } = rectangleFixture();
    const floorId = project.floorOrder[0]!;
    let sofa = "";
    const upperId = crypto.randomUUID();
    const furnished = transact(project, (draft) => {
      sofa = addFurniture(draft, floorId, { x: 1000, y: 1000 }, "sofa");
      const upper = { ...structuredClone(draft.floors[floorId]!), id: upperId, name: "Obergeschoss" };
      draft.floors[upperId] = upper;
      draft.floorOrder.push(upperId);
    });
    const clip = copyContent(furnished, [{ kind: "furniture", id: sofa }], floorId);
    let pasted: ReturnType<typeof pasteContent> = [];
    const next = transact(furnished, (draft) => {
      pasted = pasteContent(draft, clip, upperId, { target: { x: 3000, y: 2000 } });
    });
    const copy = next.furniture[pasted[0]!.id]!;
    expect(copy.position).toEqual({ x: 3000, y: 2000 });
    expect(copy.floorId).toBe(upperId);
    expect(next.furniture[sofa]!.floorId).toBe(floorId);
    expect(validateProject(next).success).toBe(true);
  });

  it("verlangt eine Auswahl zum Kopieren", () => {
    const { project } = rectangleFixture();
    expect(() => copyContent(project, [], project.floorOrder[0]!)).toThrow("auswählen");
  });
});
