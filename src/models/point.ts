import type { Entity, UUID, Vec2 } from "./common";

export interface PlanPoint extends Entity {
  floorId: UUID;
  position: Vec2;
}
