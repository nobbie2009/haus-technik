import type { Tool, ObjectKind } from "./types";
import type { LayerKind } from "../models/layer";

export type EditorCategory = "building" | "furniture" | "electrical" | "utilities" | "network";
export const categories = [
  { id: "building", label: "Haus / Raum" },
  { id: "furniture", label: "Möbel" },
  { id: "network", label: "Netzwerk" },
  { id: "electrical", label: "Elektrik" },
  { id: "utilities", label: "Wasser / Wärme / Gas" },
] as const;
export function categoryForTool(tool: Tool, current: EditorCategory): EditorCategory {
  if (tool === "select" || tool === "pan") return current;
  if (tool === "utilityNode" || tool === "utilityPipe") return "utilities";
  if (tool === "network") return "network";
  if (tool === "furniture") return "furniture";
  if (tool === "electrical" || tool === "cable" || tool === "connect") return "electrical";
  return "building";
}
export function categoryForObject(kind: ObjectKind): EditorCategory {
  if (kind === "utilityNodes" || kind === "utilityPipes") return "utilities";
  if (kind === "networkNodes") return "network";
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
  if (category === "utilities") return ["water", "heating", "gas"].includes(kind);
  return category === "building" ? kind === "floorPlan" || kind === "dimensions" : kind === category;
}
