import { expect, it } from "vitest";
import { rectangleFixture } from "../fixtures";
import { addElectrical } from "../../src/electrical/actions";
import { selectAllInView } from "../../src/editor/interaction/selectAll";

it("begrenzt Alles auswählen auf Tab, Geschoss und sichtbare Ebenen", () => {
  const { project, room } = rectangleFixture();
  const id = addElectrical(project, room.floorId, { x: 2000, y: 1000 }, "outlets");
  expect(selectAllInView(project, room.floorId, "electrical")).toEqual([{ kind: "outlets", id }]);
  expect(selectAllInView(project, room.floorId, "building")).toContainEqual({ kind: "rooms", id: room.id });
  expect(selectAllInView(project, "anderes-geschoss", "electrical")).toEqual([]);
  const layer = project.layers[project.electrical.outlets[id]!.layerId]!;
  layer.locked = true;
  expect(selectAllInView(project, room.floorId, "electrical")).toHaveLength(1);
  layer.visible = false;
  expect(selectAllInView(project, room.floorId, "electrical")).toEqual([]);
});
