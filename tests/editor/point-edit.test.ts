import { describe, it, expect } from "vitest";
import { rectangleFixture } from "../fixtures";
import { movePoint, resizeWall } from "../../src/editor/actions/edit";
import { transact } from "../../src/editor/history/transaction";
import { hitWallPoint } from "../../src/editor/interaction/hitTest";
import { getRoomMeasurements, getWallMeasurements } from "../../src/core/selectors";
describe("Einzelne Raumecken bearbeiten", () => {
  it("verschiebt nur einen gemeinsamen Punkt und ändert die angrenzenden Wandmaße", () => {
    const { project, room } = rectangleFixture(),
      id = room.polygon.pointIds[0]!;
    const next = transact(project, (p) => movePoint(p, id, { x: 500, y: 200 }));
    expect(next.points[id]!.position).toEqual({
      x: project.points[id]!.position.x + 500,
      y: project.points[id]!.position.y + 200,
    });
    for (const point of Object.values(project.points))
      if (point.id !== id) expect(next.points[point.id]).toEqual(point);
    expect(getRoomMeasurements(next, room.id).area).not.toBe(getRoomMeasurements(project, room.id).area);
    expect(next.rooms[room.id]!.polygon.pointIds).toEqual(room.polygon.pointIds);
    const attached = Object.values(project.walls).filter((w) => w.startPointId === id || w.endPointId === id);
    for (const wall of attached)
      expect(getWallMeasurements(next, wall.id).length).not.toBe(
        getWallMeasurements(project, wall.id).length,
      );
  });
  it("behält beim Ändern einer Wandlänge alle anderen Punkte bei", () => {
    const { project, room } = rectangleFixture(),
      wall = project.walls[room.wallIds[0]!]!;
    const next = transact(project, (p) => resizeWall(p, wall.id, 4000, "start"));
    for (const point of Object.values(project.points))
      if (point.id !== wall.endPointId) expect(next.points[point.id]).toEqual(point);
    expect(getWallMeasurements(next, wall.id).length).toBeCloseTo(4000);
  });
  it("fängt sichtbare Endpunkte und lehnt gesperrte oder ungültige Verformungen ab", () => {
    const { project, room } = rectangleFixture(),
      id = room.polygon.pointIds[0]!,
      p = project.points[id]!.position;
    expect(hitWallPoint(project, room.floorId, { x: p.x + 100, y: p.y }, 0.07)?.pointId).toBe(id);
    const next = project.points[room.polygon.pointIds[1]!]!.position;
    expect(() => transact(project, (d) => movePoint(d, id, { x: next.x - p.x, y: next.y - p.y }))).toThrow();
    project.layers[room.layerId]!.locked = true;
    expect(() => transact(project, (d) => movePoint(d, id, { x: 100, y: 0 }))).toThrow(/gesperrt/);
    project.layers[room.layerId]!.visible = false;
    expect(hitWallPoint(project, room.floorId, p, 0.07)).toBeNull();
  });
});
