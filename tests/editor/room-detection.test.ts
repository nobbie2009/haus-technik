import { describe, expect, it } from "vitest";
import { detectClosedRooms } from "../../src/editor/actions/create";
import { deleteSelection } from "../../src/editor/actions/edit";
import { addWallPath } from "../../src/editor/actions/topology";
import { transact } from "../../src/editor/history/transaction";
import { getRoomMeasurements } from "../../src/core/selectors";
import { validateProject } from "../../src/core/validation";
import { rectangleFixture } from "../fixtures";

function withoutFirstWall() {
  const { project, walls } = rectangleFixture();
  const floorId = project.floorOrder[0]!;
  const open = transact(project, (draft) => deleteSelection(draft, [{ kind: "walls", id: walls[0]!.id }]));
  return { open, floorId };
}

const draw =
  (floorId: string, points: { x: number; y: number }[]) => (draft: Parameters<typeof addWallPath>[0]) => {
    for (let i = 0; i < points.length - 1; i++) {
      const path = addWallPath(draft, floorId, points[i]!, points[i + 1]!);
      detectClosedRooms(draft, floorId, path.wallIds);
    }
  };

describe("Raumerkennung aus geschlossenen Wänden", () => {
  it("legt nach Löschen einer Wand und Schließen mit zwei neuen Wänden wieder einen Raum an", () => {
    const { open, floorId } = withoutFirstWall();
    expect(Object.keys(open.rooms)).toHaveLength(0);
    const closed = transact(
      open,
      draw(floorId, [
        { x: 0, y: 0 },
        { x: 2000, y: -800 },
        { x: 4350, y: 0 },
      ]),
    );
    const rooms = Object.values(closed.rooms);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]!.polygon.pointIds).toHaveLength(5);
    expect(rooms[0]!.wallIds).toHaveLength(5);
    expect(getRoomMeasurements(closed, rooms[0]!.id).area).toBeCloseTo(4350 * 3200 + (4350 * 800) / 2);
    expect(validateProject(closed).success).toBe(true);
  });

  it("legt bei offenem Wandzug keinen Raum an", () => {
    const { open, floorId } = withoutFirstWall();
    const partial = transact(
      open,
      draw(floorId, [
        { x: 0, y: 0 },
        { x: 2000, y: -800 },
      ]),
    );
    expect(Object.keys(partial.rooms)).toHaveLength(0);
  });

  it("legt keinen zweiten Raum innerhalb eines bestehenden Raums an", () => {
    const { project } = rectangleFixture();
    const floorId = project.floorOrder[0]!;
    const divided = transact(
      project,
      draw(floorId, [
        { x: 2000, y: 0 },
        { x: 2000, y: 3200 },
      ]),
    );
    expect(Object.keys(divided.rooms)).toHaveLength(1);
  });

  it("erkennt einen Nachbarraum, der eine bestehende Wand mitbenutzt", () => {
    const { project } = rectangleFixture();
    const floorId = project.floorOrder[0]!;
    const extended = transact(
      project,
      draw(floorId, [
        { x: 4350, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 3200 },
        { x: 4350, y: 3200 },
      ]),
    );
    const rooms = Object.values(extended.rooms);
    expect(rooms).toHaveLength(2);
    expect(getRoomMeasurements(extended, rooms[1]!.id).area).toBeCloseTo(1650 * 3200);
  });
});
