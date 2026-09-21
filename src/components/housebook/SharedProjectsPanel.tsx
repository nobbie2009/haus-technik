import { useState } from "react";
import {
  useSharedProjects,
  connectShared,
  disconnectShared,
  listShared,
  getShared,
  publishShared,
  linkShared,
  syncShared,
  type SharedSummary,
} from "../../persistence/sharedProjects";
import { useProjectStore } from "../../stores/projectStore";
import { projectRepository } from "../../persistence/indexedDbRepository";
import { activateProject } from "../dialogs/ProjectDialog";
import { downloadProject } from "../../persistence/projectFile";
import { newId } from "../../utils/uuid";
import { Field } from "./shared";
export function SharedProjectsPanel() {
  const p = useProjectStore((s) => s.project),
    state = useSharedProjects();
  const [key, setKey] = useState(""),
    [rows, setRows] = useState<SharedSummary[]>([]),
    [pending, setPending] = useState<Awaited<ReturnType<typeof getShared>> | null>(null);
  const run = async (fn: () => Promise<void>) => {
    if (useSharedProjects.getState().busy) return;
    useSharedProjects.setState({ busy: true });
    try {
      await fn();
    } catch (e) {
      useSharedProjects.setState({ message: String(e) });
    } finally {
      useSharedProjects.setState({ busy: false });
    }
  };
  return (
    <section>
      <h3>Gemeinsame Projekte</h3>
      <p>
        PC, iPad und iPhone verbinden sich mit dem Projektdienst dieser App-Adresse. Lokale Änderungen
        verbundener Projekte werden im geöffneten Tab alle zehn Sekunden abgeglichen. Geänderte Serverstände
        werden zur Übernahme angeboten; Konflikte überschreiben keinen Entwurf.
      </p>
      <Field label="Projektdienst-Zugriffsschlüssel">
        <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
      </Field>
      <div className="book-actions">
        <button
          disabled={state.busy || !key.trim()}
          onClick={() =>
            void run(async () => {
              connectShared(key);
              setRows(await listShared());
              setKey("");
              useSharedProjects.setState({
                message: "Verbunden. Serverprojekt öffnen oder aktuelles Projekt bereitstellen.",
              });
            })
          }
        >
          Mit Projektdienst verbinden
        </button>
        <button disabled={state.busy} onClick={disconnectShared}>
          Verbindung trennen
        </button>
      </div>
      <p>
        Der Schlüssel bleibt bis zum Schließen des Tabs gespeichert und ist nicht Teil der Projektdatei. Im
        Heimnetz eine vertrauenswürdige Verbindung verwenden; HTTPS schützt auch den Zugriffsschlüssel bei der
        Übertragung.
      </p>
      <p role="status">{state.message}</p>
      <div className="book-actions">
        <button
          disabled={!state.token || state.busy}
          onClick={() => void run(async () => setRows(await listShared()))}
        >
          Serverprojekte laden
        </button>
        <button
          disabled={!state.token || state.busy}
          onClick={() =>
            void run(async () => {
              await publishShared(p, true);
              setRows(await listShared());
            })
          }
        >
          Aktuelles Projekt erstmals bereitstellen
        </button>
        <button disabled={state.busy || !state.links[p.id]} onClick={() => void syncShared()}>
          Jetzt abgleichen
        </button>
        <button onClick={() => downloadProject(p)}>Lokalen Entwurf als Datei sichern</button>
      </div>
      {rows.map((row) => (
        <article className="home-row" key={row.id}>
          <strong>{row.name}</strong>
          <span>{row.saved} UTC</span>
          <button
            disabled={state.busy}
            onClick={() => void run(async () => setPending(await getShared(row.id)))}
          >
            Serverstand prüfen: {row.name}
          </button>
        </article>
      ))}
      {pending && (
        <div className="info-card">
          <h4>Serverstand: {pending.project.name}</h4>
          <p>
            Revision {pending.project.version} · {pending.project.floorOrder.length} Geschosse. Vor der
            Übernahme wird das aktuell geöffnete Projekt als benannter lokaler Stand gesichert. Bei gleicher
            Projektkennung wird der lokale Stand ersetzt.
          </p>
          <div className="book-actions">
            <button
              disabled={state.busy}
              onClick={() =>
                void run(async () => {
                  await projectRepository.saveNamedSnapshot(
                    useProjectStore.getState().project,
                    "Vor Übernahme vom Server",
                  );
                  await activateProject(pending.project);
                  linkShared(useProjectStore.getState().project, pending.etag);
                  setPending(null);
                })
              }
            >
              Serverstand übernehmen und verbinden
            </button>
            <button
              disabled={state.busy}
              onClick={() =>
                void run(async () => {
                  const copy = structuredClone(pending.project);
                  copy.id = newId();
                  copy.name = `${copy.name.slice(0, 120)} · Serverkopie`;
                  await activateProject(copy);
                  setPending(null);
                })
              }
            >
              Als lokale Kopie öffnen
            </button>
            <button onClick={() => setPending(null)}>Vorschau schließen</button>
          </div>
        </div>
      )}
      <p>
        Einrichtung im LXC: nach dem App-Update einmalig <code>Update --setup-projects</code> ausführen. Dort
        wird ein eigener Projektschlüssel erzeugt. Dieser Bereich überträgt ausschließlich Projekte;
        Home-Assistant-Zugangsdaten bleiben auf dem jeweiligen Gerät.
      </p>
    </section>
  );
}
