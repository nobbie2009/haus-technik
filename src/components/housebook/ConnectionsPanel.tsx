import { useState } from "react";
import { connections, connectionObjects } from "../../housebook/connections";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { focusObject } from "../../housebook/navigation";
import { media, utilities, type Medium } from "../../utilities/model";
import { Field } from "./shared";
export function ConnectionsPanel({ onClose }: { onClose: () => void }) {
  const p = useProjectStore((s) => s.project);
  const [id, setId] = useState(useEditorStore.getState().selection[0]?.id ?? "");
  const [mode, setMode] = useState<"trace" | "shutdown">("trace");
  const [medium, setMedium] = useState<Medium>(utilities(p).nodes[id]?.media[0] ?? "cold");
  const [message, setMessage] = useState("");
  const rows = connectionObjects(p),
    result = connections(p, id, mode, medium);
  const found = rows.filter((r) => result.ids.includes(r.id));
  return (
    <section>
      <h3>Verbindungen & Abschaltübersicht</h3>
      <div className="book-grid">
        <Field label="Ausgangspunkt">
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setMedium(utilities(p).nodes[e.target.value]?.media[0] ?? "cold");
              setMessage("");
            }}
          >
            <option value="">Objekt oder Sicherung wählen</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.floor}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Analyse">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="trace">Verbindungen verfolgen</option>
            <option value="shutdown">Absperren / Abschalten</option>
          </select>
        </Field>
        {utilities(p).nodes[id] && (
          <Field label="Rohrmedium">
            <select value={medium} onChange={(e) => setMedium(e.target.value as Medium)}>
              {Object.entries(media)
                .filter(([key]) => utilities(p).nodes[id]!.media.includes(key as Medium))
                .map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.label}
                  </option>
                ))}
            </select>
          </Field>
        )}
      </div>
      <p>{result.note}</p>
      <p role="status">{found.length} Objekte gefunden</p>
      {message && <p role="status">{message}</p>}
      <button
        disabled={!found.length}
        onClick={() => {
          const first = rows.find((r) => r.id === id) ?? found[0];
          if (first && !focusObject(first.target)) {
            setMessage("Die zugehörige Ebene ist ausgeblendet. Bitte zuerst im Plan einblenden.");
            return;
          }
          useEditorStore.setState({ connectionHighlight: { projectId: p.id, ids: result.ids } });
          onClose();
        }}
      >
        Im Plan hervorheben
      </button>
      <p>
        Orange durchgezogen: erfasster Leitungsweg. Gestrichelt: Versorgungszuordnung, kein realer
        Leitungsverlauf. Die Hervorhebung bleibt beim Geschosswechsel sichtbar. Mit „Hervorhebung beenden“ im
        Plan ausschalten.
      </p>
      {found.map((r) => (
        <article className="home-row" key={r.id}>
          <strong>{r.name}</strong>
          <span>{r.floor}</span>
          <button
            onClick={() => {
              if (focusObject(r.target)) {
                useEditorStore.setState({ connectionHighlight: { projectId: p.id, ids: result.ids } });
                onClose();
              } else setMessage("Die zugehörige Ebene ist ausgeblendet. Bitte zuerst im Plan einblenden.");
            }}
          >
            Zum Objekt: {r.name}
          </button>
        </article>
      ))}
    </section>
  );
}
