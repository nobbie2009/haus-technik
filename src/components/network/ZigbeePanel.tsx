import { useState } from "react";
import { batteryLabel } from "../../network/zigbeeBattery";
import { useZigbeeStore } from "../../stores/zigbeeStore";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook } from "../../housebook/model";
import { loadHomeAssistantConnection } from "../../persistence/homeAssistantConnection";
import { emptyZigbee } from "../../network/zigbeeModel";
import { Modal } from "../dialogs/Modal";

export function ZigbeeControls() {
  const [open, setOpen] = useState(false);
  const running = useZigbeeStore((s) => s.running);
  return (
    <>
      <button onClick={() => setOpen(true)}>Zigbee2MQTT · {running ? "Live aktiv" : "Geräte & Karte"}</button>
      {running && (
        <button onClick={() => useZigbeeStore.getState().stop()}>Zigbee-Aktualisierung stoppen</button>
      )}
      {open && (
        <Modal title="Zigbee2MQTT im Hausplan" onClose={() => setOpen(false)}>
          <ZigbeePanel onPlace={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
function ZigbeePanel({ onPlace }: { onPlace: () => void }) {
  const state = useZigbeeStore();
  const project = useProjectStore((s) => s.project);
  const [topic, setTopic] = useState(
    (state.projectId === project.id ? state.snapshot.baseTopic : housebook(project).zigbee?.baseTopic) ??
      "zigbee2mqtt",
  );
  const [seconds, setSeconds] = useState<5 | 10>(state.interval);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const book = housebook(project);
  const snapshot = state.projectId === project.id ? state.snapshot : (book.zigbee ?? emptyZigbee());
  return (
    <section>
      <p>
        Verbindung über die unter Hausakte → Home Assistant gespeicherte Adresse und den Token. Die
        MQTT-Integration muss aktiv sein; für diesen Zugriff benötigt der Token Administratorrechte. Keine
        zusätzliche Z2M-Adresse nötig.
      </p>
      <div className="book-grid">
        <label className="field">
          Z2M-MQTT-Basistopic
          <input value={topic} disabled={state.running} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className="field">
          Anzeige aktualisieren
          <select
            aria-label="Anzeige aktualisieren"
            value={seconds}
            disabled={state.running}
            onChange={(e) => setSeconds(Number(e.target.value) as 5 | 10)}
          >
            <option value={5}>Alle 5 Sekunden</option>
            <option value={10}>Alle 10 Sekunden</option>
          </select>
        </label>
      </div>
      <div className="book-actions">
        <button
          disabled={state.running}
          onClick={() => {
            try {
              setError("");
              state.start({ ...loadHomeAssistantConnection(), baseTopic: topic.trim() }, seconds);
            } catch {
              setError("Home-Assistant-Verbindung konnte nicht geladen werden.");
            }
          }}
        >
          Geräte auslesen & Live starten
        </button>
        <button disabled={!state.running} onClick={state.stop}>
          Aktualisierung stoppen
        </button>
        <button disabled={!state.connected || state.scanning} onClick={state.scan}>
          {state.scanning ? "Topologie-Scan läuft …" : "Topologie jetzt scannen"}
        </button>
      </div>
      <p role="status">
        {state.running
          ? state.connected
            ? "Empfang aktiv"
            : "Verbindung wird aufgebaut …"
          : "Gestoppt · gespeicherter Stand"}
        {state.refreshedAt && ` · Anzeige: ${new Date(state.refreshedAt).toLocaleTimeString("de-DE")}`}
      </p>
      {(state.error || error) && <p role="alert">{state.error || error}</p>}
      <p>
        Gerätezustände werden empfangen und im gewählten Intervall angezeigt. Ein Topologie-Scan ist separat:
        Er kann 10 Sekunden bis 2 Minuten dauern und Zigbee vorübergehend verlangsamen. Stopp beendet den
        Empfang, nicht einen bereits an Z2M gesendeten Scan.
      </p>
      <p>
        Kartenstand:{" "}
        {snapshot.scannedAt
          ? new Date(snapshot.scannedAt).toLocaleString("de-DE")
          : "noch kein zeitlich zugeordneter Scan"}
        . LQI 0–255, höher ist besser. Farben sind Orientierung: unter 80 rot, 80–149 orange, ab 150 grün.
        Keine Funkabdeckungsmessung; fehlende Linien sind kein sicherer Nachweis eines Funklochs.
      </p>
      <label className="field">
        Zigbee-Geräte suchen
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      {!!snapshot.failures?.length && (
        <p role="alert">
          Unvollständiger Scan: {snapshot.failures.join("; ")}. Fehlende Linien daher nicht als Funkloch
          bewerten.
        </p>
      )}
      <ul className="book-list">
        {snapshot.devices
          .filter((d) => `${d.name} ${d.model} ${d.address}`.toLowerCase().includes(filter.toLowerCase()))
          .map((device) => {
            const placed = book.networkNodes.find((n) => n.zigbeeAddress === device.address);
            const live = state.projectId === project.id ? state.live[device.address] : undefined;
            return (
              <li key={device.address}>
                <span>
                  <strong>{device.name}</strong> · {device.type} · {device.vendor} {device.model}
                  <br />
                  {placed
                    ? `Platziert: ${project.floors[placed.floorId]?.name}`
                    : "Noch nicht platziert"} · {live?.availability ?? "Status unbekannt"}
                  {live?.lqi != null && ` · Geräte-LQI ${live.lqi}`}
                  {` · ${batteryLabel(live)}`}
                </span>
                <button
                  onClick={() => {
                    const editor = useEditorStore.getState();
                    if (placed) {
                      editor.setFloor(placed.floorId);
                      editor.setTool("select");
                      useEditorStore.setState({ selection: [{ kind: "networkNodes", id: placed.id }] });
                    } else {
                      editor.setTool("network");
                      useEditorStore.setState({
                        networkKind: "zigbee",
                        zigbeePlacementAddress: device.address,
                      });
                    }
                    onPlace();
                  }}
                >
                  {placed ? "Im Plan auswählen" : `Platzieren: ${device.name}`}
                </button>
              </li>
            );
          })}
      </ul>
      {!snapshot.devices.length && (
        <p>
          Noch keine Geräteliste. Zuerst Geräte auslesen; danach die Geräte einzeln auswählen und im
          gewünschten Geschoss im Plan anklicken.
        </p>
      )}
      <p>
        Positionen bleiben bei erneutem Auslesen über die IEEE-Adresse erhalten. Beim Schließen dieses Dialogs
        läuft der Empfang weiter; im Menüband steht jederzeit der Stoppknopf bereit. Projektwechsel und
        Neuladen beenden den Empfang. Live-Werte werden nicht als laufende Historie gespeichert.
      </p>
    </section>
  );
}
