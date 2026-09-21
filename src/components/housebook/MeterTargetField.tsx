import { useProjectStore } from "../../stores/projectStore";
import { homeBook, type Meter } from "../../housebook/home";
import { planMeters, sameMeterTarget, compatibleMeterKind } from "../../housebook/planMeters";
import { focusObject } from "../../housebook/navigation";
import { Field } from "./shared";
export function MeterTargetField({
  meter,
  onChange,
  onClose,
}: {
  meter: Meter;
  onChange: (target: Meter["target"]) => void;
  onClose: () => void;
}) {
  const p = useProjectStore((s) => s.project),
    book = homeBook(p);
  const plans = planMeters(p),
    current = plans.find((t) => sameMeterTarget(t.target, meter.target));
  const options = plans.filter((t) => compatibleMeterKind(t.kind, meter.kind));
  const assigned =
    current && book.meters.filter((m) => m.id !== meter.id && sameMeterTarget(m.target, current.target));
  const key = meter.target ? `${meter.target.kind}:${meter.target.id}` : "";
  return (
    <>
      <Field label="Verknüpfter Planzähler">
        <select
          value={key}
          onChange={(e) =>
            onChange(
              options.find((t) => `${t.target.kind}:${t.target.id}` === e.target.value)?.target ?? null,
            )
          }
        >
          <option value="">Ohne Planzähler</option>
          {key && !options.some((t) => sameMeterTarget(t.target, meter.target)) && (
            <option value={key}>Bisherige Verknüpfung: kein passender Planzähler</option>
          )}
          {options.map((t) => (
            <option key={t.item.id} value={`${t.target.kind}:${t.target.id}`}>
              {t.label} · {t.item.name} · {p.floors[t.item.floorId]?.name}
            </option>
          ))}
        </select>
      </Field>
      <p className="field-hint">
        Die Verknüpfung lässt sich ändern oder entfernen. Jeder Planzähler bleibt automatisch in der Hausakte
        erfasst.
      </p>
      {assigned && assigned.length > 0 && (
        <p className="field-hint" role="status">
          Beim Speichern wird dieser Planzähler dem bearbeiteten Zähler zugeordnet. Unveränderte automatische
          Einträge werden ersetzt; andere Einträge bleiben mit ihren Daten und Ablesungen ohne Planverknüpfung
          erhalten.
        </p>
      )}
      {current && (
        <button
          type="button"
          onClick={() => {
            if (focusObject(current.target)) onClose();
            else useProjectStore.setState({ error: "Bitte die Ebene des Planzählers einblenden." });
          }}
        >
          Im Plan zeigen
        </button>
      )}
    </>
  );
}
