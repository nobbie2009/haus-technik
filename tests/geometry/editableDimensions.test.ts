import { it, expect } from "vitest";
import { rectangleFixture } from "../fixtures";
import { editableDimensions } from "../../src/geometry/editableDimensions";
const viewport = { scale: 0.1, originPx: { x: 100, y: 500 } };
it("ordnet Achsmaße ihren Wänden zu und respektiert Sichtbarkeit, Sperren und Zoom", () => {
  const { project, room, walls } = rectangleFixture();
  const labels = editableDimensions(project, room.floorId, viewport, true);
  expect(labels).toHaveLength(4);
  expect(labels[0]).toMatchObject({ wallId: walls[0]!.id, length: 4350, x: 317.5, y: 451 });
  expect(editableDimensions(project, room.floorId, viewport, false)).toHaveLength(0);
  expect(editableDimensions(project, room.floorId, { ...viewport, scale: 0.001 }, true)).toHaveLength(0);
  project.layers[room.layerId]!.locked = true;
  expect(editableDimensions(project, room.floorId, viewport, true)).toHaveLength(0);
  project.layers[room.layerId]!.locked = false;
  project.layers[room.layerId]!.visible = false;
  expect(editableDimensions(project, room.floorId, viewport, true)).toHaveLength(0);
});
it("verwendet ein explizites verbundenes Maß statt einer zweiten automatischen Schaltfläche", () => {
  const { project, room, walls } = rectangleFixture();
  const wall = walls[0]!;
  project.dimensions.test = {
    id: "test",
    floorId: room.floorId,
    layerId: room.layerId,
    start: { kind: "point", pointId: wall.startPointId },
    end: { kind: "point", pointId: wall.endPointId },
    offset: 600,
    mode: "aligned",
    metadata: {},
  };
  const labels = editableDimensions(project, room.floorId, viewport, true);
  expect(labels).toHaveLength(4);
  expect(labels[0]).toMatchObject({ key: "test", wallId: wall.id, y: 429 });
  expect(editableDimensions(project, room.floorId, viewport, false)).toHaveLength(1);
});
