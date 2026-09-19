import { create } from "zustand";
import { categoryForTool } from "../editor/categories";
import type { EditorCategory } from "../editor/categories";
import type { UUID, Vec2 } from "../models/common";
import type { Viewport } from "../geometry/coordinates";
import type { SnapResult } from "../geometry/snapping";
import type { DrawingDraft, Selection, Tool } from "../editor/types";
import { useProjectStore } from "./projectStore";

interface EditorState {
  category: EditorCategory;
  setCategory: (category: EditorCategory) => void;
  floorId: UUID;
  tool: Tool;
  cableStartId: UUID | null;
  connectionRequest: { startNodeId: string; endNodeId: string; cableId: string | null } | null;
  furnitureType: string;
  electricalKind: import("../electrical/models").ElectricalKind;
  viewport: Viewport;
  size: { width: number; height: number };
  selection: Selection[];
  draft: DrawingDraft;
  cursor: Vec2;
  snap: SnapResult | null;
  gridSize: number;
  showGrid: boolean;
  snapGrid: boolean;
  snapPoints: boolean;
  snapWalls: boolean;
  showMeasurements: boolean;
  spacePressed: boolean;
  dragOffset: Vec2 | null;
  ready: boolean;
  message: string | null;
  setTool: (tool: Tool) => void;
  setFloor: (id: UUID) => void;
  cancel: () => void;
}
const emptyDraft = (): DrawingDraft => ({ points: [], cursor: null, input: "" });

export const useEditorStore = create<EditorState>((set, get) => ({
  category: "building",
  setCategory(category) {
    set({
      category,
      selection: [],
      tool: category === "building" ? "select" : category === "furniture" ? "furniture" : "electrical",
      draft: emptyDraft(),
      cableStartId: null,
      connectionRequest: null,
      snap: null,
      dragOffset: null,
    });
  },
  floorId: useProjectStore.getState().project.floorOrder[0]!,
  tool: "select",
  connectionRequest: null,
  cableStartId: null,
  furnitureType: "sofa",
  electricalKind: "outlets",
  viewport: { scale: 0.07, originPx: { x: 120, y: 480 } },
  size: { width: 800, height: 600 },
  selection: [],
  draft: emptyDraft(),
  cursor: { x: 0, y: 0 },
  snap: null,
  gridSize: 100,
  showGrid: true,
  snapGrid: true,
  snapPoints: true,
  snapWalls: true,
  showMeasurements: true,
  spacePressed: false,
  dragOffset: null,
  ready: false,
  message: null,
  setTool(tool) {
    const category = categoryForTool(tool, get().category);
    set({
      tool,
      category,
      selection: category === get().category ? get().selection : [],
      draft: emptyDraft(),
      cableStartId: null,
      connectionRequest: null,
      snap: null,
      dragOffset: null,
    });
  },
  setFloor(floorId) {
    set({
      floorId,
      selection: [],
      draft: emptyDraft(),
      cableStartId: null,
      connectionRequest: null,
      snap: null,
      dragOffset: null,
    });
  },
  cancel() {
    set({ draft: emptyDraft(), cableStartId: null, connectionRequest: null, snap: null, dragOffset: null });
  },
}));
