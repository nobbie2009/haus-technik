import { useMemo, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { searchEntries, searchProject } from "../../housebook/search";
import { focusObject } from "../../housebook/navigation";
import type { Selection } from "../../editor/types";
import type { OpenSection } from "../../housebook/setup";
import { Field } from "./shared";
export function SearchPanel({
  onOpen,
  onClose,
  onAsset,
  onPhoto,
}: {
  onOpen: OpenSection;
  onClose: () => void;
  onAsset: (s: Selection) => void;
  onPhoto: (wallId: string, photoId?: string) => void;
}) {
  const p = useProjectStore((s) => s.project),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [limit, setLimit] = useState(50),
    [message, setMessage] = useState("");
  const categories = useMemo(
      () => [...new Set(searchEntries(p).map((r) => r.category))].sort((a, b) => a.localeCompare(b, "de")),
      [p],
    ),
    results = useMemo(() => searchProject(p, query, category), [p, query, category]);
  return (
    <section>
      <h3>Wo finde ich …?</h3>
      <p>
        Suche nach Bezeichnung, Standort, Seriennummer, WLAN-Name, Unterlagen-Link oder Notiz. Mehrere
        Suchwörter müssen gemeinsam vorkommen.
      </p>
      <div className="book-grid">
        <Field label="Haus durchsuchen">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(50);
            }}
          />
        </Field>
        <Field label="Suchbereich">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(50);
            }}
          >
            <option value="">Alle Bereiche</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <p role="status">
        {results.length} Treffer{results.length > limit ? ` · ${limit} angezeigt` : ""}
      </p>
      {message && <p role="alert">{message}</p>}
      {results.slice(0, limit).map((r) => (
        <article key={r.key} className="home-row search-result">
          <strong>{r.title}</strong>
          <span>
            {r.category} · {r.location || "Standort offen"}
          </span>
          {r.description && (
            <details>
              <summary>Gefundene Angaben</summary>
              <p>{r.description}</p>
            </details>
          )}
          <div className="book-actions">
            {r.target && (
              <>
                <button
                  onClick={() => {
                    if (focusObject(r.target!)) onClose();
                    else setMessage("Die Ebene ist ausgeblendet. Bitte im Editor einblenden.");
                  }}
                >
                  Im Plan: {r.title}
                </button>
                {r.target.kind !== "networkNodes" && (
                  <button onClick={() => onAsset(r.target!)}>Objektakte: {r.title}</button>
                )}
              </>
            )}
            {r.section && <button onClick={() => onOpen(r.section!, r.id)}>Öffnen: {r.title}</button>}
            {r.wallId && (
              <button onClick={() => onPhoto(r.wallId!, r.photoId)}>Foto öffnen: {r.title}</button>
            )}
            {r.floorId && r.position && (
              <button
                onClick={() => {
                  const e = useEditorStore.getState();
                  e.setFloor(r.floorId!);
                  e.setTool("select");
                  useEditorStore.setState({
                    viewport: {
                      scale: e.viewport.scale,
                      originPx: {
                        x: e.size.width / 2 - r.position!.x * e.viewport.scale,
                        y: e.size.height / 2 + r.position!.y * e.viewport.scale,
                      },
                    },
                  });
                  onClose();
                }}
              >
                Standort: {r.title}
              </button>
            )}
          </div>
        </article>
      ))}
      {results.length > limit && (
        <button onClick={() => setLimit((n) => n + 50)}>Weitere Treffer anzeigen</button>
      )}
      {!results.length && (
        <p>Keine passenden Einträge. Versuche weniger Suchwörter oder einen anderen Suchbereich.</p>
      )}
    </section>
  );
}
