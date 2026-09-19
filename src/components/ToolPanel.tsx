import {
  Armchair,
  PlugZap,
  Link2,
  Cable,
  Hand,
  MousePointer2,
  Square,
  Spline,
  Pentagon,
  Ruler,
  DoorOpen,
  PanelsTopLeft,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Layers,
  Settings2,
} from "lucide-react";
import { ElectricalLibrary } from "./electrical/ElectricalLibrary";
import { CategoryTabs } from "./CategoryTabs";
import { categoryForTool } from "../editor/categories";
import { FurnitureLibrary } from "./FurnitureLibrary";
import { useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import type { Tool } from "../editor/types";
import { fitView } from "../editor/interaction/commands";
import { FloorDialog } from "./dialogs/FloorDialog";

const tools = [
  { id: "select", label: "Auswahl", key: "V", Icon: MousePointer2 },
  { id: "pan", label: "Verschieben", key: "H", Icon: Hand },
  { id: "cable", label: "Leitung", key: "L", Icon: Cable },
  { id: "connect", label: "Anschließen", key: "A", Icon: Link2 },
  { id: "electrical", label: "Elektrik", key: "E", Icon: PlugZap },
  { id: "furniture", label: "M\u00f6bel / Objekte", key: "M", Icon: Armchair },
  { id: "wall", label: "Wand", key: "W", Icon: Spline },
  { id: "rectangle", label: "Rechteckraum", key: "R", Icon: Square },
  { id: "polygon", label: "Freier Raum", key: "P", Icon: Pentagon },
  { id: "dimension", label: "Bemaßung", key: "D", Icon: Ruler },
  { id: "door", label: "Tür", key: "T", Icon: DoorOpen },
  { id: "window", label: "Fenster", key: "F", Icon: PanelsTopLeft },
] as const;

export function ToolPanel() {
  const project = useProjectStore((s) => s.project);
  const tool = useEditorStore((s) => s.tool);
  const category = useEditorStore((s) => s.category);
  const floorId = useEditorStore((s) => s.floorId);
  const [floorDialog, setFloorDialog] = useState<"new" | string | null>(null);
  const commit = useProjectStore((s) => s.commit);
  return (
    <aside className="left-panel" aria-label="Werkzeuge und Ebenen">
      <CategoryTabs />
      <div role="tabpanel" id={`tools-${category}`} aria-labelledby={`category-${category}`}>
        <div className="panel-heading">WERKZEUGE</div>
        <nav className="tool-list" aria-label="Zeichenwerkzeuge">
          {tools
            .filter((item) => categoryForTool(item.id, category) === category)
            .map(({ id, label, key, Icon }) => (
              <button
                key={id}
                className={`tool ${tool === id ? "active" : ""}`}
                aria-pressed={tool === id}
                title={`${label} (${key})`}
                onClick={() => useEditorStore.getState().setTool(id as Tool)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                <kbd>{key}</kbd>
              </button>
            ))}
        </nav>
        {category === "furniture" && <FurnitureLibrary />}
        {category === "electrical" && <ElectricalLibrary />}
      </div>
      <div className="panel-heading section-line">
        GESCHOSSE
        <button
          className="subtle icon-button"
          aria-label="Etage erstellen"
          onClick={() => setFloorDialog("new")}
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="floor-list">
        {project.floorOrder.map((id, index) => (
          <div key={id} className="floor-row">
            <button
              className={`floor-item ${floorId === id ? "active" : ""}`}
              aria-pressed={floorId === id}
              onClick={() => {
                useEditorStore.getState().setFloor(id);
                fitView();
              }}
            >
              <Layers size={15} />
              <span>{project.floors[id]!.name}</span>
              <span className="floor-tag">{String(index + 1).padStart(2, "0")}</span>
            </button>
            <button
              className="subtle floor-settings"
              aria-label={`${project.floors[id]!.name} bearbeiten`}
              onClick={() => setFloorDialog(id)}
            >
              <Settings2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="panel-heading section-line">EBENEN</div>
      <div className="layer-list">
        {project.layerOrder.map((id) => {
          const layer = project.layers[id]!;
          return (
            <div className="layer-row" key={id}>
              <span className={`layer-dot ${layer.kind}`} />
              <span>{layer.name}</span>
              <button
                className="subtle icon-button"
                title={layer.visible ? "Ausblenden" : "Einblenden"}
                aria-label={`${layer.name} ${layer.visible ? "ausblenden" : "einblenden"}`}
                onClick={() =>
                  commit("Ebenensichtbarkeit ändern", (draft) => {
                    draft.layers[id]!.visible = !layer.visible;
                  })
                }
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                className="subtle icon-button"
                aria-label={`${layer.name} ${layer.locked ? "entsperren" : "sperren"}`}
                onClick={() =>
                  commit("Ebenensperre ändern", (draft) => {
                    draft.layers[id]!.locked = !layer.locked;
                  })
                }
              >
                {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="sidebar-note">
        <span className="eyebrow">PRÄZISE GEPLANT</span>
        <p>Ein Grundriss. Die Basis für deine Haustechnik.</p>
      </div>
      {floorDialog && (
        <FloorDialog
          floorId={floorDialog === "new" ? null : floorDialog}
          onClose={() => setFloorDialog(null)}
        />
      )}
    </aside>
  );
}
