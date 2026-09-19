import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { Modal } from "../dialogs/Modal";
import { SelectField } from "../electrical/ElectricalFields";
import { circuitOptionLabel } from "../../electrical/supply";
import { SimulationControls } from "./SimulationControls";
import { SimulationResults } from "./SimulationResults";

export function SimulationDialog({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const { scenario, active, start, stop, update, result } = useSimulationStore();
  const [selected, setSelected] = useState(Object.keys(project.electrical.circuits)[0] ?? "");
  const current = project.electrical.circuits[selected]
    ? selected
    : (Object.keys(project.electrical.circuits)[0] ?? "");
  return (
    <Modal title="Stromkreissimulation" className="simulation-dialog" onClose={onClose}>
      <p>
        Statische Lastrechnung aus den dokumentierten Zuordnungen. Schalter wirken nur in diesem Testszenario;
        Bestandsdaten und Zählerstände bleiben unverändert.
      </p>
      <div className="simulation-actions">
        <button onClick={start}>Szenario zurücksetzen</button>
        <button
          onClick={() => {
            stop();
            onClose();
          }}
        >
          Simulation beenden
        </button>
        <button onClick={onClose}>Ergebnis im Plan ansehen</button>
      </div>
      {!active ? (
        <p>
          Die Simulation wurde durch eine Projektänderung beendet. Mit „Szenario zurücksetzen“ neu berechnen.
        </p>
      ) : (
        <>
          <label className="simulation-assumption">
            <input
              type="checkbox"
              aria-label="Fehlenden Leistungsfaktor mit 1 annehmen"
              checked={scenario.assumeUnityPowerFactor}
              onChange={(e) =>
                update((draft) => {
                  draft.assumeUnityPowerFactor = e.target.checked;
                })
              }
            />{" "}
            Fehlenden Leistungsfaktor mit 1 annehmen (Schätzung)
          </label>
          <details className="simulation-model">
            <summary>Rechenmodell und Grenzen</summary>
            <p>
              Ideale Nennspannung und konstante Gerätelast; sinusförmige, induktive Lasten.
              Drehstromverbraucher werden symmetrisch gerechnet. Phasenströme werden mit Wirk- und Blindanteil
              summiert. Ohne Phasenzuordnung ist die Auslastung unvollständig.
            </p>
            <p>
              Gezeichnete Kabelwege sind noch kein Leiter-/Polnetz: Diese Simulation nutzt die ausdrücklichen
              Versorgungszuordnungen. „Stromkreis verbunden“ unterbricht diese Verbindung. Kein
              Spannungsabfall, Kurzschluss, Fehlerstrom oder zeitabhängiges Auslösen. Mehr als 100 % wird
              angezeigt und nicht automatisch abgeschaltet.
            </p>
            <p>
              Standby benötigt eigene Lastdaten und wird derzeit als unvollständig angezeigt.
              Dokumentänderungen und Neuladen beenden das Szenario.
            </p>
          </details>
          <SelectField label="Simulierter Stromkreis" value={current} onChange={setSelected}>
            {!current && <option value="">Noch kein Stromkreis vorhanden</option>}
            {Object.keys(project.electrical.circuits).map((id) => (
              <option key={id} value={id}>
                {circuitOptionLabel(project, id)}
              </option>
            ))}
          </SelectField>
          {result?.issues.map((issue, i) => (
            <p key={i} className="simulation-note">
              {issue}
            </p>
          ))}
          <div className="simulation-layout">
            <SimulationControls />
            {current ? (
              <SimulationResults circuitId={current} />
            ) : (
              <p>Zuerst einen Sicherungskasten und Stromkreis anlegen.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
