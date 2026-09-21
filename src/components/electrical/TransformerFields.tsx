import { transformerOutputLabel, transformerOutputs } from "../../electrical/transformers";
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
        label="Trafo im Sicherungskasten"
        value={item.distributionBoardId ?? ""}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.transformers[id]!.distributionBoardId = value || null;
          })
        }
      >
        <option value="">Separat im Plan</option>
        {Object.values(project.electrical.distributionBoards)
          .filter(
            (b) =>
              !item.circuitId || project.electrical.circuits[item.circuitId]?.distributionBoardId === b.id,
          )
          .map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} · {b.name}
            </option>
          ))}
      </SelectField>
      <p>Ausgänge: {transformerOutputLabel(item)}</p>
      {!item.secondaryVoltages && (
        <button
          disabled={locked}
          onClick={() =>
            change((draft) => {
              const t = draft.electrical.transformers[id]!;
              t.secondaryVoltages = [6, 9, 12, 24];
              t.secondaryVoltage = 6;
            })
          }
        >
          Ausgänge 6 / 9 / 12 / 24 V verwenden
        </button>
      )}
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
        {Object.values(project.electrical.circuits)
          .filter((c) => !item.distributionBoardId || c.distributionBoardId === item.distributionBoardId)
          .map((c) => (
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
      )
        .filter(([key]) => key !== "secondaryVoltage" || !item.secondaryVoltages)
        .map(([key, label]) => (
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
      <p className="field-hint">
        Nennstrom bei alleiniger Nutzung eines Ausgangs:{" "}
        {transformerOutputs(item)
          .map((v) => `${v} V: ${(item.ratedVA / v).toLocaleString("de-DE", { maximumFractionDigits: 3 })} A`)
          .join(" · ")}
      </p>
      <p className="field-hint">
        Am Verbraucher „Transformator“ und „Trafoausgang“ wählen. Die Nennscheinleistung gilt gemeinsam für
        alle Ausgänge. Berechnung als idealer Wechselspannungstrafo ohne Verluste, Spannungsregelung oder
        automatische Abschaltung bei Überlast. Vorlagenwerte für Primärspannung und VA am Typenschild
        abgleichen.
      </p>
      {result && (
        <p role="status">
          Sekundärlast:{" "}
          {item.secondaryVoltages
            ? result.utilization === null
              ? "unvollständig"
              : `${result.utilization.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % der gemeinsamen VA-Leistung`
            : result.maxCurrent === null
              ? "unvollständig"
              : `${result.maxCurrent.toLocaleString("de-DE", { maximumFractionDigits: 3 })} A`}{" "}
          · {result.overload ? "ÜBERLAST" : "keine bekannte Überlast"}
        </p>
      )}
    </>
  );
}
