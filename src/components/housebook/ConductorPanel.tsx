import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { emptyScenario } from "../../simulation/models";
import { solveConductors } from "../../simulation/conductors";
import { focusObject } from "../../housebook/navigation";
export function ConductorPanel({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    simulation = useSimulationStore();
  const scenario = simulation.active ? simulation.scenario : emptyScenario(),
    result = solveConductors(project, scenario);
  const toggle = (id: string) =>
    simulation.update((s) => {
      s.disabledNodeIds = s.disabledNodeIds.includes(id)
        ? s.disabledNodeIds.filter((v) => v !== id)
        : [...s.disabledNodeIds, id];
    });
  return (
    <section>
      <h3>Leiterprüfung</h3>
      <p>
        Diese separate Berechnung verfolgt die ausdrücklich verbundenen Kontakte der Kabel. Eine logische
        Stromkreiszuordnung allein versorgt hier keinen Verbraucher. Einspeisung, Zähler, Verteilerabgänge,
        einfache Schalter, Wechsel-/Kreuzkontakte und ideale Trafos werden berücksichtigt.
      </p>
      <p>
        {result.contacts} Kontakte · {result.connections} dokumentierte Aderverbindungen. Keine
        Leitungswiderstände, Kurzschlussströme oder Auslösezeiten. Stromstoßrelais-Steuerkreise werden in
        dieser Leiterprüfung noch nicht ausgewertet; ihre funktionale Simulation bleibt im Versorgungsszenario
        verfügbar.
      </p>
      <details>
        <summary>Einspeisungen und Leitungen im Szenario unterbrechen</summary>
        <ul className="book-list">
          {[...Object.values(project.electrical.supplies), ...Object.values(project.electrical.cables)].map(
            (item) => (
              <li key={item.id}>
                <span>{item.label || item.name}</span>
                <button
                  aria-pressed={scenario.disabledNodeIds.includes(item.id)}
                  onClick={() => toggle(item.id)}
                >
                  {scenario.disabledNodeIds.includes(item.id) ? "Wieder verbinden" : "Unterbrechen"}
                </button>
              </li>
            ),
          )}
        </ul>
      </details>
      <details>
        <summary>Schalterstellungen testen</summary>
        <ul className="book-list">
          {Object.values(project.electrical.switches).map((item) => (
            <li key={item.id}>
              <span>
                {item.label} · {item.name}
              </span>
              <button
                aria-pressed={scenario.switchStates[item.id] ?? item.closed}
                onClick={() =>
                  simulation.update((s) => {
                    s.switchStates[item.id] = !(s.switchStates[item.id] ?? item.closed);
                  })
                }
              >
                Stellung {(scenario.switchStates[item.id] ?? item.closed) ? "1" : "2"}
              </button>
            </li>
          ))}
        </ul>
      </details>
      {result.issues.map((issue, i) => (
        <p role="alert" key={i}>
          {issue}
        </p>
      ))}
      <table className="book-table">
        <thead>
          <tr>
            <th>Verbraucher</th>
            <th>Leiterzustand</th>
            <th>Spannung / Strom</th>
            <th>Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {result.devices.map((d) => (
            <tr key={d.id}>
              <td>
                <button
                  onClick={() => {
                    if (focusObject({ kind: "devices", id: d.id })) onClose();
                  }}
                >
                  {project.electrical.devices[d.id]!.name}
                </button>
              </td>
              <td>
                {
                  {
                    running: "In Betrieb",
                    off: "Aus",
                    unpowered: "Nicht versorgt",
                    incomplete: "Unvollständig",
                  }[d.status]
                }
              </td>
              <td>
                {d.voltage?.toFixed(1) ?? "?"} V / {d.current?.toFixed(2) ?? "?"} A
                {d.estimated ? " (Schätzung)" : ""}
              </td>
              <td>{d.issues.join(" ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
