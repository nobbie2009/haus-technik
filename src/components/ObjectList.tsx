import { utilities, pipeOnFloor } from "../utilities/model";
import { elementKinds, elementTables } from "../core/elementTables";
import { categoryForObject } from "../editor/categories";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { formatLength } from "../utils/units";
import { getWallMeasurements } from "../core/selectors";
import type { ObjectKind } from "../editor/types";
import { useSimulationStore } from "../stores/simulationStore";
import { deviceAppearance } from "../rendering/deviceAppearance";
import { cableOnFloor } from "../electrical/cables";

const labels: Record<ObjectKind, string> = {
  siteElements: "Außenobjekt",
  networkNodes: "Netzwerkgerät",
  utilityNodes: "Rohrnetz-Komponente",
  utilityPipes: "Rohrleitung",
  furniture: "M\u00f6bel",
  rooms: "Raum",
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
  doors: "Tür",
  windows: "Fenster",
  dimensions: "Bemaßung",
};
export function ObjectList() {
  const project = useProjectStore((s) => s.project);
  const floorId = useEditorStore((s) => s.floorId);
  const category = useEditorStore((s) => s.category);
  const selection = useEditorStore((s) => s.selection);
  const result = useSimulationStore((s) => s.result);
  const rows = elementKinds
    .filter((kind) => categoryForObject(kind) === category || (category === "site" && kind === "dimensions"))
    .flatMap((kind) =>
      Object.values(elementTables(project)[kind])
        .filter(
          (entity) =>
            (kind === "cables"
              ? cableOnFloor(project, project.electrical.cables[entity.id]!, floorId)
              : kind === "utilityPipes"
                ? pipeOnFloor(project, utilities(project).pipes[entity.id]!, floorId)
                : entity.floorId === floorId) && project.layers[entity.layerId]?.visible,
        )
        .map((entity, i) => ({
          kind,
          id: entity.id,
          name: "name" in entity ? String(entity.name) : `${labels[kind]} ${i + 1}`,
          detail:
            kind === "walls"
              ? formatLength(getWallMeasurements(project, entity.id).length, project.units.display)
              : "",
        })),
    );
  return (
    <details className="object-list">
      <summary>
        Objekte im aktiven Bereich <span>{rows.length}</span>
      </summary>
      <div>
        {rows.map((row) => (
          <button
            key={row.id}
            aria-pressed={selection.some((s) => s.id === row.id)}
            onClick={(event) => {
              useEditorStore.getState().setTool("select");
              useEditorStore.setState({
                selection: event.shiftKey
                  ? selection.some((s) => s.id === row.id)
                    ? selection.filter((s) => s.id !== row.id)
                    : [...selection, { kind: row.kind, id: row.id }]
                  : [{ kind: row.kind, id: row.id }],
              });
            }}
          >
            <span>{row.name}</span>
            <small>
              {row.kind === "devices" && result ? (
                <span aria-label={`${project.electrical.devices[row.id]!.label} Betriebsanzeige`}>
                  {deviceAppearance(project.electrical.devices[row.id]!, result.devices[row.id]).label}
                </span>
              ) : (
                row.detail
              )}
            </small>
          </button>
        ))}
        {!rows.length && <p>Noch keine Objekte.</p>}
      </div>
    </details>
  );
}
