import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { projectRepository } from "../../persistence/indexedDbRepository";
import { projectChanges } from "../../housebook/compare";
import { downloadProject } from "../../persistence/projectFile";
import { saveNow } from "../../persistence/autosave";
import type { Project } from "../../models/project";
import { Field } from "./shared";
export function VersionsPanel({ refresh }: { refresh: () => Promise<void> }) {
  const project = useProjectStore((s) => s.project);
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [rows, setRows] = useState<{ id: string; name?: string; savedAt: string; project: Project }[]>([]);
  const [compare, setCompare] = useState<Project | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  const load = async () => {
    setRows(await projectRepository.snapshots(project.id));
    await refresh();
  };
  return (
    <section>
      <h3>Benannte Versionsstände</h3>
      <p>
        Benannte Stände bleiben von der automatischen Bereinigung ausgenommen. Sie liegen in diesem Browser;
        für eine unabhängige Sicherung als Datei exportieren.
      </p>
      <Field label="Name des Versionsstands">
        <input maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="book-actions">
        <button
          disabled={busy || !name.trim()}
          onClick={() =>
            void run(async () => {
              await saveNow();
              await projectRepository.saveNamedSnapshot(useProjectStore.getState().project, name);
              await load();
              setName("");
              setMessage("Versionsstand gespeichert.");
            })
          }
        >
          Versionsstand sichern
        </button>
        <button disabled={busy} onClick={() => void run(load)}>
          Versionsstände laden
        </button>
      </div>
      {rows.map((s) => (
        <article key={s.id} className="home-row">
          <strong>
            {s.name ?? "Automatischer Stand"} · {new Date(s.savedAt).toLocaleString("de-DE")}
          </strong>
          <button onClick={() => setCompare(s.project)}>
            Mit aktuellem Stand vergleichen: {s.name ?? s.savedAt}
          </button>
          <button onClick={() => downloadProject(s.project)}>
            Stand als Datei sichern: {s.name ?? s.savedAt}
          </button>
        </article>
      ))}
      {compare && (
        <div>
          <h4>Änderungen seit dem gewählten Stand</h4>
          {projectChanges(compare, project).length === 0 ? (
            <p>Keine inhaltlichen Änderungen.</p>
          ) : (
            projectChanges(compare, project).map((c, i) => (
              <p key={i}>
                {c.change}: {c.name}
              </p>
            ))
          )}
          <button onClick={() => setCompare(null)}>Vergleich schließen</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
