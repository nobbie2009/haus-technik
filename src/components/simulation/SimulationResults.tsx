import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { phases } from "../../simulation/models";
import { simulationNumber, simulationStatus } from "./format";

export function SimulationResults({ circuitId }: { circuitId: string }) {
  const project = useProjectStore((s) => s.project);
  const { scenario, result, update } = useSimulationStore();
  const node = result?.nodes[circuitId];
  if (!node || !result) return null;
  const deviceIds = node.deviceIds;
  return (
    <section aria-label="Stromkreisergebnis" className="simulation-results">
      <h3>
        {project.electrical.circuits[circuitId]!.label} · {project.electrical.circuits[circuitId]!.name}
      </h3>
      <label>
        <input
          type="checkbox"
          aria-label="Stromkreis verbunden"
          checked={!scenario.disabledNodeIds.includes(circuitId)}
          onChange={(e) =>
            update((draft) => {
              draft.disabledNodeIds = e.target.checked
                ? draft.disabledNodeIds.filter((id) => id !== circuitId)
                : [...draft.disabledNodeIds, circuitId];
            })
          }
        />{" "}
        Stromkreis verbunden
      </label>
      <p>
        {node.sourceId
          ? node.availablePhases.length
            ? `Versorgung über ${project.electrical.supplies[node.sourceId]!.label}: ${node.availablePhases.join(", ")}`
            : "Versorgung im Szenario unterbrochen."
          : "Keine Einspeisung zugeordnet. Es wird keine Versorgung aus der Standardspannung angenommen."}
      </p>
      <div className="simulation-metrics">
        <div>
          Erfasste Wirkleistung
          <output data-testid="simulation-total-power">{simulationNumber(node.knownPower, "W", 0)}</output>
        </div>
        <div>
          Höchster Phasenstrom
          <output data-testid="simulation-max-current">{simulationNumber(node.maxCurrent, "A")}</output>
        </div>
      </div>
      <p>
        {phases.map((phase) => `${phase}: ${simulationNumber(node.phaseCurrents[phase], "A")}`).join(" · ")}
        {node.incompleteCount ? " · nur vollständig berechenbare Lasten" : ""}
      </p>
      {node.estimated && (
        <p className="simulation-note">
          Schätzung: Für mindestens einen Verbraucher wurde cos φ = 1 angenommen.
        </p>
      )}
      {node.incompleteCount > 0 && (
        <p className="simulation-note">
          {node.incompleteCount} Verbraucher unvollständig. Leistung und Phasenströme sind Teilsummen; eine
          vollständige Auslastung ist nicht berechenbar.
        </p>
      )}
      <h3>Verbraucher einschließlich Unterverteilungen</h3>
      <div className="simulation-actions">
        <button
          disabled={!deviceIds.length}
          onClick={() =>
            update((draft) => {
              for (const id of deviceIds) draft.deviceStates[id] = "on";
            })
          }
        >
          Alle ein
        </button>
        <button
          disabled={!deviceIds.length}
          onClick={() =>
            update((draft) => {
              for (const id of deviceIds) draft.deviceStates[id] = "off";
            })
          }
        >
          Alle aus
        </button>
      </div>
      {!deviceIds.length ? (
        <p>
          Noch keine Verbraucher an diesem Stromkreis angeschlossen. Geräte über eine Steckdose oder als
          Festanschluss zuordnen.
        </p>
      ) : (
        <div className="simulation-table-wrap">
          <table>
            <caption>Simulierte Verbraucherwerte</caption>
            <thead>
              <tr>
                <th>Verbraucher / Szenario</th>
                <th>Status</th>
                <th>Spannung</th>
                <th>Leistung</th>
                <th>Strom je Phase</th>
              </tr>
            </thead>
            <tbody>
              {deviceIds.map((id) => {
                const device = project.electrical.devices[id]!,
                  value = result.devices[id]!;
                return (
                  <tr key={id}>
                    <th scope="row">
                      <label>
                        <input
                          type="checkbox"
                          aria-label={`${device.label} im Szenario einschalten`}
                          checked={value.state === "on"}
                          onChange={(e) =>
                            update((draft) => {
                              draft.deviceStates[id] = e.target.checked ? "on" : "off";
                            })
                          }
                        />
                        {device.label} · {device.name}
                      </label>
                    </th>
                    <td>
                      {simulationStatus[value.status]}
                      {value.issues.map((issue) => (
                        <small key={issue}>{issue}</small>
                      ))}
                    </td>
                    <td>{simulationNumber(value.voltage, "V", 0)}</td>
                    <td>{simulationNumber(value.power, "W", 0)}</td>
                    <td>
                      {simulationNumber(value.current, "A")}
                      {value.estimated && <small>cos φ = 1 angenommen</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
