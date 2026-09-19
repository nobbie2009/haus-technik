import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "./ElectricalFields";

export function MeterFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "meters", id });
  const meter = project.electrical.meters[id]!;
  const supply = meter.supplyId ? project.electrical.supplies[meter.supplyId] : null;
  return (
    <>
      <SelectField
        label="Einspeisepunkt des Zählers"
        value={meter.supplyId ?? ""}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.meters[id]!.supplyId = value || null;
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.supplies).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} · {item.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Zählernummer"
        value={meter.serialNumber}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.meters[id]!.serialNumber = value;
          })
        }
      />
      <NumberField
        label="Zählerstand (kWh)"
        value={meter.readingKWh}
        disabled={locked}
        hint="Manuell abgelesener Energiezählerstand, keine automatische Verbrauchsberechnung."
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.meters[id]!.readingKWh = value;
          })
        }
      />
      <p className="field-hint">
        {supply
          ? `${supply.phaseNeutralVoltage ?? project.electrical.settings.phaseNeutralVoltage} V L–N · ${supply.ratedCurrent ?? "?"} A Anschlusskapazität je Phase`
          : "Noch keine Einspeisung zugeordnet."}
      </p>
      <p className="field-hint">
        Zugeordnete Sicherungskästen:{" "}
        {Object.values(project.electrical.distributionBoards)
          .filter((board) => board.meterId === id)
          .map((board) => board.label || board.name)
          .join(", ") || "Keine"}
      </p>
    </>
  );
}
