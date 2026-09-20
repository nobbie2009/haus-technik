import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { emptyScenario } from "../../simulation/models";
import { solveConductors, pulseConductorSwitch } from "../../simulation/conductors";
import { switchRole } from "../../electrical/switchingControls";
import { ConductorFaultPanel } from "./ConductorFaultPanel";
import { useState } from "react";
import { focusObject } from "../../housebook/navigation";
export function ConductorPanel({ onClose }: { onClose: () => void }) {
  const [pulseMessage, setPulseMessage] = useState("");
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
        einfache Schalter, Wechsel-/Kreuzkontakte, verdrahtete Taster und Stromstoßrelais sowie ideale Trafos
        werden berücksichtigt.
      </p>
      <p>
        {result.contacts} Kontakte · {result.connections} dokumentierte Aderverbindungen. Keine automatisch
        ermittelten Leitungsimpedanzen oder Auslösezeiten. Fehlerströme verwenden einen ausdrücklich
        vorgegebenen Gesamtwiderstand. Diese Ergebnisse gelten für die Leiterprüfung; die Plananzeige und die
        Lastübersicht verwenden weiterhin das funktionale Versorgungsszenario.
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
          {Object.values(project.electrical.switches).map((item) =>
            switchRole(project, item.id) === "Taster" ? (
              <li key={item.id}>
                <span>
                  {item.label} · {item.name}
                </span>
                <button
                  disabled={scenario.disabledNodeIds.includes(item.id)}
                  onClick={() =>
                    simulation.update((s) => {
                      const changed = pulseConductorSwitch(project, s, item.id);
                      setPulseMessage(
                        changed.length
                          ? `${changed.length} Relais durch verdrahteten Tastimpuls umgeschaltet.`
                          : "Keine neue Spulenspannung: Verdrahtung und Versorgung prüfen.",
                      );
                    })
                  }
                >
                  Tastimpuls · {item.label || item.name}
                </button>
              </li>
            ) : (
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
            ),
          )}
        </ul>
      </details>
      {pulseMessage && <p role="status">{pulseMessage}</p>}
      {!!result.relays.length && (
        <div>
          <h4>Stromstoßrelais</h4>
          <p>
            Ideale bistabile Kontakte: Eine neue Spannung an A1/A2 schaltet um. Spulennennspannung,
            Anzugszeiten und Spulenleistung sind nicht modelliert.
          </p>
          <ul className="book-list">
            {result.relays.map((relay) => (
              <li key={relay.id}>
                <span>
                  {project.electrical.controls[relay.id]!.label} ·{" "}
                  {relay.closed ? "Kontakt geschlossen" : "Kontakt offen"} · Spule{" "}
                  {relay.coilVoltage === null ? "nicht versorgt" : `${relay.coilVoltage.toFixed(1)} V`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConductorFaultPanel result={result} />
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
