import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { switchControl, switchRole } from "../../electrical/switchingControls";

export function SimulationSwitches() {
  const project = useProjectStore((state) => state.project);
  const { scenario, operate, result } = useSimulationStore();
  const switches = Object.values(project.electrical.switches);
  if (!switches.length) return null;
  return (
    <section aria-label="Lichtschalter im Szenario">
      <h3>Lichtschalter</h3>
      {switches.map((item) => {
        const closed = scenario.switchStates[item.id] ?? item.closed;
        const group = switchControl(project, item.id);
        const count = result?.nodes[item.id]?.deviceIds.length ?? 0;
        return (
          <fieldset key={item.id}>
            <legend>
              {item.label} · {item.name}
            </legend>
            {group?.mode === "impulseRelay" ? (
              <button onClick={() => operate(item.id)}>{item.label} · Tastimpuls</button>
            ) : (
              <label>
                <input
                  type="checkbox"
                  aria-label={`${item.label} Lichtschalter geschlossen`}
                  checked={closed}
                  onChange={() => operate(item.id)}
                />
                {group
                  ? `${switchRole(project, item.id)} · Stellung ${closed ? "I" : "II"}`
                  : closed
                    ? "Ein (geschlossen)"
                    : "Aus (offen)"}
              </label>
            )}
            {group && <p>Schaltgruppe: {group.label}</p>}
            <p>{count ? `${count} zugeordnete Verbraucher` : "Keine Verbraucher zugeordnet"}</p>
            {item.supply.kind === "switch" && (
              <p>In Reihe nach {project.electrical.switches[item.supply.switchId]!.label}</p>
            )}
            {closed && !result?.nodes[item.id]?.availablePhases.length && (
              <p>Keine Versorgung am Schalter.</p>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
