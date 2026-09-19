import { usePropertyFields } from "../properties/usePropertyFields";
import { NumberField, SelectField } from "./ElectricalFields";

export function SupplyFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "supplies", id });
  const supply = project.electrical.supplies[id]!;
  return (
    <>
      <SelectField
        label="Netzphasen"
        value={String(supply.phases)}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.supplies[id]!.phases = Number(value) as 1 | 3;
          })
        }
      >
        <option value="1">Einphasig</option>
        <option value="3">Dreiphasig</option>
      </SelectField>
      {(
        [
          ["phaseNeutralVoltage", "Einspeisespannung L–N (V)"],
          ["phasePhaseVoltage", "Einspeisespannung L–L (V)"],
        ] as const
      )
        .filter(([key]) => key !== "phasePhaseVoltage" || supply.phases === 3)
        .map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            value={supply[key] ?? project.electrical.settings[key]}
            disabled={locked}
            hint={
              supply[key] === null
                ? "Automatisch aus dem Projektstandard. Leer = Standard übernehmen."
                : "Eigene Einspeisespannung. Leer = Projektstandard."
            }
            onCommit={(value) =>
              change((draft) => {
                draft.electrical.supplies[id]![key] = value;
              })
            }
          />
        ))}
      <NumberField
        label="Anschlusskapazität je Phase (A)"
        value={supply.ratedCurrent}
        disabled={locked}
        hint="Dokumentierter Anschlusswert, z. B. aus der Vorsicherung. Kein konstanter Strom und keine Kurzschlussstromangabe."
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.supplies[id]!.ratedCurrent = value;
          })
        }
      />
      <p className="field-hint">
        Zugeordnete Sicherungskästen:{" "}
        {Object.values(project.electrical.distributionBoards)
          .filter((board) => board.supplyId === id)
          .map((board) => board.label || board.name)
          .join(", ") || "Keine"}
      </p>
      <p className="field-hint">
        Zugeordnete Stromzähler:{" "}
        {Object.values(project.electrical.meters)
          .filter((meter) => meter.supplyId === id)
          .map((meter) => meter.label || meter.name)
          .join(", ") || "Keine"}
      </p>
    </>
  );
}
