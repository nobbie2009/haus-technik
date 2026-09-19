import type { FloorElement, Millimeters, UUID } from "./common";

export interface Wall extends FloorElement {
  startPointId: UUID;
  endPointId: UUID;
  thickness: Millimeters;
  height: Millimeters;
  material: string;
}
