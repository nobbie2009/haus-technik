import { usePropertyFields } from "../properties/usePropertyFields";
import { transformerOutputs, transformerOutputLabel } from "../../electrical/transformers";
import { SelectField } from "./ElectricalFields";

export function DeviceControlFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "devices", id });
  const item = project.electrical.devices[id]!;
  return (
    <>
      <SelectField
        label="Schaltgruppe / Relais"
        value={item.controlId ?? ""}
        disabled={
          locked || !!item.switchId || !item.circuitId || item.phases !== 1 || !!item.connectionPointId
        }
        onChange={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.controlId = value || null;
          })
        }
      >
        <option value="">Keine Schaltgruppe</option>
        {Object.values(project.electrical.controls)
          .filter((c) => c.circuitId === item.circuitId && !!c.circuitId)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · {c.name} · {c.mode === "changeover" ? "Wechsel/Kreuz" : "Stromstoßrelais"}
            </option>
          ))}
      </SelectField>
      <SelectField
        label="Transformator"
        value={item.transformerId ?? ""}
        disabled={locked || !item.circuitId || item.phases !== 1 || !!item.connectionPointId}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.transformerId = value || null;
            draft.electrical.devices[id]!.transformerVoltage = null;
          })
        }
      >
        <option value="">Direkt am Stromkreis</option>
        {Object.values(project.electrical.transformers)
          .filter((t) => t.circuitId === item.circuitId && !!t.circuitId)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} · {t.name} · {transformerOutputLabel(t)}
            </option>
          ))}
      </SelectField>
      {item.transformerId && project.electrical.transformers[item.transformerId] && (
        <SelectField
          label="Trafoausgang"
          value={String(
            item.transformerVoltage ?? project.electrical.transformers[item.transformerId]!.secondaryVoltage,
          )}
          disabled={locked}
          onChange={(value) =>
            change((draft) => {
              draft.electrical.devices[id]!.transformerVoltage = Number(value);
            })
          }
        >
          {transformerOutputs(project.electrical.transformers[item.transformerId]!).map((voltage) => (
            <option key={voltage} value={voltage}>
              {voltage} V
            </option>
          ))}
        </SelectField>
      )}
    </>
  );
}
