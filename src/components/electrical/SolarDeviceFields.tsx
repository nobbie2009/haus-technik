import { lazy, Suspense, useState } from "react";
import { usePropertyFields } from "../properties/usePropertyFields";
import { consumerShape } from "../../electrical/consumerLibrary";
import { solarPlanRecord, solarKinds } from "../../electrical/solarPlan";
import { solarPlants, setSolarPlants } from "../../housebook/solar";
import { NumberField } from "./ElectricalFields";
const HousebookDialog = lazy(() =>
  import("../housebook/HousebookDialog").then((m) => ({ default: m.HousebookDialog })),
);

export function SolarDeviceFields({ id }: { id: string }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind: "devices", id });
  const [open, setOpen] = useState(false);
  const device = project.electrical.devices[id]!;
  const record = solarPlanRecord(project, device)!;
  const shape = consumerShape(device)!;
  const { placement, plant, group } = record;
  return (
    <section className="property-section">
      <h3>{solarKinds[placement.kind].name}</h3>
      <p>{plant ? `Solaranlage: ${plant.name}` : "Die zugehörige Solarakte wurde gelöscht."}</p>
      {plant &&
        ((placement.kind === "module" && (!group || placement.index >= group.quantity)) ||
          (placement.kind === "battery" && !plant.battery)) && (
          <p role="status">
            Diese Komponente ist in der Solarakte nicht mehr erfasst. Den Planeintrag bei Bedarf löschen.
          </p>
        )}
      {record.asset && (
        <p>
          {[record.asset.manufacturer, record.asset.model, record.asset.serial].filter(Boolean).join(" · ")}
        </p>
      )}
      {plant && <button onClick={() => setOpen(true)}>Zugehörige Solarakte öffnen</button>}
      {open && (
        <Suspense fallback={<p role="status">Hausakte wird geladen …</p>}>
          <HousebookDialog initialSolarId={placement.plantId} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {placement.kind !== "plant" && (
        <NumberField
          label={
            placement.kind === "module"
              ? "Modulleistung (Wp)"
              : placement.kind === "inverter"
                ? "AC-Nennleistung (W)"
                : "Speicherkapazität (Wh)"
          }
          value={
            placement.kind === "module"
              ? (group?.wp ?? null)
              : placement.kind === "inverter"
                ? (plant?.inverter.powerW ?? null)
                : (plant?.battery?.capacityWh ?? null)
          }
          disabled={
            locked ||
            !plant ||
            (placement.kind === "module" && !group) ||
            (placement.kind === "battery" && !plant.battery)
          }
          onCommit={(value) =>
            change((draft) => {
              const rows = solarPlants(draft),
                p = rows.find((p) => p.id === placement.plantId)!;
              if (placement.kind === "module") p.modules.find((m) => m.id === placement.moduleId)!.wp = value;
              if (placement.kind === "inverter") p.inverter.powerW = value;
              if (placement.kind === "battery") p.battery!.capacityWh = value;
              setSolarPlants(draft, rows);
            })
          }
        />
      )}
      {(["width", "depth", "height"] as const).map((key, index) =>
        lengthField(["Breite", "Tiefe", "Höhe"][index]!, shape[key], (draft, value) => {
          draft.electrical.devices[id]!.metadata.consumerShape = {
            ...consumerShape(draft.electrical.devices[id]!)!,
            [key]: value,
          };
        }),
      )}
      <NumberField
        label="Drehung (°)"
        value={(shape.rotation * 180) / Math.PI}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            if (value === null) throw new Error("Drehwinkel fehlt.");
            draft.electrical.devices[id]!.metadata.consumerShape = {
              ...consumerShape(draft.electrical.devices[id]!)!,
              rotation: (value * Math.PI) / 180,
            };
          })
        }
      />
      <p className="field-hint">
        Maßstäbliche Dokumentation. Erzeugung und Lade-/Entladevorgänge werden nicht simuliert. Den
        Netzanschluss in der Solarakte zuordnen.
      </p>
    </section>
  );
}
