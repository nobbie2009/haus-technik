import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { phases } from "../../simulation/models";
import { simulationNumber } from "./format";
import { SimulationSwitches } from "./SimulationSwitches";

export function SimulationControls() {
  const project = useProjectStore((s) => s.project);
  const { scenario, update, result } = useSimulationStore();
  const toggle = (id: string, enabled: boolean) =>
    update((draft) => {
      draft.disabledNodeIds = enabled
        ? draft.disabledNodeIds.filter((item) => item !== id)
        : [...draft.disabledNodeIds, id];
    });
  return (
    <aside className="simulation-controls" aria-label="Szenarioschalter">
      <SimulationSwitches />
      <h3>Einspeisung und Phasen</h3>
      {!Object.keys(project.electrical.supplies).length && (
        <p>Im Elektrik-Tab zuerst einen Einspeisepunkt platzieren und dem Sicherungskasten zuordnen.</p>
      )}
      {Object.values(project.electrical.supplies).map((supply) => (
        <fieldset key={supply.id} className={result?.nodes[supply.id]?.overload ? "simulation-overload" : ""}>
          <legend>
            {supply.label} · {supply.name}
          </legend>
          <label>
            <input
              type="checkbox"
              aria-label={`${supply.label} Einspeisung aktiv`}
              checked={!scenario.disabledNodeIds.includes(supply.id)}
              onChange={(e) => toggle(supply.id, e.target.checked)}
            />{" "}
            Einspeisung aktiv
          </label>
          <div className="simulation-phases">
            {phases
              .filter((phase) => supply.phases === 3 || phase === "L1")
              .map((phase) => (
                <label key={phase}>
                  <input
                    type="checkbox"
                    aria-label={`${supply.label} ${phase} aktiv`}
                    checked={!scenario.disabledPhases[supply.id]?.includes(phase)}
                    onChange={(e) =>
                      update((draft) => {
                        const off = draft.disabledPhases[supply.id] ?? [];
                        draft.disabledPhases[supply.id] = e.target.checked
                          ? off.filter((p) => p !== phase)
                          : [...off, phase];
                      })
                    }
                  />
                  {phase}
                </label>
              ))}
          </div>
          {result?.nodes[supply.id] && (
            <p>
              {simulationNumber(result.nodes[supply.id]!.maxCurrent, "A")} max. je Phase ·{" "}
              {simulationNumber(result.nodes[supply.id]!.utilization, "%", 1)} der Anschlusskapazität
            </p>
          )}
          {result?.nodes[supply.id]?.overload && <strong>Anschlusskapazität überschritten</strong>}
          {!!result?.nodes[supply.id]?.incompleteCount && <p>Lastdaten unvollständig.</p>}
        </fieldset>
      ))}
      <h3>Schutzgeräte</h3>
      {!Object.keys(project.electrical.protectionDevices).length && (
        <p>Noch keine Schutzgeräte dokumentiert.</p>
      )}
      {Object.values(project.electrical.protectionDevices).map((item) => {
        const load = result?.nodes[item.id];
        return (
          <fieldset key={item.id} className={load?.overload ? "simulation-overload" : ""}>
            <legend>
              {item.label} · {item.type} · {item.ratedCurrent ?? "?"} A
            </legend>
            <label>
              <input
                type="checkbox"
                aria-label={`${item.label} geschlossen`}
                checked={!scenario.disabledNodeIds.includes(item.id)}
                onChange={(e) => toggle(item.id, e.target.checked)}
              />{" "}
              Geschlossen
            </label>
            <p>
              {project.electrical.distributionBoards[item.distributionBoardId]!.label} ·{" "}
              {simulationNumber(load?.maxCurrent ?? null, "A")} ·{" "}
              <output aria-label={`${item.label} Auslastung`}>
                {simulationNumber(load?.utilization ?? null, "%", 1)}
              </output>
            </p>
            {load?.overload && (
              <strong>
                Nennstrom überschritten{load.incompleteCount ? " (bereits mit bekannten Lasten)" : ""}
              </strong>
            )}
            {item.type === "RCD" && <p>Belastbarkeit des FI, keine Fehlerstrom-/Auslösesimulation.</p>}
            {!!load?.incompleteCount && <p>{load.incompleteCount} Lasten unvollständig.</p>}
          </fieldset>
        );
      })}
    </aside>
  );
}
