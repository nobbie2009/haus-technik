import { useState } from "react";
import {
  useSharedProjects,
  authenticateShared,
  rememberShared,
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
    [remember, setRemember] = useState(state.remember),
    [visible, setVisible] = useState(false),
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
        <input
          type={visible ? "text" : "password"}
          name="home-technik-project-key"
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </Field>
      <div className="book-actions">
        <button type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? "Schlüssel verbergen" : "Schlüssel anzeigen"}
        </button>
      </div>
      <label>
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => {
            setRemember(event.target.checked);
            if (state.token) rememberShared(event.target.checked);
          }}
        />{" "}
        Auf diesem Gerät merken
      </label>
      <div className="book-actions">
        <button
          disabled={state.busy || !key.trim()}
          onClick={() =>
            void run(async () => {
              setRows(await authenticateShared(key, remember));
              setKey("");
              useSharedProjects.setState({
                message: "Verbunden. Serverprojekt öffnen oder aktuelles Projekt bereitstellen.",
              });
            })
          }
        >
          Mit Projektdienst verbinden
        </button>
        <button
          disabled={state.busy}
          onClick={() => {
            disconnectShared();
            setRemember(false);
            setKey("");
            setRows([]);
            setPending(null);
          }}
        >
          {state.remember ? "Gespeicherten Zugang entfernen" : "Verbindung trennen"}
        </button>
      </div>
      <p>
        Mit „Auf diesem Gerät merken“ bleiben Schlüssel und Projektverbindungen auch nach dem Schließen
        gespeichert. Nur auf eigenen Geräten verwenden: Wer dieses Browserprofil nutzt, kann damit auf die
        gemeinsamen Projekte zugreifen. Ohne Häkchen gilt der Zugang nur für diesen Tab. Der Schlüssel ist
        nicht Teil der Projektdatei. Im Heimnetz eine vertrauenswürdige Verbindung verwenden; HTTPS schützt
        auch den Zugriffsschlüssel bei der Übertragung.
      </p>
      <p role="status">{state.message}</p>
      {state.storageError && <p role="alert">{state.storageError}</p>}
      <details>
        <summary>Eigenen, gut merkbaren Schlüssel festlegen</summary>
        <p>
          Nach dem App-Update im LXC <code>/usr/local/bin/Update --set-project-key</code> ausführen. Eine
          eigene Passphrase mit mindestens 12 Zeichen zweimal verdeckt eingeben. Danach alle Geräte mit dem
          neuen Schlüssel verbinden. Das Update-Passwort bleibt unverändert.
        </p>
      </details>
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
