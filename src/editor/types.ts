import type { elementKinds } from "../core/elementTables";
import type { UUID, Vec2 } from "../models/common";

export type Tool =
  | "site"
  | "network"
  | "networkCable"
  | "utilityNode"
  | "utilityPipe"
  | "select"
  | "pan"
  | "wall"
  | "rectangle"
  | "polygon"
  | "dimension"
  | "door"
  | "window"
  | "furniture"
  | "electrical"
  | "connect"
  | "cable";
export type ObjectKind = (typeof elementKinds)[number];
export interface Selection {
  kind: ObjectKind;
  id: UUID;
}
export interface DrawingDraft {
  points: Vec2[];
  cursor: Vec2 | null;
  input: string;
}
export type ProjectMutation = (project: import("../models/project").Project) => void;
export const toolLabels: Record<Tool, string> = {
  site: "Grundstück",
  network: "Netzwerkgerät",
  networkCable: "Netzwerk-Leitungsweg",
  utilityNode: "Komponente",
  utilityPipe: "Rohrleitung",
  connect: "Anschließen",
  furniture: "M\u00f6bel",
  electrical: "Elektrik",
  cable: "Leitung",
  select: "Auswahl",
  pan: "Verschieben",
  wall: "Wand",
  rectangle: "Rechteckraum",
  polygon: "Freier Raum",
  dimension: "Bemaßung",
  door: "Tür",
  window: "Fenster",
};
