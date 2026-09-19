export type UUID = string;
export type Millimeters = number;
export type SquareMillimeters = number;
export type ISODateTime = string;
export type DisplayUnit = "mm" | "cm" | "m";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Metadata = Record<string, JsonValue>;
export type EntityTable<T> = Record<UUID, T>;

export interface Entity {
  id: UUID;
  metadata: Metadata;
}

export interface Vec2 {
  x: Millimeters;
  y: Millimeters;
}

export interface FloorElement extends Entity {
  floorId: UUID;
  layerId: UUID;
}
