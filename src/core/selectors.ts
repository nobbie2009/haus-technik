import type { Millimeters, SquareMillimeters, UUID, Vec2 } from "../models/common";
import type { Project } from "../models/project";
import { distance } from "../geometry/distance";
import { polygonArea, polygonPerimeter, rectangleDimensions } from "../geometry/polygon";

export interface WallMeasurements {
  startPoint: Vec2;
  endPoint: Vec2;
  length: Millimeters;
  roomIds: UUID[];
}
export interface RoomMeasurements {
  polygon: Vec2[];
  area: SquareMillimeters;
  perimeter: Millimeters;
  rectangleDimensions: { length: Millimeters; width: Millimeters } | null;
  measurementBasis: "wallAxis";
}

function position(project: Project, id: UUID): Vec2 {
  const point = project.points[id];
  if (!point) throw new Error(`Punkt fehlt: ${id}`);
  return { ...point.position };
}

/** Selektoren erwarten ein validiertes Projekt und verändern es nicht. */
export function getWallMeasurements(project: Project, id: UUID): WallMeasurements {
  const wall = project.walls[id];
  if (!wall) throw new Error(`Wand fehlt: ${id}`);
  const startPoint = position(project, wall.startPointId);
  const endPoint = position(project, wall.endPointId);
  return {
    startPoint,
    endPoint,
    length: distance(startPoint, endPoint),
    roomIds: Object.values(project.rooms)
      .filter((room) => room.wallIds.includes(id))
      .map((room) => room.id),
  };
}

export function getRoomMeasurements(project: Project, id: UUID): RoomMeasurements {
  const room = project.rooms[id];
  if (!room) throw new Error(`Raum fehlt: ${id}`);
  const polygon = room.polygon.pointIds.map((pointId) => position(project, pointId));
  return {
    polygon,
    area: polygonArea(polygon),
    perimeter: polygonPerimeter(polygon),
    rectangleDimensions: rectangleDimensions(polygon),
    measurementBasis: "wallAxis",
  };
}
