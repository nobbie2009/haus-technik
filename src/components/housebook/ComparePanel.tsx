import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { renovationView } from "../../housebook/compare";
import { planSvg, planBounds, planPrimitives } from "../../housebook/export";
import { Field } from "./shared";
export function ComparePanel() {
  const p = useProjectStore((s) => s.project);
  const [floor, setFloor] = useState(useEditorStore.getState().floorId);
  const bounds = planBounds(planPrimitives(p, floor));
  return (
    <section>
      <h3>Bestand und Umbau vergleichen</h3>
      <p>
        Den Umbauzustand in der Objektakte festlegen. Bestand blendet geplante Objekte aus; Zielzustand
        blendet Rückbau aus. Fertiggestellte Objekte erscheinen in beiden Ansichten. Die Projektdaten bleiben
        unverändert.
      </p>
      <Field label="Vergleichsgeschoss">
        <select value={floor} onChange={(e) => setFloor(e.target.value)}>
          {p.floorOrder.map((id) => (
            <option key={id} value={id}>
              {p.floors[id]!.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="book-grid">
        {(["existing", "future"] as const).map((mode) => (
          <figure key={mode} style={{ margin: 0, minWidth: 0 }}>
            <figcaption>
              {mode === "existing"
                ? "Bestand (einschließlich Rückbau)"
                : "Zielzustand (einschließlich Planung)"}
            </figcaption>
            <img
              style={{ width: "100%", height: 360, objectFit: "contain", border: "1px solid #9badb0" }}
              alt={mode === "existing" ? "Bestandsplan" : "Umbauplan"}
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(planSvg(renovationView(p, mode), floor, 50, "all", bounds))}`}
            />
          </figure>
        ))}
      </div>
      <p>
        Blau: geplant · Rot: Rückbau · Grün: fertiggestellt. Nicht im Plan erfasste Bauteile können nicht
        verglichen werden.
      </p>
    </section>
  );
}
