import { usePropertyFields } from "../properties/usePropertyFields";
import { LengthField } from "../Fields";
import { electricalNodes, cableFloorPath } from "../../electrical/cables";

export function CableRouteFields({ id }: { id: string }) {
  const { project, locked, change, lengthField, unit } = usePropertyFields({ kind: "cables", id });
  const cable = project.electrical.cables[id]!;
  return (
    <>
      {cable.riser && (
        <>
          <h3>Geschossübergang</h3>
          <p>
            {project.floors[cable.floorId]!.name} →{" "}
            {project.floors[electricalNodes(project)[cable.endNodeId]!.floorId]!.name}
          </p>
          {(["x", "y"] as const).map((axis) =>
            lengthField(`Steigpunkt ${axis.toUpperCase()}`, cable.riser![axis], (draft, value) => {
              draft.electrical.cables[id]!.riser![axis] = value;
            }),
          )}
          <details className="cable-waypoints">
            <summary>Zielgeschoss · {cable.endPath.length} Zwischenpunkte</summary>
            {cable.endPath.map((point, index) => (
              <div className="waypoint-row" key={index}>
                {(["x", "y"] as const).map((axis) => (
                  <LengthField
                    key={axis}
                    label={`Zielweg ${index + 1} ${axis.toUpperCase()}`}
                    value={point[axis]}
                    unit={unit}
                    disabled={locked}
                    onCommit={(value) =>
                      change((draft) => {
                        draft.electrical.cables[id]!.endPath[index]![axis] = value;
                      })
                    }
                  />
                ))}
                <button
                  disabled={locked}
                  onClick={() =>
                    change((draft) => {
                      draft.electrical.cables[id]!.endPath.splice(index, 1);
                    })
                  }
                >
                  Zielwegpunkt {index + 1} entfernen
                </button>
              </div>
            ))}
            <button
              disabled={locked}
              onClick={() =>
                change((draft) => {
                  const c = draft.electrical.cables[id]!,
                    a = c.endPath.at(-1) ?? c.riser!,
                    b = electricalNodes(draft)[c.endNodeId]!.position;
                  c.endPath.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
                })
              }
            >
              Zielwegpunkt ergänzen
            </button>
          </details>
        </>
      )}
      <details className="cable-waypoints">
        <summary>Leitungsweg · {cable.path.length} Zwischenpunkte</summary>
        {cable.path.map((point, index) => (
          <div className="waypoint-row" key={index}>
            <strong>Punkt {index + 1}</strong>
            {(["x", "y"] as const).map((axis) => (
              <LengthField
                key={axis}
                label={`Wegpunkt ${index + 1} ${axis.toUpperCase()}`}
                value={point[axis]}
                unit={unit}
                disabled={locked}
                onCommit={(value) =>
                  change((draft) => {
                    draft.electrical.cables[id]!.path[index]![axis] = value;
                  })
                }
              />
            ))}
            <button
              disabled={locked}
              onClick={() =>
                change((draft) => {
                  draft.electrical.cables[id]!.path.splice(index, 1);
                })
              }
            >
              Punkt {index + 1} entfernen
            </button>
          </div>
        ))}
        <button
          disabled={locked}
          onClick={() =>
            change((draft) => {
              const path = cableFloorPath(draft, draft.electrical.cables[id]!, cable.floorId);
              const a = path.at(-2)!,
                b = path.at(-1)!;
              draft.electrical.cables[id]!.path.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            })
          }
        >
          Zwischenpunkt ergänzen
        </button>
      </details>
    </>
  );
}
