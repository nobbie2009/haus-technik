import { newId } from "../../utils/uuid";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { housebook, cleanScenario } from "../../housebook/model";
import { simulate } from "../../simulation/solve";
import { emptyScenario } from "../../simulation/models";
import { Field, updateBook } from "./shared";
export function ScenariosPanel({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    simulation = useSimulationStore(),
    [name, setName] = useState("Normalbetrieb");
  const [message, setMessage] = useState("");
  const save = () => {
    const scenario = structuredClone(simulation.active ? simulation.scenario : emptyScenario());
    if (
      updateBook("Szenario speichern", (b) => {
        b.scenarios.push({ id: newId(), name, scenario });
      })
    ) {
      setMessage("Szenario gespeichert.");
      useSimulationStore.getState().update((s) => Object.assign(s, scenario));
    }
  };
  return (
    <section>
      <h3>Szenarien speichern und vergleichen</h3>
      <p>
        Gespeicherte Szenarien werden mit dem aktuellen Projekt neu berechnet. Gelöschte Objekte werden dabei
        ausgelassen. Bearbeite die Schalter und Lasten in der Stromkreissimulation und speichere anschließend
        hier.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="book-actions"
      >
        <Field label="Szenarioname">
          <input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <button disabled={!name.trim()}>Aktuellen Zustand speichern</button>
      </form>
      {message && <p role="status">{message}</p>}
      <table className="book-table">
        <thead>
          <tr>
            <th>Szenario</th>
            <th>Bekannte Wirkleistung</th>
            <th>Höchste Auslastung</th>
            <th>Datenlage</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {housebook(project).scenarios.map((saved) => {
            const result = simulate(project, cleanScenario(project, saved.scenario)),
              devices = Object.values(result.devices),
              nodes = Object.values(result.nodes),
              utilization = nodes.flatMap((n) => (n.utilization === null ? [] : [n.utilization]));
            return (
              <tr key={saved.id}>
                <td>{saved.name}</td>
                <td>{devices.reduce((s, d) => s + (d.power ?? 0), 0).toFixed(0)} W</td>
                <td>{utilization.length ? `${Math.max(...utilization).toFixed(1)} %` : "Unbekannt"}</td>
                <td>
                  {!!saved.scenario.conductorFaults?.length && (
                    <span>
                      {saved.scenario.conductorFaults.length} Leiterfehler (Ergebnis in Leiterprüfung) ·{" "}
                    </span>
                  )}
                  {devices.filter((d) => d.status === "incomplete").length} unvollständig
                  {devices.some((d) => d.estimated) ? " · Schätzung" : ""}
                </td>
                <td>
                  <button
                    onClick={() => {
                      useSimulationStore
                        .getState()
                        .update((s) => Object.assign(s, cleanScenario(project, saved.scenario)));
                      onClose();
                    }}
                  >
                    Im Plan laden
                  </button>
                  <button
                    aria-label={`${saved.name} löschen`}
                    onClick={() =>
                      updateBook("Szenario löschen", (b) => {
                        b.scenarios = b.scenarios.filter((s) => s.id !== saved.id);
                      })
                    }
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!housebook(project).scenarios.length && <p>Noch keine Szenarien gespeichert.</p>}
    </section>
  );
}
