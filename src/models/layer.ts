import type { Entity } from "./common";

export type LayerKind =
  "floorPlan" | "dimensions" | "furniture" | "electrical" | "water" | "gas" | "network" | "zigbee";

export interface PlanLayer extends Entity {
  kind: LayerKind;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}
