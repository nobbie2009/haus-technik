import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addFurniture } from "../../src/furniture/actions";
import { furnitureOnFloor, stairTarget, stairLabel } from "../../src/furniture/stairs";
import { parseProject } from "../../src/core/validation";
import { planPrimitives } from "../../src/housebook/export";
import { transact } from "../../src/editor/history/transaction";

function fixture(type = "straightStairs") {
  const project = createProject();
  const floorId = project.floorOrder[0]!;
  const base = project.floors[floorId]!;
  for (const [id, elevation] of [
    ["00000000-0000-4000-8000-000000000001", -2800],
    ["00000000-0000-4000-8000-000000000002", 2800],
    ["00000000-0000-4000-8000-000000000003", 5600],
  ] as const) {
    project.floors[id] = { ...structuredClone(base), id, name: id, elevation };
    project.floorOrder.push(id);
  }
  const id = addFurniture(project, floorId, { x: 1000, y: 2000 }, type);
  return { project, item: project.furniture[id]!, floorId, id };
}
describe("Treppen zwischen Geschossen", () => {
  it.each(["straightStairs", "curvedStairs"])(
    "zeigt %s auf der nächsten höheren oder tieferen Etage",
    (type) => {
      const { project, item, floorId } = fixture(type);
      expect(stairTarget(project, item)?.id).toBe("00000000-0000-4000-8000-000000000002");
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000002")).toHaveLength(1);
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000003")).toHaveLength(0);
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000001")).toHaveLength(0);
      expect(stairLabel(project, item, "00000000-0000-4000-8000-000000000002")).toContain("abwärts");
      item.metadata.stairDirection = "down";
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000002")).toHaveLength(0);
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000001")).toHaveLength(1);
      expect(stairLabel(project, item, "00000000-0000-4000-8000-000000000001")).toContain("aufwärts");
      item.metadata.stairDirection = "none";
      expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000001")).toHaveLength(0);
      expect(furnitureOnFloor(project, floorId)).toHaveLength(1);
      expect(Object.keys(project.furniture)).toHaveLength(1);
      expect(() => parseProject(project)).not.toThrow();
    },
  );
  it("berücksichtigt Referenzpunkte, Export, Speicherung und gelöschte Zieletagen", () => {
    const { project, item, floorId, id } = fixture();
    project.floors[floorId]!.metadata.floorReferenceX = 500;
    project.floors["00000000-0000-4000-8000-000000000002"]!.metadata.floorReferenceX = -300;
    project.floors["00000000-0000-4000-8000-000000000002"]!.metadata.floorReferenceY = 400;
    const view = furnitureOnFloor(project, "00000000-0000-4000-8000-000000000002")[0]!;
    expect(view.position).toEqual({ x: 1800, y: 1600 });
    expect(view.id).toBe(id);
    expect(item.position).toEqual({ x: 1000, y: 2000 });
    expect(
      planPrimitives(project, "00000000-0000-4000-8000-000000000002").some(
        (p) => p.kind === "text" && p.text.includes("abwärts"),
      ),
    ).toBe(true);
    const changed = transact(project, (draft) => {
      draft.furniture[id]!.metadata.stairDirection = "down";
    });
    expect(stairTarget(parseProject(JSON.parse(JSON.stringify(changed))), changed.furniture[id]!)?.id).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(stairTarget(project, item)?.id).toBe("00000000-0000-4000-8000-000000000002");
    delete project.floors["00000000-0000-4000-8000-000000000002"];
    project.floorOrder = project.floorOrder.filter((f) => f !== "00000000-0000-4000-8000-000000000002");
    expect(stairTarget(project, item)?.id).toBe("00000000-0000-4000-8000-000000000003");
    item.metadata.stairDirection = "down";
    delete project.floors["00000000-0000-4000-8000-000000000001"];
    expect(stairTarget(project, item)).toBeUndefined();
  });
  it("projiziert keine gewöhnlichen Möbel", () => {
    const { project } = fixture("sofa");
    expect(furnitureOnFloor(project, "00000000-0000-4000-8000-000000000002")).toHaveLength(0);
  });
});
