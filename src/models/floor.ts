import type { Entity, Millimeters } from "./common";

export interface Floor extends Entity {
  name: string;
  elevation: Millimeters;
  defaultRoomHeight: Millimeters;
}
