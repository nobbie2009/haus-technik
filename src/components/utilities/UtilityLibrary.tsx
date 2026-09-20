import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  media,
  nodeKinds,
  utilities,
  addUtilityPipe,
  type Medium,
  type UtilityKind,
} from "../../utilities/model";
import { SelectField } from "../electrical/ElectricalFields";
export function UtilityLibrary() {
  const editor = useEditorStore(),
    project = useProjectStore((s) => s.project);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const nodes = Object.values(utilities(project).nodes).filter((n) => n.media.includes(editor.utilityMedium));
  return (
    <section aria-label="Rohrnetz-Werkzeuge">
      <SelectField
        label="Leitungsmedium"
        value={editor.utilityMedium}
        onChange={(value) => {
          editor.cancel();
          useEditorStore.setState({ utilityMedium: value as Medium });
        }}
      >
        {Object.entries(media).map(([key, m]) => (
          <option key={key} value={key}>
            {m.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Komponentenart"
        value={editor.utilityKind}
        onChange={(value) => useEditorStore.setState({ utilityKind: value as UtilityKind })}
      >
        {Object.entries(nodeKinds).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="utility-actions">
        <button aria-pressed={editor.tool === "utilityNode"} onClick={() => editor.setTool("utilityNode")}>
          Komponente platzieren
        </button>
        <button aria-pressed={editor.tool === "utilityPipe"} onClick={() => editor.setTool("utilityPipe")}>
          Rohrleitung zeichnen
        </button>
      </div>
      <p className="field-hint">
        Startanschluss, Wegpunkte und Zielanschluss antippen. Die Kürzel KW, WW, VL, RL und GAS kennzeichnen
        das Medium.
      </p>
      <details>
        <summary>Anschlüsse verbinden / Etagenleitung</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            let id = "";
            if (
              useProjectStore.getState().commit("Rohranschlüsse verbinden", (p) => {
                id = addUtilityPipe(p, from, to, editor.utilityMedium);
              })
            ) {
              editor.setTool("select");
              useEditorStore.setState({ selection: [{ kind: "utilityPipes", id }] });
            }
          }}
        >
          <SelectField label="Rohr von" value={from} onChange={setFrom}>
            <option value="">Anschluss wählen</option>
            {nodes.map((n) => (
              <option value={n.id} key={n.id}>
                {n.name} · {project.floors[n.floorId]?.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Rohr nach" value={to} onChange={setTo}>
            <option value="">Anschluss wählen</option>
            {nodes
              .filter((n) => n.id !== from)
              .map((n) => (
                <option value={n.id} key={n.id}>
                  {n.name} · {project.floors[n.floorId]?.name}
                </option>
              ))}
          </SelectField>
          <button
            disabled={!nodes.some((n) => n.id === from) || !nodes.some((n) => n.id === to) || from === to}
          >
            Rohrverbindung erstellen
          </button>
        </form>
      </details>
      <p className="field-hint">
        Bestands- und Planungsdaten. Druck, Temperatur und Heizleistung sind Eingaben; eine hydraulische oder
        gastechnische Berechnung erfolgt hier nicht.
      </p>
    </section>
  );
}
