import { SiteLibrary } from "./site/SiteLibrary";
import { NetworkLibrary } from "./network/NetworkLibrary";
import { UtilityLibrary } from "./utilities/UtilityLibrary";
import {
  ChevronDown,
  ChevronUp,
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
import { useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import type { Tool } from "../editor/types";
import { fitView } from "../editor/interaction/commands";
import { FloorDialog } from "./dialogs/FloorDialog";
import { orderedFloorIds } from "../models/floor";

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

export function ToolPanel({
  expanded,
  onExpandedChange,
  propertiesOpen,
  onPropertiesToggle,
}: {
  propertiesOpen: boolean;
  onPropertiesToggle: () => void;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}) {
  const project = useProjectStore((s) => s.project);
  const tool = useEditorStore((s) => s.tool);
  const category = useEditorStore((s) => s.category);
  const contentRef = useRef<HTMLDivElement>(null);
  const floorsGroup = useRef<HTMLElement>(null);
  const layersGroup = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ left: 0, top: 0 });
  }, [category]);
  const revealGroup = (group: "floors" | "layers") => {
    onExpandedChange(true);
    setFloorDialog(null);
    requestAnimationFrame(() => {
      const element = group === "floors" ? floorsGroup.current : layersGroup.current;
      if (element && contentRef.current)
        contentRef.current.scrollTo({ left: element.offsetLeft - contentRef.current.offsetLeft - 16 });
    });
  };
  const floorId = useEditorStore((s) => s.floorId);
  const [floorDialog, setFloorDialog] = useState<"new" | string | null>(null);
  const commit = useProjectStore((s) => s.commit);
  const orderedFloors = orderedFloorIds(project);
  const showFloorReferences = useEditorStore((s) => s.showFloorReferences);
  return (
    <aside
      className={`left-panel ribbon ${expanded ? "ribbon-expanded" : ""}`}
      aria-label="Werkzeuge und Ebenen"
    >
      <div className="ribbon-header">
        <CategoryTabs onActivate={() => onExpandedChange(true)} />
        <button
          className="ribbon-toggle"
          aria-expanded={expanded}
          aria-controls="tools-panel"
          onClick={() => onExpandedChange(!expanded)}
          title={expanded ? "Menüband ausblenden" : "Menüband einblenden"}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Menüband
        </button>
        <div className="ribbon-view">
          <button onClick={() => revealGroup("floors")} title="Geschosse verwalten">
            <Layers size={16} />
            <span>{project.floors[floorId]?.name}</span>
          </button>
          <button onClick={() => revealGroup("layers")}>
            <Eye size={16} />
            Ebenen
          </button>
          <button
            className="ribbon-properties"
            aria-expanded={propertiesOpen}
            aria-controls="properties-panel"
            onClick={onPropertiesToggle}
            aria-label="Eigenschaften"
          >
            <Settings2 size={16} />
            <span>Eigenschaften</span>
          </button>
        </div>
      </div>
      <div id="tools-panel" className="ribbon-content" ref={contentRef}>
        <div role="tabpanel" id={`tools-${category}`} aria-labelledby={`category-${category}`}>
          <div className="ribbon-tool-group">
            <div className="panel-heading">ZEICHNEN & AUSWÄHLEN</div>
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
          </div>
          {category === "site" && <SiteLibrary />}
          {category === "network" && <NetworkLibrary />}
          {category === "utilities" && <UtilityLibrary />}
          {category === "furniture" && <FurnitureLibrary />}
          {category === "electrical" && <ElectricalLibrary />}
          <section
            className="ribbon-common-group ribbon-floors"
            aria-label="Geschosse verwalten"
            ref={floorsGroup}
          >
            <div className="panel-heading section-line">
              GESCHOSSE
              <button
                className="subtle icon-button"
                aria-label="Etage erstellen"
                onClick={() => {
                  setFloorDialog("new");
                }}
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="floor-list">
              {orderedFloors.map((id, index) => (
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
                    onClick={() => {
                      setFloorDialog(id);
                    }}
                  >
                    <Settings2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <label className="floor-reference-toggle">
              <input
                type="checkbox"
                checked={showFloorReferences}
                onChange={(event) => useEditorStore.setState({ showFloorReferences: event.target.checked })}
              />
              Etagenreferenzen anzeigen
            </label>
          </section>
          <section className="ribbon-common-group ribbon-layers" aria-label="Ebenen" ref={layersGroup}>
            <div className="panel-heading">EBENEN</div>
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
          </section>
        </div>
      </div>
      <div hidden={!expanded}>
        {floorDialog && (
          <FloorDialog
            inline
            key={floorDialog}
            floorId={floorDialog === "new" ? null : floorDialog}
            onClose={() => {
              setFloorDialog(null);
            }}
          />
        )}
      </div>
    </aside>
  );
}
