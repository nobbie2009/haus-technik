import { usePropertyFields } from "../properties/usePropertyFields";
import { NumberField, SelectField } from "./ElectricalFields";
import { circuitOptionLabel } from "../../electrical/supply";
import { useSimulationStore } from "../../stores/simulationStore";

export function TransformerFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "transformers", id });
  const item = project.electrical.transformers[id]!;
  const result = useSimulationStore((s) => s.result?.nodes[id]);
  return (
    <>
      <SelectField
        label="Trafo-Primärstromkreis"
        value={item.circuitId ?? ""}
        disabled={locked || Object.values(project.electrical.devices).some((d) => d.transformerId === id)}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.transformers[id]!.circuitId = value || null;
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.circuits).map((c) => (
          <option key={c.id} value={c.id}>
            {circuitOptionLabel(project, c.id)}
          </option>
        ))}
      </SelectField>
      {(
        [
          ["primaryVoltage", "Primär-Nennspannung (V)"],
          ["secondaryVoltage", "Sekundär-Nennspannung (V)"],
          ["ratedVA", "Nennscheinleistung (VA)"],
        ] as const
      ).map(([key, label]) => (
        <NumberField
          key={key}
          label={label}
          value={item[key]}
          disabled={locked}
          onCommit={(value) =>
            change((draft) => {
              if (value === null || value <= 0) throw new Error("Positiven Typenschildwert eingeben.");
              draft.electrical.transformers[id]![key] = value;
            })
          }
        />
      ))}
      <p>
        Sekundär-Nennstrom:{" "}
        {(item.ratedVA / item.secondaryVoltage).toLocaleString("de-DE", { maximumFractionDigits: 3 })} A
      </p>
      <p className="field-hint">
        Am Verbraucher unter „Transformator“ zuordnen. Beispiel Klingel: 230 V → 8 V. Berechnung als idealer
        Wechselspannungstrafo ohne Verluste, Spannungsregelung oder automatische Abschaltung bei Überlast.
      </p>
      {result && (
        <p role="status">
          Sekundärlast:{" "}
          {result.maxCurrent === null
            ? "unvollständig"
            : `${result.maxCurrent.toLocaleString("de-DE", { maximumFractionDigits: 3 })} A`}{" "}
          · {result.overload ? "ÜBERLAST" : "keine bekannte Überlast"}
        </p>
      )}
    </>
  );
}
