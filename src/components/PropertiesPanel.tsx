import { CableProperties } from "./electrical/CableProperties";
import { ElectricalProperties } from "./electrical/ElectricalProperties";
import { FurnitureProperties } from "./properties/FurnitureProperties";
import { MousePointer2, Lock } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { elementTables } from "../core/elementTables";
import { useEditorStore } from "../stores/editorStore";
import { TextField } from "./Fields";
import { ObjectList } from "./ObjectList";
import { WallProperties } from "./properties/WallProperties";
import { RoomProperties } from "./properties/RoomProperties";
import { OpeningProperties } from "./properties/OpeningProperties";
import { DimensionProperties } from "./properties/DimensionProperties";
import { SelectionActions } from "./properties/SelectionActions";

const labels = {
  furniture: "M\u00f6bel / Objekt",
  junctions: "Verbindungspunkt",
  cables: "Leitung",
  outlets: "Steckdose",
  devices: "Verbraucher",
  distributionBoards: "Verteiler",
  supplies: "Stromeinspeisung",
  meters: "Stromzähler",
  switches: "Lichtschalter",
  controls: "Schaltung / Relais",
  transformers: "Transformator",
  walls: "Wand",
  rooms: "Raum",
  doors: "Tür",
  windows: "Fenster",
  dimensions: "Bemaßung",
};
export function PropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const selection = useEditorStore((s) => s.selection);
  const floorId = useEditorStore((s) => s.floorId);
  const category = useEditorStore((s) => s.category);
  const selected = selection.length === 1 ? selection[0] : null;
  const entity = selected ? elementTables(project)[selected.kind][selected.id] : null;
  const locked = selection.some((item) => {
    const object = elementTables(project)[item.kind][item.id];
    return object && project.layers[object.layerId]?.locked;
  });
  return (
    <aside className="right-panel" aria-label="Eigenschaften">
      <div className="panel-heading">EIGENSCHAFTEN {locked && <Lock size={13} />}</div>
      {entity || selection.length > 1 ? (
        <>
          <h2 className="properties-title">
            {selected ? labels[selected.kind] : `${selection.length} Objekte`}
          </h2>
          {locked && <p className="locked-note">Ebene gesperrt</p>}
          {selected && entity && (
            <div key={selected.id}>
              {(selected.kind === "outlets" ||
                selected.kind === "devices" ||
                selected.kind === "distributionBoards" ||
                selected.kind === "supplies" ||
                selected.kind === "meters" ||
                selected.kind === "switches" ||
                selected.kind === "controls" ||
                selected.kind === "transformers" ||
                selected.kind === "junctions") && (
                <ElectricalProperties id={selected.id} kind={selected.kind} />
              )}
              {selected.kind === "cables" && <CableProperties id={selected.id} />}
              {selected.kind === "furniture" && <FurnitureProperties id={selected.id} />}
              {selected.kind === "walls" && <WallProperties id={selected.id} />}
              {selected.kind === "rooms" && <RoomProperties id={selected.id} />}
              {(selected.kind === "doors" || selected.kind === "windows") && (
                <OpeningProperties id={selected.id} kind={selected.kind} />
              )}
              {selected.kind === "dimensions" && <DimensionProperties id={selected.id} />}
            </div>
          )}
          <SelectionActions locked={locked} />
        </>
      ) : (
        <>
          <div className="empty-properties">
            <MousePointer2 size={30} strokeWidth={1.3} />
            <h2>
              {category === "building"
                ? "Raum für deine Ideen"
                : category === "furniture"
                  ? "Möbel planen"
                  : "Elektrik planen"}
            </h2>
            <p>
              {category === "building"
                ? "Zeichne deinen Grundriss oder wähle ein Objekt, um seine Maße präzise anzupassen."
                : category === "furniture"
                  ? "Platziere eine Vorlage oder wähle ein Möbelstück, um Maße und Drehung anzupassen."
                  : "Platziere Elektroobjekte, zeichne Leitungen oder wähle ein Objekt zum Bearbeiten."}
            </p>
            {category !== "building" && (
              <p>Andere Bereiche bleiben sichtbar und können in diesem Tab nicht ausgewählt werden.</p>
            )}
          </div>
          {category === "building" && (
            <>
              <TextField
                label="Projektname"
                value={project.name}
                onCommit={(value) =>
                  useProjectStore.getState().commit("Projekt umbenennen", (draft) => {
                    draft.name = value;
                  })
                }
              />
              <div className="property-summary">
                <span>
                  Räume
                  <strong>{Object.values(project.rooms).filter((r) => r.floorId === floorId).length}</strong>
                </span>
                <span>
                  Wände
                  <strong>{Object.values(project.walls).filter((w) => w.floorId === floorId).length}</strong>
                </span>
              </div>
              <div className="info-card">
                <strong>Millimetergenau arbeiten</strong>
                <p>Beim Wandzeichnen eine Länge tippen, z. B. 4350, und mit Enter bestätigen.</p>
                <strong>Wandachsmaße</strong>
                <p>Raumflächen beziehen sich auf Wandachsen, nicht auf lichte Innenflächen.</p>
              </div>
            </>
          )}
        </>
      )}
      <ObjectList />
    </aside>
  );
}
