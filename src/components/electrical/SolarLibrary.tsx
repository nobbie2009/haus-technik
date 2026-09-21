import { lazy, Suspense, useEffect, useState } from "react";
import { solarPlants } from "../../housebook/solar";
import { solarKinds, type SolarKind } from "../../electrical/solarPlan";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
const HousebookDialog = lazy(() =>
  import("../housebook/HousebookDialog").then((m) => ({ default: m.HousebookDialog })),
);

export function SolarLibrary() {
  const project = useProjectStore((s) => s.project);
  const placement = useEditorStore((s) => s.solarPlacement);
  const [plantId, setPlantId] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (placement?.plantId) setPlantId(placement.plantId);
  }, [placement?.plantId]);
  return (
    <>
      <label className="field">
        Solaranlage
        <select
          aria-label="Solaranlage im Plan"
          value={placement?.plantId ?? plantId}
          onChange={(e) => {
            setPlantId(e.target.value);
            if (placement)
              useEditorStore.setState({ solarPlacement: { ...placement, plantId: e.target.value || null } });
          }}
        >
          <option value="">Neue Anlage beim Platzieren</option>
          {solarPlants(project).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Solarobjekt
        <select
          aria-label="Solarobjekt platzieren"
          value={placement?.kind ?? ""}
          onChange={(e) => {
            useEditorStore.getState().setTool("electrical");
            useEditorStore.setState({
              electricalKind: "devices",
              solarPlacement: {
                kind: e.target.value as SolarKind,
                plantId: placement?.plantId ?? (plantId || null),
              },
            });
          }}
        >
          <option value="" disabled>
            Komponente wählen
          </option>
          {Object.entries(solarKinds).map(([key, value]) => (
            <option key={key} value={key}>
              {value.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => setOpen(true)}>Solarakte öffnen</button>
      {open && (
        <Suspense fallback={<p role="status">Hausakte wird geladen …</p>}>
          <HousebookDialog
            initialSolarId={placement?.plantId ?? (plantId || "")}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
