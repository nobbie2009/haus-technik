import type { FloorElement, Millimeters, UUID } from "./common";

export interface WallOpening extends FloorElement {
  wallId: UUID;
  /** Entfernung der Öffnungsmitte vom Wandstart entlang der Achse. */
  position: Millimeters;
  width: Millimeters;
  height: Millimeters;
}

export interface Door extends WallOpening {
  type: "hinged" | "opening" | "sliding";
  openingDirection: {
    hinge: "startSide" | "endSide";
    swing: "leftOfWall" | "rightOfWall";
  };
}

export interface Window extends WallOpening {
  sillHeight: Millimeters;
}
