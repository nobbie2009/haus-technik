import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { elementTables } from "../../core/elementTables";
import { asset } from "../../housebook/model";
import { Field } from "./shared";
import {
  loadHomeAssistantConnection,
  saveHomeAssistantConnection,
} from "../../persistence/homeAssistantConnection";
import { useHomeAssistantStore } from "../../stores/homeAssistantStore";
import { HaLiveControls } from "./HaLiveControls";
export function HomeAssistantPanel() {
  const project = useProjectStore((s) => s.project);
  const [initial] = useState(() => {
    try {
      return { ...loadHomeAssistantConnection(), error: "" };
    } catch {
      return {
        url: "",
        token: "",
        error:
          "Gespeicherte Verbindung konnte nicht geladen werden. Bitte Adresse und Token erneut eingeben.",
      };
    }
  });
  const [storageError, setStorageError] = useState(initial.error);
  const [url, setUrl] = useState(initial.url),
    [token, setToken] = useState(initial.token);
  const live = useHomeAssistantStore();
  const { states, busy } = live;
  const readAt = live.readAt ? new Date(live.readAt).toLocaleTimeString("de-DE") : "";
  const remember = (url: string, token: string) => {
    try {
      saveHomeAssistantConnection({ url, token });
      setStorageError("");
    } catch {
      setStorageError(
        "Die Verbindung konnte nicht im Browser gespeichert oder gelöscht werden. Bitte Browserspeicher-Einstellungen prüfen.",
      );
    }
  };
  const mapped = Object.values(elementTables(project))
    .flatMap((table) => Object.values(table))
    .filter((item) => asset(item).homeAssistantEntity);
  return (
    <section>
      <h3>Home Assistant · Zustände lesen</h3>
      <p>
        In den Objektakten eine Entität wie <code>light.wohnzimmer</code> zuordnen. Hier lassen sich aktuelle
        Zustände und Messwerte auf ausdrücklichen Abruf vergleichen. Die Verbindung sendet keine
        Steuerbefehle.
      </p>
      <HaLiveControls />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          remember(url, token);
          live.start(live.seconds, true);
        }}
      >
        <div className="book-grid">
          <Field label="Home-Assistant-Basisadresse">
            <input
              type="url"
              disabled={busy}
              required
              placeholder="http://homeassistant.local:8123"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                remember(e.target.value, token);
                live.stop(true);
              }}
            />
          </Field>
          <Field label="Zugriffstoken">
            <input
              type="password"
              disabled={busy}
              autoComplete="off"
              required
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                remember(url, e.target.value);
                live.stop(true);
              }}
            />
          </Field>
        </div>
        <div className="book-actions">
          <button disabled={busy}>{busy ? "Liest Zustände …" : "Zustände jetzt abrufen"}</button>
          <button
            type="button"
            onClick={() => {
              live.stop(true);
              remember("", "");
              setUrl("");
              setToken("");
            }}
          >
            Verbindung verwerfen
          </button>
        </div>
      </form>
      <p>
        Adresse und Token werden automatisch lokal in diesem Browser gespeichert und beim nächsten Öffnen
        wieder geladen. „Verbindung verwerfen“ löscht beide Angaben. Projektdateien und Exporte enthalten
        diese Zugangsdaten nicht. Der Browser muss die Instanz erreichen können; Home Assistant muss Anfragen
        von dieser App-Adresse erlauben (CORS). HTTPS-Seiten können keine unverschlüsselten HTTP-Instanzen
        abfragen.
      </p>
      {storageError && <p role="alert">{storageError}</p>}
      {readAt && (
        <p role="status">
          Zuletzt gelesen: {readAt}.{" "}
          {live.running ? "Live-Aktualisierung aktiv." : "Momentaufnahme; Empfang gestoppt."}
        </p>
      )}
      {!mapped.length && (
        <p>Noch keine Entitäten zugeordnet. Öffne eine Objektakte und trage die Entitäts-ID ein.</p>
      )}
      <table className="book-table">
        <thead>
          <tr>
            <th>Objekt</th>
            <th>Entität</th>
            <th>Gelesener Zustand</th>
          </tr>
        </thead>
        <tbody>
          {mapped.map((item) => {
            const entity = asset(item).homeAssistantEntity,
              state = states.find((s) => s.entity_id === entity);
            return (
              <tr key={item.id}>
                <td>{"name" in item ? item.name : item.id.slice(0, 8)}</td>
                <td>{entity}</td>
                <td>
                  {state
                    ? `${state.state} ${state.attributes?.unit_of_measurement ?? ""}`
                    : readAt
                      ? "Nicht gefunden"
                      : "Noch nicht abgerufen"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
