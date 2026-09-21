import { gpsSurveySchema } from "../../site/gps";
import { useState } from "react";
import { site, siteKinds, siteArea, siteLength, siteSegments } from "../../site/model";
import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField, LengthField } from "../Fields";
import { SelectField } from "../electrical/ElectricalFields";
import { formatArea, formatLength } from "../../utils/units";
import { distance } from "../../geometry/distance";
import { WallPhotoDialog } from "../housebook/WallPhotoDialog";
export function SiteProperties({ id }: { id: string }) {
  const [photos, setPhotos] = useState(false);
  const { project, locked, unit, change } = usePropertyFields({ kind: "siteElements", id });
  const item = site(project).elements[id]!,
    [index, setIndex] = useState(0);
  const current = Math.min(index, item.vertices.length - 1),
    point = item.vertices[current]!,
    area = siteArea(item);
  const survey = gpsSurveySchema.safeParse(item.metadata.gpsSurvey);
  return (
    <>
      <button onClick={() => setPhotos(true)}>Leitungsfotos dieser Außenfläche</button>
      {photos && <WallPhotoDialog wallId={id} onClose={() => setPhotos(false)} />}
      <p>{siteKinds[item.kind]}</p>
      {survey.success && (
        <p className="field-hint">
          GPS-Groberfassung: gemeldete Punktgenauigkeit bis ±
          {Math.max(...survey.data.fixes.map((f) => f.accuracy)).toFixed(1)} m; Referenz ±
          {survey.data.reference.fix.accuracy.toFixed(1)} m. Koordinaten können anschließend manuell
          korrigiert worden sein.
        </p>
      )}
      <TextField
        label="Außenobjektname"
        value={item.name}
        disabled={locked}
        onCommit={(value) =>
          change((p) => {
            site(p).elements[id]!.name = value;
          })
        }
      />
      {area !== null && (
        <div className="area-card">
          <span>Fläche</span>
          <strong>{formatArea(area)}</strong>
        </div>
      )}
      {item.kind !== "reference" && (
        <p>
          {item.kind === "path" ? "Weglänge (Mittellinie)" : "Umfang"}: {formatLength(siteLength(item), unit)}
        </p>
      )}
      {item.kind === "path" && (
        <LengthField
          label="Wegbreite"
          value={item.width}
          unit={unit}
          disabled={locked}
          onCommit={(v) =>
            change((p) => {
              site(p).elements[id]!.width = v;
            })
          }
        />
      )}
      <SelectField
        label="Eck- oder Referenzpunkt"
        value={String(current)}
        onChange={(v) => setIndex(Number(v))}
      >
        {item.vertices.map((_, i) => (
          <option key={i} value={i}>
            P{i + 1}
          </option>
        ))}
      </SelectField>
      {(["x", "y"] as const).map((axis) => (
        <LengthField
          key={`${current}:${axis}`}
          label={`Punkt ${axis.toUpperCase()}`}
          value={point[axis]}
          unit={unit}
          disabled={locked}
          onCommit={(v) =>
            change((p) => {
              site(p).elements[id]!.vertices[current]![axis] = v;
            })
          }
        />
      ))}
      <p className="field-hint">
        Punkte werden in allen Planungsbereichen gefangen. Koordinaten beziehen sich auf den Ursprung des
        aktiven Geschosses.
      </p>
      {item.kind !== "reference" && (
        <details>
          <summary>Kantenmaße</summary>
          <ul>
            {siteSegments(item).map(([a, b], i) => (
              <li key={i}>
                P{i + 1} – P{((i + 1) % item.vertices.length) + 1}: {formatLength(distance(a, b), unit)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
