import { ensureSiteLayer, type SiteKind } from "../site/model";
import { ensureNetworkLayer, type NetworkKind } from "../network/model";
import type { Medium, UtilityKind } from "../utilities/model";
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
  siteKind: SiteKind;
  siteWidth: number;
  networkKind: NetworkKind;
  networkCableId: string | null;
  electricalKind: import("../electrical/models").ElectricalKind;
  consumerEntryId: string | null;
  solarPlacement: { kind: import("../electrical/solarPlan").SolarKind; plantId: string | null } | null;
  utilityMedium: Medium;
  utilityKind: UtilityKind;
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
  showFloorReferences: boolean;
  spacePressed: boolean;
  orthogonal: boolean;
  multiSelect: boolean;
  dragOffset: Vec2 | null;
  dragPointId: UUID | null;
  dragResize: { id: string; handle: number; grid: number } | null;
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
    if (category === "site")
      useProjectStore.getState().commit("Grundstücksebene bereitstellen", ensureSiteLayer);
    if (category === "network")
      useProjectStore.getState().commit("Netzwerkebene bereitstellen", ensureNetworkLayer);
    set({
      category,
      consumerEntryId: null,
      solarPlacement: null,
      selection: [],
      tool:
        category === "site"
          ? "site"
          : category === "building"
            ? "select"
            : category === "furniture"
              ? "furniture"
              : category === "network"
                ? "network"
                : category === "utilities"
                  ? "select"
                  : "electrical",
      draft: emptyDraft(),
      cableStartId: null,
      networkCableId: null,
      connectionRequest: null,
      snap: null,
      dragPointId: null,
      dragResize: null,
      dragOffset: null,
    });
  },
  floorId: useProjectStore.getState().project.floorOrder[0]!,
  tool: "select",
  connectionRequest: null,
  cableStartId: null,
  networkCableId: null,
  utilityMedium: "cold",
  utilityKind: "source",
  furnitureType: "sofa",
  siteKind: "boundary",
  siteWidth: 1000,
  networkKind: "router",
  electricalKind: "outlets",
  consumerEntryId: null,
  solarPlacement: null,
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
  showFloorReferences: false,
  spacePressed: false,
  orthogonal: false,
  multiSelect: false,
  dragPointId: null,
  dragResize: null,
  dragOffset: null,
  ready: false,
  message: null,
  setTool(tool) {
    const category = categoryForTool(tool, get().category);
    set({
      tool,
      consumerEntryId: null,
      solarPlacement: null,
      category,
      selection: category === get().category ? get().selection : [],
      draft: emptyDraft(),
      cableStartId: null,
      networkCableId: null,
      connectionRequest: null,
      snap: null,
      dragPointId: null,
      dragResize: null,
      dragOffset: null,
    });
  },
  setFloor(floorId) {
    set({
      floorId,
      selection: [],
      draft: emptyDraft(),
      cableStartId: null,
      networkCableId: null,
      connectionRequest: null,
      snap: null,
      dragPointId: null,
      dragResize: null,
      dragOffset: null,
    });
  },
  cancel() {
    set({
      tool: get().tool === "networkCable" ? "select" : get().tool,
      draft: emptyDraft(),
      cableStartId: null,
      networkCableId: null,
      connectionRequest: null,
      snap: null,
      dragPointId: null,
      dragResize: null,
      dragOffset: null,
    });
  },
}));
