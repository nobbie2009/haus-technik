import { describe, it, expect } from "vitest";
import { distributionFixture } from "./distributionFixture";
import { addCable, cableLengths, cableFloorPath, cableOnFloor } from "../../src/electrical/cables";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";

describe("Geschossübergreifende Leitungen", () => {
  it("verbindet EG und OG mit horizontalen Teilwegen und senkrechter Steigstrecke", () => {
    const { project, main, outlet, upper } = distributionFixture();
    const id = addCable(project, main, outlet, []),
      c = project.electrical.cables[id]!;
    c.riser = { x: 2000, y: 1000 };
    c.path = [{ x: 2500, y: 500 }];
    c.endPath = [{ x: 4000, y: 1000 }];
    c.lengthAllowance = 500;
    expect(cableOnFloor(project, c, upper.id)).toBe(true);
    expect(cableFloorPath(project, c, upper.id)).toEqual([
      { x: 2000, y: 1000 },
      { x: 4000, y: 1000 },
      { x: 4000, y: 0 },
    ]);
    const lengths = cableLengths(project, c);
    expect(lengths.verticalLength).toBe(3000);
    expect(lengths.planLength).toBeCloseTo(Math.sqrt(500000) * 2 + 3000);
    expect(lengths.totalLength).toBeCloseTo(lengths.planLength + 3500);
    expect(hitTest(project, upper.id, { x: 3000, y: 1000 }, 1, false, "electrical")).toEqual({
      kind: "cables",
      id,
    });
    expect(hitTest(project, upper.id, { x: 3000, y: 0 }, 1, false, "electrical")).toBeNull();
    expect(importProjectText(exportProjectText(project))).toEqual(project);
    const changed = transact(project, (p) => {
      p.floors[upper.id]!.elevation = 4000;
    });
    expect(cableLengths(changed, changed.electrical.cables[id]!).totalLength).toBeCloseTo(
      lengths.totalLength + 1000,
    );
    const copied = transact(project, (p) => duplicateSelection(p, [{ kind: "cables", id }]));
    expect(Object.values(copied.electrical.cables).find((item) => item.id !== id)!.riser).toEqual({
      x: 2500,
      y: 500,
    });
  });
  it("erlaubt rein senkrechte Leitungen und schützt abhängige Höhenwege auf gesperrten Ebenen", () => {
    const { project, main, sub, upper } = distributionFixture();
    const id = addCable(project, main, sub, []),
      c = project.electrical.cables[id]!;
    expect(cableLengths(project, c)).toEqual({ planLength: 0, verticalLength: 3000, totalLength: 3000 });
    expect(importProjectText(exportProjectText(project))).toEqual(project);
    project.layers[c.layerId]!.locked = true;
    expect(() =>
      transact(project, (p) => {
        p.floors[upper.id]!.elevation = 3500;
      }),
    ).toThrow(/gesperrt/);
    project.layers[c.layerId]!.locked = false;
    const deleted = transact(project, (p) => deleteSelection(p, [{ kind: "distributionBoards", id: sub }]));
    expect(deleted.electrical.cables[id]).toBeUndefined();
  });
});
