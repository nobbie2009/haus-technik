import { CableRenderer } from "./CableRenderer";
import { TouchDrawingControls } from "../../components/TouchDrawingControls";
import { BackgroundImage, HousebookOverlay } from "./HousebookOverlay";
import { ElectricalRenderer, ElectricalPreview } from "./ElectricalRenderer";
import { FurnitureRenderer, FurniturePreview } from "./FurnitureRenderer";
import { Stage, Layer } from "react-konva";
import { Scan, Minus, Plus } from "lucide-react";
import { fitView } from "../../editor/interaction/commands";
import { useCanvasInteraction } from "../../editor/interaction/useCanvasInteraction";
import { GridRenderer } from "./GridRenderer";
import { FloorRenderer } from "./FloorRenderer";
import { InteractionOverlay } from "./InteractionOverlay";
import { SimulationOverlay } from "./SimulationOverlay";
import { SimulationPlanControls } from "../SimulationPlanControls";

const hints = {
  connect: "Von einem Elektroobjekt zum anderen ziehen oder beide nacheinander anklicken. Escape: abbrechen.",
  cable: "Startobjekt, Wegpunkte, Endobjekt anklicken. Backspace: Punkt entfernen. Escape: abbrechen.",
  electrical: "Objekt links w\u00e4hlen und platzieren. V oder Escape: Auswahl. Anschluss rechts zuordnen.",
  furniture: "Vorlage links w\u00e4hlen, Mittelpunkt anklicken, Ma\u00dfe und Drehung rechts bearbeiten",
  select: "Klicken zum Auswählen · Shift für Mehrfachauswahl · Ziehen zum Verschieben",
  pan: "Zeichenfläche ziehen · Mausrad zum Zoomen",
  wall: "Punkte setzen · Länge tippen + Enter · Shift: rechtwinklig · Esc: beenden",
  rectangle: "Zwei gegenüberliegende Ecken anklicken",
  polygon: "Eckpunkte anklicken · Enter oder erster Punkt schließt den Raum",
  dimension: "Zwei Messpunkte anklicken",
  door: "Auf eine Wand klicken, um eine Tür einzusetzen",
  window: "Auf eine Wand klicken, um ein Fenster einzusetzen",
};

export function PlanStage() {
  const { host, project, editor, preview, down, move, up, cancel, zoom } = useCanvasInteraction();
  return (
    <main
      className={`drawing-host cursor-${editor.spacePressed ? "pan" : editor.tool}`}
      ref={host}
      tabIndex={0}
      aria-label="Zeichenfläche"
      data-testid="drawing-surface"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="canvas-title">
        <span className="eyebrow">
          GRUNDRISS / {String(project.floorOrder.indexOf(editor.floorId) + 1).padStart(2, "0")}
        </span>
        <strong>{project.floors[editor.floorId]?.name}</strong>
        <span className="canvas-subtitle">
          {Object.values(project.rooms).filter((r) => r.floorId === editor.floorId).length} Räume ·
          Wandachsmaße
        </span>
      </div>
      <Stage width={editor.size.width} height={editor.size.height}>
        <Layer listening={false}>
          <GridRenderer
            viewport={editor.viewport}
            width={editor.size.width}
            height={editor.size.height}
            gridSize={editor.gridSize}
            visible={editor.showGrid}
          />
        </Layer>
        <Layer listening={false}>
          <BackgroundImage project={preview} floorId={editor.floorId} viewport={editor.viewport} />
          <FloorRenderer
            project={preview}
            floorId={editor.floorId}
            viewport={editor.viewport}
            selection={editor.selection}
            measurements={editor.showMeasurements}
            width={editor.size.width}
            height={editor.size.height}
          />
        </Layer>
        <Layer listening={false}>
          <FurnitureRenderer
            project={preview}
            floorId={editor.floorId}
            viewport={editor.viewport}
            selection={editor.selection}
          />
          <FurniturePreview />
          <CableRenderer
            project={preview}
            floorId={editor.floorId}
            viewport={editor.viewport}
            selection={editor.selection}
            measurements={editor.showMeasurements}
          />
          <ElectricalRenderer
            project={preview}
            floorId={editor.floorId}
            viewport={editor.viewport}
            selection={editor.selection}
          />
          <ElectricalPreview />
          <SimulationOverlay project={preview} floorId={editor.floorId} viewport={editor.viewport} />
          <InteractionOverlay />
          <HousebookOverlay project={preview} floorId={editor.floorId} viewport={editor.viewport} />
        </Layer>
      </Stage>
      <SimulationPlanControls />
      <TouchDrawingControls />
      <div className="canvas-help">{hints[editor.tool]}</div>
      <div className="canvas-controls">
        <button aria-label="Verkleinern" onClick={() => zoom(0.8)}>
          <Minus size={15} />
        </button>
        <span>{Math.round(editor.viewport.scale * 1000)} %</span>
        <button aria-label="Vergrößern" onClick={() => zoom(1.25)}>
          <Plus size={15} />
        </button>
        <button onClick={fitView} title="Alles anzeigen (Home)" aria-label="Alles anzeigen">
          <Scan size={16} />
        </button>
      </div>
    </main>
  );
}
