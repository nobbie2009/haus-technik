import type { FloorElement, UUID, Vec2 } from "./common";

export interface Furniture extends FloorElement {
  type: string;
  name: string;
  roomId: UUID | null;
  /** Mittelpunkt in mm, Rotation gegen den Uhrzeigersinn in Radiant. */
  position: Vec2;
  rotation: number;
  width: number;
  depth: number;
  height: number;
}
