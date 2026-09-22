import { CableRouteFields } from "./CableRouteFields";
import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "./ElectricalFields";
import { electricalNodes, cableLengths } from "../../electrical/cables";
import { formatLength } from "../../utils/units";
import { useEditorStore } from "../../stores/editorStore";
import { contactsFor } from "../../electrical/contacts";

export function CableProperties({
  id,
  preserveSelection = false,
}: {
  id: string;
  preserveSelection?: boolean;
}) {
  const { project, locked, change, lengthField, unit } = usePropertyFields({ kind: "cables", id });
  const cable = project.electrical.cables[id]!;
  const nodes = Object.values(electricalNodes(project));
  const lengths = cableLengths(project, cable);
  return (
    <>
      <div className="circuit-summary">
        <strong>Kontaktbelegung</strong>
        {cable.conductorConnections.length ? (
          <ul>
            {cable.conductorConnections.map((row, i) => (
              <li key={i}>
                {contactsFor(project, cable.startNodeId).find((c) => c.id === row.startContactId)?.label} →{" "}
                {contactsFor(project, cable.endNodeId).find((c) => c.id === row.endContactId)?.label}
              </li>
            ))}
          </ul>
        ) : (
          <p>Noch keine Kontakte belegt.</p>
        )}
        <p>
          {cable.connectionAssignment === "none" ? "Nur Dokumentation" : "Mit Verbraucherzuordnung verbunden"}
        </p>
        <button
          disabled={locked}
          onClick={() =>
            useEditorStore.setState({
              connectionRequest: {
                cableId: id,
                startNodeId: cable.startNodeId,
                endNodeId: cable.endNodeId,
                preserveSelection,
              },
            })
          }
        >
          Anschlussbelegung bearbeiten
        </button>
        {cable.connectionAssignment !== "none" && (
          <p className="field-hint">
            Löschen dieser Leitung löst auch ihre Verbraucherzuordnung. Zum separaten Bearbeiten zuerst die
            Zuordnung im Anschlussdialog lösen.
          </p>
        )}
      </div>
      <TextField
        label="Leitungsname"
        value={cable.name}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.name = value;
          })
        }
      />
      <TextField
        label="Leitungskennzeichnung"
        value={cable.label}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.label = value;
          })
        }
      />
      <TextField
        label="Kabeltyp"
        value={cable.type}
        disabled={locked}
        hint="Typenschild / Aufdruck, z. B. NYM-J 3×1,5"
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.type = value;
          })
        }
      />
      {(
        [
          ["startNodeId", "Leitungsanfang"],
          ["endNodeId", "Leitungsende"],
        ] as const
      ).map(([key, label]) => (
        <SelectField
          key={key}
          label={label}
          value={cable[key]}
          disabled={locked || !!cable.conductorConnections.length}
          onChange={(value) =>
            change((draft) => {
              draft.electrical.cables[id]![key] = value;
              const line = draft.electrical.cables[id]!,
                all = electricalNodes(draft);
              const a = all[line.startNodeId]!,
                b = all[line.endNodeId]!;
              line.floorId = a.floorId;
              line.riser = a.floorId === b.floorId ? null : (line.riser ?? { ...a.position });
              if (!line.riser) line.endPath = [];
            })
          }
        >
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.label} · {node.name} · {project.floors[node.floorId]!.name}
            </option>
          ))}
        </SelectField>
      ))}
      <SelectField
        label="Leitungsstromkreis"
        value={cable.circuitId ?? ""}
        disabled={locked || cable.connectionAssignment !== "none"}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.circuitId = value || null;
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.circuits).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} · {item.name}
          </option>
        ))}
      </SelectField>
      {(
        [
          ["conductorCount", "Aderanzahl"],
          ["conductorCrossSection", "Leiterquerschnitt (mm²)"],
          ["ratedVoltage", "Bemessungsspannung (V)"],
        ] as const
      ).map(([key, label]) => (
        <NumberField
          key={key}
          label={label}
          value={cable[key]}
          disabled={locked}
          onCommit={(value) =>
            change((draft) => {
              draft.electrical.cables[id]![key] = value;
            })
          }
        />
      ))}
      <TextField
        label="Leitermaterial"
        value={cable.material}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.material = value;
          })
        }
      />
      <TextField
        label="Verlegeart"
        value={cable.installationMethod}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.cables[id]!.installationMethod = value;
          })
        }
      />
      <div className="circuit-summary">
        <p>
          Planlänge: <strong>{formatLength(lengths.planLength, unit)}</strong>
        </p>
        {!!cable.riser && (
          <p>
            Steigstrecke: <strong>{formatLength(lengths.verticalLength, unit)}</strong>
          </p>
        )}
        <p>
          Mit Zuschlag: <strong>{formatLength(lengths.totalLength, unit)}</strong>
        </p>
      </div>
      {lengthField("Längenzuschlag", cable.lengthAllowance, (draft, value) => {
        draft.electrical.cables[id]!.lengthAllowance = value;
      })}
      <p className="field-hint">
        Horizontale Planwege plus Geschosshöhe am Steigpunkt. Zusätzliche Montagehöhen und Reserve als
        Zuschlag erfassen. Stromkreiszuordnungen der Endobjekte werden nur durch eine ausdrücklich bestätigte
        Anschlusszuordnung verändert.
      </p>
      <CableRouteFields id={id} />
      <p className="field-hint">
        Ziehen verschiebt Zwischenpunkte. Bei einer geraden Leitung entsteht ein Zwischenpunkt; Endobjekte
        bleiben verbunden.
      </p>
    </>
  );
}
