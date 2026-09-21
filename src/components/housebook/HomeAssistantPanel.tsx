import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { elementTables } from "../../core/elementTables";
import { asset } from "../../housebook/model";
import { Field } from "./shared";
import {
  loadHomeAssistantConnection,
  saveHomeAssistantConnection,
} from "../../persistence/homeAssistantConnection";
interface State {
  entity_id: string;
  state: string;
  last_updated?: string;
  attributes?: { unit_of_measurement?: string; friendly_name?: string };
}
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
    [token, setToken] = useState(initial.token),
    [states, setStates] = useState<State[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [readAt, setReadAt] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
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
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          controller.current?.abort();
          const request = new AbortController();
          controller.current = request;
          const timeout = setTimeout(() => request.abort(), 15000);
          try {
            const base = new URL(url);
            if (
              !["http:", "https:"].includes(base.protocol) ||
              base.username ||
              base.password ||
              base.search ||
              base.hash
            )
              throw new Error(
                "Eine HTTP-/HTTPS-Basisadresse ohne Zugangsdaten, Query oder Fragment eingeben.",
              );
            if (!token.trim()) throw new Error("Zugriffstoken fehlt.");
            const response = await fetch(`${base.href.replace(/\/$/, "")}/api/states`, {
              method: "GET",
              headers: { Authorization: `Bearer ${token.trim()}`, Accept: "application/json" },
              signal: request.signal,
              credentials: "omit",
              redirect: "error",
              cache: "no-store",
            });
            if (!response.ok)
              throw new Error(
                `Home Assistant antwortet mit HTTP ${response.status}. Adresse und Leseberechtigung prüfen.`,
              );
            const data: unknown = await response.json();
            if (
              !Array.isArray(data) ||
              !data.every(
                (s) =>
                  typeof s === "object" &&
                  s !== null &&
                  typeof s.entity_id === "string" &&
                  typeof s.state === "string",
              )
            )
              throw new Error("Die Antwort enthält keine gültige Entitätenliste.");
            setStates(
              data.map((s) => ({
                entity_id: s.entity_id,
                state: s.state,
                last_updated: typeof s.last_updated === "string" ? s.last_updated : undefined,
                attributes: {
                  unit_of_measurement:
                    typeof s.attributes?.unit_of_measurement === "string"
                      ? s.attributes.unit_of_measurement
                      : undefined,
                },
              })),
            );
            setReadAt(new Date().toLocaleTimeString("de-DE"));
          } catch (error) {
            setError(
              error instanceof Error && error.name === "AbortError"
                ? "Abruf abgebrochen oder Zeitlimit erreicht."
                : error instanceof Error
                  ? error.message
                  : "Verbindung fehlgeschlagen.",
            );
          } finally {
            clearTimeout(timeout);
            setBusy(false);
          }
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
                setStates([]);
                setReadAt("");
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
                setStates([]);
                setReadAt("");
              }}
            />
          </Field>
        </div>
        <div className="book-actions">
          <button disabled={busy}>{busy ? "Liest Zustände …" : "Zustände jetzt abrufen"}</button>
          <button
            type="button"
            onClick={() => {
              controller.current?.abort();
              remember("", "");
              setUrl("");
              setToken("");
              setStates([]);
              setReadAt("");
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
      {error && <p role="alert">{error}</p>}
      {readAt && (
        <p role="status">Zuletzt gelesen: {readAt}. Momentaufnahme, keine automatische Aktualisierung.</p>
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
