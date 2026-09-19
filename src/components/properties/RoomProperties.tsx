import { getRoomMeasurements } from "../../core/selectors";
import { resizeRoom } from "../../editor/actions/edit";
import { formatArea, formatLength } from "../../utils/units";
import type { RoomType } from "../../models/room";
import { TextField } from "../Fields";
import { usePropertyFields } from "./usePropertyFields";

const roomTypes: Record<RoomType, string> = {
  livingRoom: "Wohnzimmer",
  kitchen: "Küche",
  bedroom: "Schlafzimmer",
  bathroom: "Bad",
  hallway: "Flur",
  basement: "Keller",
  technicalRoom: "Technikraum",
  garage: "Garage",
  other: "Sonstiger Raum",
};
export function RoomProperties({ id }: { id: string }) {
  const { project, locked, unit, change, lengthField } = usePropertyFields({ kind: "rooms", id });
  const room = project.rooms[id]!;
  const data = getRoomMeasurements(project, id);
  return (
    <>
      <TextField
        label="Raumname"
        value={room.name}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.rooms[id]!.name = value;
          })
        }
      />
      <label className="field">
        Raumtyp
        <select
          aria-label="Raumtyp"
          value={room.type}
          disabled={locked}
          onChange={(event) =>
            change((draft) => {
              draft.rooms[id]!.type = event.target.value as RoomType;
            })
          }
        >
          {Object.entries(roomTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="area-card">
        <span>Wandachsfläche</span>
        <strong>{formatArea(data.area)}</strong>
        <small>Umfang {formatLength(data.perimeter, unit)}</small>
      </div>
      {data.rectangleDimensions && (
        <div className="field-row">
          {lengthField("Länge", data.rectangleDimensions.length, (draft, value) =>
            resizeRoom(draft, id, value, data.rectangleDimensions!.width),
          )}
          {lengthField("Breite", data.rectangleDimensions.width, (draft, value) =>
            resizeRoom(draft, id, data.rectangleDimensions!.length, value),
          )}
        </div>
      )}
      {lengthField("Raumhöhe", room.height, (draft, value) => {
        draft.rooms[id]!.height = value;
      })}
      <p className="field-hint">
        {data.rectangleDimensions
          ? "Maßänderungen erhalten die rechteckige Form. Gemeinsame Wände ziehen Nachbarräume mit."
          : "Freie Raumform: Kantenmaße über die jeweilige Wand bearbeiten."}
      </p>
    </>
  );
}
