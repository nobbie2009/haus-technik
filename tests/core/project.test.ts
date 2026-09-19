import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject, validateProject } from "../../src/core/validation";
import { getRoomMeasurements, getWallMeasurements } from "../../src/core/selectors";
import { resizeWallEndpoints } from "../../src/geometry/wallGeometry";
import type { Door } from "../../src/models/opening";
import { rectangleFixture } from "../fixtures";

describe("Projektmodell", () => {
  it("erzeugt ein gültiges Projekt mit Geschoss und Ebenen", () => {
    const project = createProject();
    expect(validateProject(project).success).toBe(true);
    expect(project.floorOrder).toHaveLength(1);
    expect(project.layerOrder).toHaveLength(4);
    expect(createProject().id).not.toBe(project.id);
  });
  it("übersteht einen JSON-Roundtrip inklusive Metadaten und Referenzen", () => {
    const { project } = rectangleFixture();
    project.name = "  Testhaus  ";
    project.metadata = { nested: { values: [null, true, "Text", 4350.25] } };
    expect(parseProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });
  it("berechnet abgeleitete Werte statt redundanter Speicherung", () => {
    const { project, room, walls } = rectangleFixture();
    expect(getRoomMeasurements(project, room.id)).toMatchObject({
      area: 13_920_000,
      perimeter: 15_100,
      rectangleDimensions: { length: 4350, width: 3200 },
      measurementBasis: "wallAxis",
    });
    expect(getWallMeasurements(project, walls[0]!.id)).toMatchObject({ length: 4350, roomIds: [room.id] });
    expect(room).not.toHaveProperty("area");
    expect(walls[0]).not.toHaveProperty("roomIds");
  });
  it("hält Wandanschlüsse über Punkt-IDs auch bei exakten Maßänderungen zusammen", () => {
    const { project, room, walls } = rectangleFixture();
    const first = walls[0]!;
    const next = walls[1]!;
    const start = project.points[first.startPointId]!;
    const end = project.points[first.endPointId]!;
    const result = resizeWallEndpoints(start.position, end.position, 5000);
    end.position = result.end;
    expect(next.startPointId).toBe(first.endPointId);
    expect(getWallMeasurements(project, next.id).startPoint).toEqual({ x: 5000, y: 0 });
    expect(getRoomMeasurements(project, room.id).area).toBe(14_960_000);
    expect(getRoomMeasurements(project, room.id).rectangleDimensions).toBeNull();
    expect(validateProject(project).success).toBe(true);
  });
  it("liefert Kopien der Messpunkte", () => {
    const { project, room } = rectangleFixture();
    getRoomMeasurements(project, room.id).polygon[0]!.x = 999;
    expect(project.points[room.polygon.pointIds[0]!]!.position.x).toBe(0);
  });
});

describe("Projektvalidierung", () => {
  it("verwirft unbekannte Schemaversionen und unbekannte Felder", () => {
    const project = createProject();
    expect(validateProject({ ...project, schemaVersion: 999 })).toMatchObject({
      success: false,
      issues: [{ path: "schemaVersion" }],
    });
    expect(validateProject({ ...project, unsupported: true }).success).toBe(false);
    expect(() => parseProject({})).toThrow();
  });
  it.each([NaN, Infinity, undefined, new Date(), new Map(), () => 1])(
    "verwirft nicht serialisierbare Metadaten %s",
    (invalid) => {
      expect(validateProject({ ...createProject(), metadata: { invalid } }).success).toBe(false);
    },
  );
  it("verwirft zyklische Objekte kontrolliert", () => {
    const input = { ...createProject(), metadata: {} as Record<string, unknown> };
    input.metadata.self = input;
    expect(validateProject(input).success).toBe(false);
  });
  it("erkennt abweichende Tabellenschlüssel, doppelte UUIDs und unvollständige Reihenfolgen", () => {
    const { project, walls } = rectangleFixture();
    walls[0]!.id = project.id;
    project.floorOrder.push(project.floorOrder[0]!);
    const result = validateProject(project);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.message.includes("Tabellenschlüssel"))).toBe(true);
      expect(result.issues.some((issue) => issue.message.includes("bereits vergeben"))).toBe(true);
      expect(result.issues.some((issue) => issue.path === "floorOrder")).toBe(true);
    }
  });
  it("erkennt fehlende Endpunkte ohne Absturz", () => {
    const { project, walls } = rectangleFixture();
    delete project.points[walls[0]!.startPointId];
    expect(validateProject(project).success).toBe(false);
  });
  it("verhindert Verbindungen zwischen Geschossen", () => {
    const { project, walls } = rectangleFixture();
    const id = crypto.randomUUID();
    project.floors[id] = {
      ...project.floors[project.floorOrder[0]!]!,
      id,
      name: "Obergeschoss",
      elevation: 2800,
    };
    project.floorOrder.push(id);
    project.points[walls[0]!.startPointId]!.floorId = id;
    expect(validateProject(project).success).toBe(false);
  });
  it("prüft Reihenfolge und geometrische Zuordnung der Raumwände", () => {
    const { project, room } = rectangleFixture();
    [room.wallIds[0], room.wallIds[1]] = [room.wallIds[1]!, room.wallIds[0]!];
    expect(validateProject(project).success).toBe(false);
  });
  it("erkennt Selbstüberschneidungen trotz vorhandener IDs", () => {
    const { project, room } = rectangleFixture();
    project.points[room.polygon.pointIds[1]!]!.position = { x: 0, y: 3200 };
    project.points[room.polygon.pointIds[3]!]!.position = { x: 4350, y: 0 };
    // Dieser Ring ist nur umgekehrt orientiert: auch das ist zulässig.
    expect(validateProject(project).success).toBe(true);
    project.points[room.polygon.pointIds[2]!]!.position = { x: 4350, y: -1000 };
    expect(validateProject(project).success).toBe(false);
  });
  it("verbietet zwei Räume auf derselben Seite einer gemeinsamen Wand", () => {
    const { project, room } = rectangleFixture();
    const duplicate = { ...structuredClone(room), id: crypto.randomUUID() };
    project.rooms[duplicate.id] = duplicate;
    expect(validateProject(project).success).toBe(false);
  });
  it("erlaubt zwei Nachbarräume mit derselben Wand und gegensinniger Raumnutzung", () => {
    const { project, room, walls } = rectangleFixture();
    const shared = walls[1]!;
    const extraPoints = [
      { x: 7350, y: 0 },
      { x: 7350, y: 3200 },
    ].map((position) => ({
      id: crypto.randomUUID(),
      floorId: room.floorId,
      position,
      metadata: {},
    }));
    extraPoints.forEach((point) => {
      project.points[point.id] = point;
    });
    const pointIds = [shared.startPointId, extraPoints[0]!.id, extraPoints[1]!.id, shared.endPointId];
    const extraWalls = pointIds.slice(0, 3).map((id, i) => ({
      ...shared,
      id: crypto.randomUUID(),
      startPointId: id,
      endPointId: pointIds[i + 1]!,
    }));
    extraWalls.forEach((wall) => {
      project.walls[wall.id] = wall;
    });
    const neighbor = {
      ...room,
      id: crypto.randomUUID(),
      name: "Küche",
      polygon: { pointIds },
      wallIds: [...extraWalls.map((wall) => wall.id), shared.id],
    };
    project.rooms[neighbor.id] = neighbor;
    expect(validateProject(project).success).toBe(true);
    expect(getWallMeasurements(project, shared.id).roomIds).toEqual([room.id, neighbor.id]);
    expect(getRoomMeasurements(project, neighbor.id).area).toBe(9_600_000);
  });
  it("prüft Referenzen von Bemaßungen", () => {
    const { project } = rectangleFixture();
    const id = crypto.randomUUID();
    project.dimensions[id] = {
      id,
      floorId: project.floorOrder[0]!,
      layerId: project.layerOrder[1]!,
      metadata: {},
      offset: 200,
      mode: "aligned",
      start: { kind: "point", pointId: crypto.randomUUID() },
      end: { kind: "position", position: { x: 0, y: 0 } },
    };
    expect(validateProject(project).success).toBe(false);
  });
});

describe("Öffnungen", () => {
  function fixture() {
    const { project, walls } = rectangleFixture();
    const wall = walls[0]!;
    const door: Door = {
      id: crypto.randomUUID(),
      floorId: wall.floorId,
      layerId: wall.layerId,
      wallId: wall.id,
      position: 1000,
      width: 900,
      height: 2100,
      openingDirection: { hinge: "startSide", swing: "leftOfWall" },
      metadata: {},
    };
    project.doors[door.id] = door;
    return { project, door };
  }
  it("akzeptiert passende Türen", () => {
    expect(validateProject(fixture().project).success).toBe(true);
  });
  it.each([0, 4300])("verwirft Öffnungen außerhalb der Wand bei Position %s", (position) => {
    const { project, door } = fixture();
    door.position = position;
    expect(validateProject(project).success).toBe(false);
  });
  it("beachtet Fensterbrüstung und Wandhöhe", () => {
    const { project, door } = fixture();
    const { openingDirection: _openingDirection, ...base } = door;
    delete project.doors[door.id];
    project.windows[base.id] = { ...base, sillHeight: 1000, height: 1600 };
    expect(validateProject(project).success).toBe(false);
    project.windows[base.id]!.height = 1500;
    expect(validateProject(project).success).toBe(true);
  });
  it("verwirft überlappende Öffnungen", () => {
    const { project, door } = fixture();
    const other = { ...door, id: crypto.randomUUID(), position: 1400 };
    project.doors[other.id] = other;
    expect(validateProject(project).success).toBe(false);
  });
});
