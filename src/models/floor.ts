import type { Entity, Millimeters, Vec2 } from "./common";

export interface Floor extends Entity {
  name: string;
  elevation: Millimeters;
  defaultRoomHeight: Millimeters;
}

/** Position der lokalen Geschosszeichnung im gemeinsamen Gebäudeplan. */
export function floorReference(floor: Floor): Vec2 {
  const x = floor.metadata.floorReferenceX;
  const y = floor.metadata.floorReferenceY;
  return {
    x: typeof x === "number" && Number.isFinite(x) ? x : 0,
    y: typeof y === "number" && Number.isFinite(y) ? y : 0,
  };
}

export function orderedFloorIds(project: { floors: Record<string, Floor>; floorOrder: string[] }): string[] {
  return [...project.floorOrder].sort((a, b) => {
    const elevation = project.floors[a]!.elevation - project.floors[b]!.elevation;
    return elevation || project.floors[a]!.name.localeCompare(project.floors[b]!.name, "de");
  });
}
