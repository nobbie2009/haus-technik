import type { FloorElement, Millimeters, UUID, Vec2 } from "./common";

export type DimensionAnchor = { kind: "point"; pointId: UUID } | { kind: "position"; position: Vec2 };

export interface Dimension extends FloorElement {
  start: DimensionAnchor;
  end: DimensionAnchor;
  mode: "aligned" | "horizontal" | "vertical";
  offset: Millimeters;
}
