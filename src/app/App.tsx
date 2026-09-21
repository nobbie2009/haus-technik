import { elementTables } from "../core/elementTables";
import { categoryForObject } from "../editor/categories";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { Toolbar } from "../components/Toolbar";
import { SimulationBanner } from "../components/simulation/SimulationBanner";
import { ConnectionDialog } from "../components/electrical/ConnectionDialog";
import { ToolPanel } from "../components/ToolPanel";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { StatusBar } from "../components/StatusBar";
import { PlanStage } from "../rendering/konva/PlanStage";
import { useKeyboard } from "../editor/interaction/keyboard";
import { initializePersistence } from "../persistence/autosave";

export function App() {
  const [panel, setPanel] = useState<"properties" | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const project = useProjectStore((s) => s.project);
  const error = useProjectStore((s) => s.error);
  const saveError = useProjectStore((s) => s.saveError);
  const message = useEditorStore((s) => s.message);
  const connectionRequest = useEditorStore((s) => s.connectionRequest);
  useKeyboard();
  useEffect(() => {
    void initializePersistence();
  }, []);
  useEffect(() => {
    const editor = useEditorStore.getState();
    if (!project.floors[editor.floorId]) editor.setFloor(project.floorOrder[0]!);
    const selection = editor.selection.filter((item) => {
      const entity = elementTables(project)[item.kind][item.id];
      return (
        entity && project.layers[entity.layerId]?.visible && categoryForObject(item.kind) === editor.category
      );
    });
    if (selection.length !== editor.selection.length) useEditorStore.setState({ selection });
  }, [project]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => useEditorStore.setState({ message: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <div className="app-shell">
      <Toolbar />
      <SimulationBanner />
      <ToolPanel
        expanded={toolsExpanded}
        onExpandedChange={setToolsExpanded}
        propertiesOpen={panel === "properties"}
        onPropertiesToggle={() => setPanel(panel === "properties" ? null : "properties")}
      />
      <div className="workspace">
        {panel && (
          <button
            className="panel-backdrop"
            aria-label="Seitenleiste schließen"
            onClick={() => setPanel(null)}
          />
        )}
        <PlanStage />
        <div
          id="properties-panel"
          className={`panel-slot properties-slot ${panel === "properties" ? "panel-open" : ""}`}
        >
          <PropertiesPanel />
        </div>
      </div>
      <StatusBar />
      {connectionRequest && <ConnectionDialog />}
      {(error || message) && (
        <div className={`toast ${error ? "toast-error" : ""}`} role={error ? "alert" : "status"}>
          {error ?? message}
          <button
            className="subtle"
            aria-label="Meldung schließen"
            onClick={() => {
              useProjectStore.setState({ error: null });
              useEditorStore.setState({ message: null });
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {saveError && (
        <div className="save-error" role="alert">
          {saveError} · Dein Entwurf bleibt geöffnet. Bitte erneut speichern oder JSON exportieren.
        </div>
      )}
    </div>
  );
}
