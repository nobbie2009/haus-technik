import { lazy, Suspense, useState } from "react";
import type { Selection } from "../../editor/types";
import { useProjectStore } from "../../stores/projectStore";
import { homeBook, meterKinds } from "../../housebook/home";
import { planMeters, planMeterSerial, sameMeterTarget } from "../../housebook/planMeters";
const HousebookDialog = lazy(() => import("./HousebookDialog").then((m) => ({ default: m.HousebookDialog })));
export function PlanMeterRecord({ target }: { target: Selection }) {
  const p = useProjectStore((s) => s.project),
    [open, setOpen] = useState(false);
  const plan = planMeters(p).find((m) => sameMeterTarget(m.target, target));
  if (!plan) return null;
  const record = homeBook(p).meters.find((m) => sameMeterTarget(m.target, target));
  const last = record?.readings.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const legacy = "readingKWh" in plan.item ? plan.item.readingKWh : null;
  return (
    <section className="property-section" aria-label="Verknüpfte Zählerakte">
      <strong>{record ? `${meterKinds[record.kind]} · ${record.name}` : plan.label}</strong>
      <p>
        {last
          ? `Letzte Ablesung: ${last.value.toLocaleString("de-DE")} ${record!.unit} · ${last.date}`
          : legacy !== null
            ? `Bisheriger Planstand: ${legacy.toLocaleString("de-DE")} kWh (ohne Ablesedatum)`
            : "Noch keine Ablesung erfasst."}
      </p>
      {record && record.serial !== planMeterSerial(plan) && (
        <p className="field-hint">
          Abweichende Zählernummern: Plan „{planMeterSerial(plan) || "leer"}“, Hausakte „
          {record.serial || "leer"}“. Die gewünschte Nummer in der Hausakte speichern, um beide Angaben
          abzugleichen.
        </p>
      )}
      <button className="full-width" disabled={!record} onClick={() => setOpen(true)}>
        Zählerstände / Hausakte öffnen
      </button>
      {open && record && (
        <Suspense fallback={<p>Hausakte wird geladen …</p>}>
          <HousebookDialog initialMeterId={record.id} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
