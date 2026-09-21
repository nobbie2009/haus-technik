import { TextField } from "../Fields";
import { isStair, stairDirection, stairTarget } from "../../furniture/stairs";
import { usePropertyFields } from "./usePropertyFields";

export function FurnitureProperties({ id }: { id: string }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind: "furniture", id });
  const item = project.furniture[id]!;
  const rotate = (degrees: number) =>
    change((draft) => {
      if (!Number.isFinite(degrees)) throw new Error("Bitte einen gültigen Winkel eingeben.");
      draft.furniture[id]!.rotation = ((((degrees % 360) + 360) % 360) * Math.PI) / 180;
    });
  return (
    <>
      {!locked && (
        <p className="field-hint">
          Im Auswahlmodus die Eck- oder Seitengriffe ziehen, um Breite und Tiefe zu ändern. Ziehen in der
          Mitte verschiebt das Möbel.
        </p>
      )}
      <TextField
        label="Objektname"
        value={item.name}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.furniture[id]!.name = value;
          })
        }
      />
      {isStair(item) && (
        <>
          <label>
            Treppenrichtung
            <select
              aria-label="Treppenrichtung"
              disabled={locked}
              value={stairDirection(item)}
              onChange={(event) =>
                change((draft) => {
                  draft.furniture[id]!.metadata.stairDirection = event.target.value;
                })
              }
            >
              <option value="up">Nach oben</option>
              <option value="down">Nach unten</option>
              <option value="none">Nur auf dieser Etage</option>
            </select>
          </label>
          <p className="field-hint">
            {stairDirection(item) === "none"
              ? "Keine Darstellung auf einer weiteren Etage."
              : stairTarget(project, item)
                ? `Auch sichtbar in: ${stairTarget(project, item)!.name}. Bearbeitung auf dieser Ursprungsetage.`
                : "In dieser Richtung fehlt eine Etage. Sobald sie angelegt ist, wird die Treppe dort ebenfalls angezeigt."}
          </p>
        </>
      )}
      <TextField
        label="Objekttyp"
        value={item.type}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.furniture[id]!.type = value;
          })
        }
      />
      {lengthField("Breite", item.width, (draft, value) => {
        draft.furniture[id]!.width = value;
      })}
      {lengthField("Tiefe", item.depth, (draft, value) => {
        draft.furniture[id]!.depth = value;
      })}
      {lengthField("Höhe", item.height, (draft, value) => {
        draft.furniture[id]!.height = value;
      })}
      <TextField
        label="Drehung (°)"
        value={String(Math.round(((item.rotation * 180) / Math.PI) * 1000) / 1000)}
        disabled={locked}
        onCommit={(value) => rotate(value.trim() ? Number(value.replace(",", ".")) : NaN)}
      />
      <div className="rotation-actions">
        <button disabled={locked} onClick={() => rotate((item.rotation * 180) / Math.PI - 90)}>
          −90° drehen
        </button>
        <button disabled={locked} onClick={() => rotate((item.rotation * 180) / Math.PI + 90)}>
          +90° drehen
        </button>
      </div>
      {lengthField("Mittelpunkt X", item.position.x, (draft, value) => {
        draft.furniture[id]!.position.x = value;
      })}
      {lengthField("Mittelpunkt Y", item.position.y, (draft, value) => {
        draft.furniture[id]!.position.y = value;
      })}
      <p className="field-hint">
        Raum: {item.roomId ? project.rooms[item.roomId]!.name : "Keine eindeutige Zuordnung"}. Automatisch
        anhand des Mittelpunkts.
      </p>
    </>
  );
}
