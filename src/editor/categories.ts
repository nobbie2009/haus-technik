import type { Tool, ObjectKind } from "./types";
import type { LayerKind } from "../models/layer";

export type EditorCategory = "building" | "furniture" | "electrical";
export const categories = [
  { id: "building", label: "Haus / Raum" },
  { id: "furniture", label: "Möbel" },
  { id: "electrical", label: "Elektrik" },
] as const;
export function categoryForTool(tool: Tool, current: EditorCategory): EditorCategory {
  if (tool === "select" || tool === "pan") return current;
  if (tool === "furniture") return "furniture";
  if (tool === "electrical" || tool === "cable" || tool === "connect") return "electrical";
  return "building";
}
export function categoryForObject(kind: ObjectKind): EditorCategory {
  if (kind === "furniture") return "furniture";
  return [
    "outlets",
    "devices",
    "distributionBoards",
    "junctions",
    "cables",
    "supplies",
    "meters",
    "switches",
    "controls",
    "transformers",
  ].includes(kind)
    ? "electrical"
    : "building";
}
export function layerInCategory(kind: LayerKind, category: EditorCategory): boolean {
  return category === "building" ? kind === "floorPlan" || kind === "dimensions" : kind === category;
}
