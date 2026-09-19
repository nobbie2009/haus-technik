import { dimensionGeometry } from "../../geometry/dimensions";
import { formatLength } from "../../utils/units";
import { usePropertyFields } from "./usePropertyFields";

export function DimensionProperties({ id }: { id: string }) {
  const { project, locked, unit, change, lengthField } = usePropertyFields({ kind: "dimensions", id });
  const dimension = project.dimensions[id]!;
  return (
    <>
      <div className="area-card">
        <span>Gemessene Länge</span>
        <strong>{formatLength(dimensionGeometry(project, dimension).length, unit)}</strong>
      </div>
      {lengthField("Abstand zur Geometrie", dimension.offset, (draft, value) => {
        draft.dimensions[id]!.offset = value;
      })}
      <label className="field">
        Ausrichtung
        <select
          aria-label="Ausrichtung"
          value={dimension.mode}
          disabled={locked}
          onChange={(event) =>
            change((draft) => {
              draft.dimensions[id]!.mode = event.target.value as "aligned" | "horizontal" | "vertical";
            })
          }
        >
          <option value="aligned">Entlang der Strecke</option>
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertikal</option>
        </select>
      </label>
      <p className="field-hint">
        Dieses Maß folgt seinen Bezugspunkten. Die Geometrie lässt sich über Wand- und Raumeigenschaften
        ändern.
      </p>
    </>
  );
}
