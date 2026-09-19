import type { FloorElement, Millimeters, UUID } from "./common";

export type RoomType =
  | "livingRoom"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "hallway"
  | "basement"
  | "technicalRoom"
  | "garage"
  | "other";

export interface PolygonRing {
  /** Implizit geschlossen; der erste Punkt wird nicht wiederholt. */
  pointIds: UUID[];
}

export interface Room extends FloorElement {
  name: string;
  type: RoomType;
  polygon: PolygonRing;
  /** wallIds[i] verbindet Punkt i mit dem Folgepunkt, in beliebiger Wandrichtung. */
  wallIds: UUID[];
  height: Millimeters;
}
