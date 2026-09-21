import { usePropertyFields } from "./usePropertyFields";

export function OpeningProperties({ id, kind }: { id: string; kind: "doors" | "windows" }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind, id });
  const opening = project[kind][id]!;
  return (
    <>
      {lengthField("Position ab Wandstart", opening.position, (draft, value) => {
        draft[kind][id]!.position = value;
      })}
      <div className="field-row">
        {lengthField("Breite", opening.width, (draft, value) => {
          draft[kind][id]!.width = value;
        })}
        {lengthField("Höhe", opening.height, (draft, value) => {
          draft[kind][id]!.height = value;
        })}
      </div>
      {"sillHeight" in opening ? (
        lengthField("Brüstungshöhe", opening.sillHeight, (draft, value) => {
          draft.windows[id]!.sillHeight = value;
        })
      ) : (
        <>
          <label className="field">
            Türart
            <select
              aria-label="Türart"
              disabled={locked}
              value={opening.type}
              onChange={(event) =>
                change((draft) => {
                  draft.doors[id]!.type = event.target.value as "hinged" | "opening" | "sliding";
                })
              }
            >
              <option value="hinged">Drehtür</option>
              <option value="opening">Durchgang ohne Türblatt</option>
              <option value="sliding">Schiebetür</option>
            </select>
          </label>
          {opening.type === "hinged" && (
            <>
              <label className="field">
                Türanschlag
                <select
                  aria-label="Türanschlag"
                  disabled={locked}
                  value={opening.openingDirection.hinge}
                  onChange={(event) =>
                    change((draft) => {
                      draft.doors[id]!.openingDirection.hinge = event.target.value as "startSide" | "endSide";
                    })
                  }
                >
                  <option value="startSide">Wandstartseite</option>
                  <option value="endSide">Wandendseite</option>
                </select>
              </label>
              <label className="field">
                Öffnungsseite
                <select
                  aria-label="Öffnungsseite"
                  disabled={locked}
                  value={opening.openingDirection.swing}
                  onChange={(event) =>
                    change((draft) => {
                      draft.doors[id]!.openingDirection.swing = event.target.value as
                        "leftOfWall" | "rightOfWall";
                    })
                  }
                >
                  <option value="leftOfWall">Links der Wandrichtung</option>
                  <option value="rightOfWall">Rechts der Wandrichtung</option>
                </select>
              </label>
            </>
          )}
          {opening.type === "sliding" && (
            <label className="field">
              Laufseite
              <select
                aria-label="Laufseite"
                disabled={locked}
                value={opening.openingDirection.swing}
                onChange={(event) =>
                  change((draft) => {
                    draft.doors[id]!.openingDirection.swing = event.target.value as
                      "leftOfWall" | "rightOfWall";
                  })
                }
              >
                <option value="leftOfWall">Links der Wandrichtung</option>
                <option value="rightOfWall">Rechts der Wandrichtung</option>
              </select>
            </label>
          )}
        </>
      )}
      <p className="field-hint">
        Position bezeichnet die Mitte der Öffnung. Die Öffnung muss vollständig in die Wand passen.
      </p>
    </>
  );
}
