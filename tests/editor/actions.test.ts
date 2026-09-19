import { beforeEach, describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { createDemoProject } from "../../src/editor/demoProject";
import { createOpening, createRoom } from "../../src/editor/actions/create";
import { addWallPath } from "../../src/editor/actions/topology";
import {
  deleteSelection,
  duplicateSelection,
  moveSelection,
  resizeRoom,
  resizeWall,
} from "../../src/editor/actions/edit";
import { transact } from "../../src/editor/history/transaction";
import { getRoomMeasurements, getWallMeasurements } from "../../src/core/selectors";
import { validateProject } from "../../src/core/validation";
import { useProjectStore } from "../../src/stores/projectStore";
import { rectangleFixture } from "../fixtures";

describe("Wand- und Raumtopologie", () => {
  it("legt einen Rechteckraum in einer gültigen Transaktion an", () => {
    const before = createProject();
    const result = transact(before, (draft) =>
      createRoom(draft, draft.floorOrder[0]!, [
        { x: 0, y: 0 },
        { x: 4350, y: 0 },
        { x: 4350, y: 3200 },
        { x: 0, y: 3200 },
      ]),
    );
    expect(Object.keys(before.walls)).toHaveLength(0);
    expect(Object.keys(result.walls)).toHaveLength(4);
    expect(getRoomMeasurements(result, Object.keys(result.rooms)[0]!).area).toBe(13_920_000);
  });
  it("verbindet einen T-Anschluss und führt den Raumring mit", () => {
    const { project, room } = rectangleFixture();
    const result = transact(project, (draft) => {
      addWallPath(draft, room.floorId, { x: 2000, y: 0 }, { x: 2000, y: -2000 });
    });
    expect(Object.keys(result.walls)).toHaveLength(6);
    expect(result.rooms[room.id]!.wallIds).toHaveLength(5);
    expect(getRoomMeasurements(result, room.id).area).toBe(13_920_000);
    const junction = Object.values(result.points).find((p) => p.position.x === 2000 && p.position.y === 0)!;
    expect(
      Object.values(result.walls).filter((wall) =>
        [wall.startPointId, wall.endPointId].includes(junction.id),
      ),
    ).toHaveLength(3);
  });
  it("teilt eine Kreuzung in vier topologisch verbundene Segmente", () => {
    const before = createProject();
    const result = transact(before, (draft) => {
      addWallPath(draft, draft.floorOrder[0]!, { x: 0, y: 0 }, { x: 4000, y: 0 });
      addWallPath(draft, draft.floorOrder[0]!, { x: 2000, y: -2000 }, { x: 2000, y: 2000 });
    });
    expect(Object.keys(result.walls)).toHaveLength(4);
    expect(Object.keys(result.points)).toHaveLength(5);
  });
  it("teilt nur nötige Wandteile bei angrenzenden Räumen", () => {
    const { project, room } = rectangleFixture();
    const result = transact(project, (draft) =>
      createRoom(draft, room.floorId, [
        { x: 4350, y: 0 },
        { x: 7000, y: 0 },
        { x: 7000, y: 2000 },
        { x: 4350, y: 2000 },
      ]),
    );
    expect(Object.keys(result.rooms)).toHaveLength(2);
    expect(
      Object.values(result.walls).filter((w) => getWallMeasurements(result, w.id).roomIds.length === 2),
    ).toHaveLength(1);
    expect(getRoomMeasurements(result, room.id).rectangleDimensions).toEqual({ length: 4350, width: 3200 });
  });
  it("versetzt Öffnungen beim Teilen auf das richtige Wandsegment", () => {
    const { project, room, walls } = rectangleFixture();
    const opening = createOpening(project, walls[0]!.id, 3300, "windows");
    const result = transact(project, (draft) =>
      addWallPath(draft, room.floorId, { x: 2000, y: 0 }, { x: 2000, y: -1000 }),
    );
    expect(result.windows[opening.id]!.wallId).not.toBe(walls[0]!.id);
    expect(result.windows[opening.id]!.position).toBe(1300);
  });
  it("verhindert einen Anschluss innerhalb einer Öffnung atomar", () => {
    const { project, room, walls } = rectangleFixture();
    createOpening(project, walls[0]!.id, 2000, "doors");
    const snapshot = JSON.stringify(project);
    expect(() =>
      transact(project, (draft) =>
        addWallPath(draft, room.floorId, { x: 2000, y: 0 }, { x: 2000, y: -1000 }),
      ),
    ).toThrow("Öffnung");
    expect(JSON.stringify(project)).toBe(snapshot);
  });
  it("behält umgekehrt orientierte Raumringe nach Wandteilung bei", () => {
    const project = createDemoProject();
    const shared = Object.values(project.walls).find(
      (w) => getWallMeasurements(project, w.id).roomIds.length === 2,
    )!;
    const a = project.points[shared.startPointId]!.position;
    const b = project.points[shared.endPointId]!.position;
    // Ohne Öffnungen ist jeder innere Punkt als Anschluss verfügbar.
    project.doors = {};
    project.windows = {};
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const result = transact(project, (draft) =>
      addWallPath(draft, shared.floorId, midpoint, { x: midpoint.x + 123, y: midpoint.y + 456 }),
    );
    expect(validateProject(result).success).toBe(true);
    expect(Object.keys(result.rooms)).toHaveLength(4);
  });
  it("liefert ein gültiges Beispiel mit gemeinsamen Wänden und Öffnungen", () => {
    const project = createDemoProject();
    expect(validateProject(project).success).toBe(true);
    expect(Object.keys(project.rooms)).toHaveLength(4);
    expect(Object.keys(project.walls)).toHaveLength(12);
  });
});

describe("Bearbeitung", () => {
  it("erhält beim Ändern von Länge und Breite ein Rechteck", () => {
    const { project, room } = rectangleFixture();
    const next = transact(project, (draft) => resizeRoom(draft, room.id, 5000, 3500));
    expect(getRoomMeasurements(next, room.id)).toMatchObject({
      area: 17_500_000,
      rectangleDimensions: { length: 5000, width: 3500 },
    });
  });
  it("bewegt gemeinsame Punkte bei Mehrfachauswahl nur einmal", () => {
    const { project, walls } = rectangleFixture();
    const next = transact(project, (draft) =>
      moveSelection(
        draft,
        walls.slice(0, 2).map((w) => ({ kind: "walls", id: w.id })),
        { x: 100, y: 0 },
      ),
    );
    expect(next.points[walls[0]!.endPointId]!.position.x).toBe(4450);
  });
  it("dupliziert einen Raum mit neuen IDs und eigenen Öffnungsreferenzen", () => {
    const { project, room, walls } = rectangleFixture();
    createOpening(project, walls[0]!.id, 2000, "doors");
    const next = transact(project, (draft) =>
      duplicateSelection(draft, [{ kind: "rooms", id: room.id }], { x: 6000, y: 0 }),
    );
    expect(Object.keys(next.rooms)).toHaveLength(2);
    expect(Object.keys(next.walls)).toHaveLength(8);
    expect(Object.keys(next.points)).toHaveLength(8);
    const doors = Object.values(next.doors);
    expect(doors).toHaveLength(2);
    expect(doors[0]!.wallId).not.toBe(doors[1]!.wallId);
  });
  it("löscht Abhängigkeiten einer Wand, lässt übrige Wände bestehen", () => {
    const { project, room, walls } = rectangleFixture();
    createOpening(project, walls[0]!.id, 2000, "doors");
    const next = transact(project, (draft) => deleteSelection(draft, [{ kind: "walls", id: walls[0]!.id }]));
    expect(next.rooms[room.id]).toBeUndefined();
    expect(Object.keys(next.walls)).toHaveLength(3);
    expect(Object.keys(next.doors)).toHaveLength(0);
  });
  it("verhindert indirekte Änderungen gesperrter Geometrie", () => {
    const { project, walls } = rectangleFixture();
    project.layers[walls[0]!.layerId]!.locked = true;
    expect(() => transact(project, (draft) => resizeWall(draft, walls[0]!.id, 5000, "start"))).toThrow(
      "gesperrt",
    );
    const unlocked = transact(project, (draft) => {
      draft.layers[walls[0]!.layerId]!.locked = false;
    });
    expect(unlocked.layers[walls[0]!.layerId]!.locked).toBe(false);
  });
  it("lehnt eine Maßänderung ab, die ein Fenster aus der Wand schieben würde", () => {
    const { project, walls } = rectangleFixture();
    createOpening(project, walls[0]!.id, 3300, "windows");
    expect(() => transact(project, (draft) => resizeWall(draft, walls[0]!.id, 2000, "start"))).toThrow();
    expect(getWallMeasurements(project, walls[0]!.id).length).toBe(4350);
  });
});

describe("Historie", () => {
  beforeEach(() => useProjectStore.getState().replace(createProject()));
  it("stellt Geometrie atomar wieder her, bei monotoner Dokumentrevision", () => {
    useProjectStore.getState().commit("Raum", (draft) =>
      createRoom(draft, draft.floorOrder[0]!, [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
      ]),
    );
    const snapshot = useProjectStore.getState().project;
    useProjectStore.getState().undo();
    expect(Object.keys(useProjectStore.getState().project.walls)).toHaveLength(0);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.walls).toEqual(snapshot.walls);
    expect(useProjectStore.getState().project.version).toBe(3);
  });
  it("löscht Redo nach einer neuen Änderung und speichert keine fehlgeschlagenen Aktionen", () => {
    useProjectStore.getState().commit("Name", (draft) => {
      draft.name = "Haus A";
    });
    useProjectStore.getState().undo();
    useProjectStore.getState().commit("Name", (draft) => {
      draft.name = "Haus B";
    });
    expect(useProjectStore.getState().future).toHaveLength(0);
    expect(
      useProjectStore.getState().commit("Ungültig", (draft) => {
        draft.name = "";
      }),
    ).toBe(false);
    expect(useProjectStore.getState().past).toHaveLength(1);
    expect(useProjectStore.getState().project.name).toBe("Haus B");
  });
});
