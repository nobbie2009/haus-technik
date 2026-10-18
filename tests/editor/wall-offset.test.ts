import { describe, expect, it } from "vitest";
import { insertWallOffset } from "../../src/editor/actions/topology";
import { transact } from "../../src/editor/history/transaction";
import { getRoomMeasurements } from "../../src/core/selectors";
import { validateProject } from "../../src/core/validation";
import { rectangleFixture } from "../fixtures";

const positions = (project: ReturnType<typeof rectangleFixture>["project"], roomId: string) =>
  getRoomMeasurements(project, roomId).polygon.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));

describe("Wandversatz", () => {
  it("setzt einen Schornstein in die Wand, ohne die übrigen Raumecken zu verschieben", () => {
    const { project, room, walls } = rectangleFixture();
    const next = transact(project, (draft) => insertWallOffset(draft, walls[0]!.id, "start", 1000, 500, 400));
    expect(positions(next, room.id)).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 400 },
      { x: 1500, y: 400 },
      { x: 1500, y: 0 },
      { x: 4350, y: 0 },
      { x: 4350, y: 3200 },
      { x: 0, y: 3200 },
    ]);
    expect(getRoomMeasurements(next, room.id).area).toBeCloseTo(4350 * 3200 - 500 * 400);
    expect(next.rooms[room.id]!.wallIds).toHaveLength(8);
    expect(validateProject(next).success).toBe(true);
  });

  it("misst ab dem Endpunkt und legt eine Nische mit negativer Tiefe nach außen", () => {
    const { project, room, walls } = rectangleFixture();
    const next = transact(project, (draft) => insertWallOffset(draft, walls[1]!.id, "end", 200, 800, -300));
    expect(positions(next, room.id)).toContainEqual({ x: 4650, y: 2200 });
    expect(positions(next, room.id)).toContainEqual({ x: 4650, y: 3000 });
    expect(getRoomMeasurements(next, room.id).area).toBeCloseTo(4350 * 3200 + 800 * 300);
  });

  it("kürzt in der Raumecke die anschließende Wand statt sie doppelt zu belegen", () => {
    const { project, room, walls } = rectangleFixture();
    const next = transact(project, (draft) => insertWallOffset(draft, walls[0]!.id, "start", 0, 500, 400));
    expect(positions(next, room.id)).toEqual([
      { x: 0, y: 400 },
      { x: 500, y: 400 },
      { x: 500, y: 0 },
      { x: 4350, y: 0 },
      { x: 4350, y: 3200 },
      { x: 0, y: 3200 },
    ]);
    expect(project.points[walls[0]!.startPointId]).toBeDefined();
    expect(next.points[walls[0]!.startPointId]).toBeUndefined();
    expect(Object.keys(next.walls)).toHaveLength(6);
    expect(getRoomMeasurements(next, room.id).area).toBeCloseTo(4350 * 3200 - 500 * 400);
  });

  it("lehnt Versätze außerhalb der Wand ab", () => {
    const { project, walls } = rectangleFixture();
    expect(() =>
      transact(project, (draft) => insertWallOffset(draft, walls[0]!.id, "start", 4000, 500, 400)),
    ).toThrow("innerhalb der Wandlänge");
    expect(() =>
      transact(project, (draft) => insertWallOffset(draft, walls[0]!.id, "start", 0, 500, 3500)),
    ).toThrow("zu tief");
  });
});
