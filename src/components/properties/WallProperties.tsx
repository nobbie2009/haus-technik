import { useState } from "react";
import { getWallMeasurements } from "../../core/selectors";
import { resizeWall } from "../../editor/actions/edit";
import { TextField } from "../Fields";
import { usePropertyFields } from "./usePropertyFields";
import { WallPhotoDialog } from "../housebook/WallPhotoDialog";
import { wallPhotos } from "../../housebook/wallPhotos";

export function WallProperties({ id }: { id: string }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind: "walls", id });
  const [fixed, setFixed] = useState<"start" | "end">("start");
  const [photosOpen, setPhotosOpen] = useState(false);
  const wall = project.walls[id]!;
  const data = getWallMeasurements(project, id);
  return (
    <>
      <button className="full-width" onClick={() => setPhotosOpen(true)}>
        Wandfotos und Verläufe ({wallPhotos(project, id).length})
      </button>
      {photosOpen && <WallPhotoDialog wallId={id} onClose={() => setPhotosOpen(false)} />}
      {lengthField("Länge", data.length, (draft, value) => resizeWall(draft, id, value, fixed))}
      <label className="field">
        Fester Endpunkt
        <select
          aria-label="Fester Endpunkt"
          value={fixed}
          onChange={(event) => setFixed(event.target.value as "start" | "end")}
        >
          <option value="start">Anfangspunkt</option>
          <option value="end">Endpunkt</option>
        </select>
      </label>
      <div className="field-row">
        {lengthField("Wandstärke", wall.thickness, (draft, value) => {
          draft.walls[id]!.thickness = value;
        })}
        {lengthField("Wandhöhe", wall.height, (draft, value) => {
          draft.walls[id]!.height = value;
        })}
      </div>
      <TextField
        label="Material"
        value={wall.material}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.walls[id]!.material = value;
          })
        }
      />
      <div className="property-section">
        <div className="section-caption">ANFANGSPUNKT</div>
        <div className="field-row">
          {lengthField("Start X", data.startPoint.x, (draft, value) => {
            draft.points[wall.startPointId]!.position.x = value;
          })}
          {lengthField("Start Y", data.startPoint.y, (draft, value) => {
            draft.points[wall.startPointId]!.position.y = value;
          })}
        </div>
        <div className="section-caption">ENDPUNKT</div>
        <div className="field-row">
          {lengthField("Ende X", data.endPoint.x, (draft, value) => {
            draft.points[wall.endPointId]!.position.x = value;
          })}
          {lengthField("Ende Y", data.endPoint.y, (draft, value) => {
            draft.points[wall.endPointId]!.position.y = value;
          })}
        </div>
        <p className="field-hint">
          Runde Endpunktgriffe einzeln ziehen, um Länge und Richtung zu ändern. Der andere Endpunkt bleibt
          stehen; angeschlossene Wände folgen nur am gemeinsamen Punkt. Beim Löschen entfallen auch zugehörige
          Raumdefinitionen und Öffnungen.
        </p>
      </div>
    </>
  );
}
