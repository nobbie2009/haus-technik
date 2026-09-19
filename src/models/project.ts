import type { DisplayUnit, Entity, EntityTable, ISODateTime, UUID } from "./common";
import type { Floor } from "./floor";
import type { PlanPoint } from "./point";
import type { Wall } from "./wall";
import type { Room } from "./room";
import type { Door, Window } from "./opening";
import type { Dimension } from "./dimension";
import type { PlanLayer } from "./layer";

import type { ElectricalModel } from "../electrical/models";
import type { Furniture } from "./furniture";

export interface Project extends Entity {
  schemaVersion: 10;
  electrical: ElectricalModel;
  furniture: EntityTable<Furniture>;
  /** Monotone Dokumentrevision; keine App-Version. */
  version: number;
  name: string;
  units: { storage: "mm"; display: DisplayUnit };
  floors: EntityTable<Floor>;
  floorOrder: UUID[];
  points: EntityTable<PlanPoint>;
  walls: EntityTable<Wall>;
  rooms: EntityTable<Room>;
  doors: EntityTable<Door>;
  windows: EntityTable<Window>;
  dimensions: EntityTable<Dimension>;
  layers: EntityTable<PlanLayer>;
  layerOrder: UUID[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
