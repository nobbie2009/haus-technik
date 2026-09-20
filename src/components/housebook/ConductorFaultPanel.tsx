import { useState } from "react";
import type { ConductorResult } from "../../simulation/conductors";
import type { ConductorFault } from "../../simulation/models";
import { useProjectStore } from "../../stores/projectStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { Field } from "./shared";

export function ConductorFaultPanel({ result }: { result: ConductorResult }) {
  const project = useProjectStore((s) => s.project);
  const simulation = useSimulationStore();
  const devices = Object.values(project.electrical.devices).filter((d) => d.phases === 1 && !d.transformerId);
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [kind, setKind] = useState<ConductorFault["kind"]>("line-pe");
  const [resistance, setResistance] = useState("4600");
  return (
    <section aria-label="Fehlerstrom-Szenario">
      <h4>Fehlerstrom und FI/RCD</h4>
      <p>
        Ein angenommener Fehler am Geräteeingang. I = U / R verwendet den eingegebenen Gesamtwiderstand des
        Fehlerkreises. L–PE benötigt einen dokumentierten Schutzleiter-Rückweg zur selben Quelle. L–N fließt
        über den Neutralleiter zurück. Die Betriebsart des Verbrauchers trennt diesen Fehler nicht.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const resistanceOhms = Number(resistance);
          if (
            !devices.some((d) => d.id === deviceId) ||
            !Number.isFinite(resistanceOhms) ||
            resistanceOhms < 0.001 ||
            resistanceOhms > 1e9
          )
            return;
          simulation.update((s) => {
            s.conductorFaults = [
              ...(s.conductorFaults ?? []).filter((f) => f.deviceId !== deviceId),
              { deviceId, kind, resistanceOhms },
            ];
          });
        }}
      >
        <div className="book-grid">
          <Field label="Fehlerort">
            <select required value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              {!devices.length && <option value="">Keine einphasigen Netzverbraucher</option>}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} · {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fehlerart">
            <select value={kind} onChange={(e) => setKind(e.target.value as ConductorFault["kind"])}>
              <option value="line-pe">L–PE · Fehler gegen Schutzleiter</option>
              <option value="line-neutral">L–N · Fehler gegen Neutralleiter</option>
            </select>
          </Field>
          <Field label="Gesamtwiderstand des Fehlerkreises (Ω)">
            <input
              required
              type="number"
              min="0.001"
              max="1000000000"
              step="any"
              value={resistance}
              onChange={(e) => setResistance(e.target.value)}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={
            !devices.length ||
            (result.faults.length >= 100 && !result.faults.some((f) => f.deviceId === deviceId))
          }
        >
          Fehler simulieren
        </button>
      </form>
      {result.faults.map((fault, index) => (
        <article className="book-card" key={`${fault.deviceId}-${index}`}>
          <h4>
            {project.electrical.devices[fault.deviceId]?.name ?? "Gelöschter Verbraucher"} ·{" "}
            {fault.kind === "line-pe" ? "L–PE" : "L–N"}
          </h4>
          <p>
            Fehlerstrom vor Abschaltung:{" "}
            {fault.initialCurrent === null ? "Unbestimmt" : `${(fault.initialCurrent * 1000).toFixed(2)} mA`}
            {" · "}Nach Schutzreaktion:{" "}
            {fault.current === null ? "Unbestimmt" : `${(fault.current * 1000).toFixed(2)} mA`}
          </p>
          <p role="status">
            {
              {
                active: "Fehler weiterhin aktiv",
                cleared: "Im Modell abgeschaltet",
                unpowered: "Kein aktiver Außenleiter",
                incomplete: "Nicht berechenbar",
              }[fault.status]
            }
          </p>
          {fault.issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
          <button
            aria-label={`Fehler bei ${project.electrical.devices[fault.deviceId]?.name ?? "Verbraucher"} entfernen`}
            onClick={() =>
              simulation.update((s) => {
                s.conductorFaults = (s.conductorFaults ?? []).filter((_, i) => i !== index);
              })
            }
          >
            Fehler entfernen
          </button>
        </article>
      ))}
      {!!result.protections.length && (
        <table className="book-table">
          <thead>
            <tr>
              <th>FI/RCD</th>
              <th>Differenzstrom</th>
              <th>Schwelle</th>
              <th>Modellreaktion</th>
            </tr>
          </thead>
          <tbody>
            {result.protections.map((p) => (
              <tr key={p.id}>
                <td>{project.electrical.protectionDevices[p.id]!.label}</td>
                <td>{p.residualMilliAmps.toFixed(2)} mA</td>
                <td>{p.thresholdMilliAmps ?? "?"} mA</td>
                <td>
                  {{ trip: "Abgeschaltet", below: "Unter Modellschwelle", uncertain: "Unbestimmt" }[p.status]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        Die FI-Modellschwelle ist der dokumentierte IΔn-Wert. Differenzströme der Fehler werden je Phase
        zusammengeführt. Alle erreichten Schwellen schalten gleichzeitig ab; keine Zeitkennlinien,
        Selektivität oder LS-/Schmelzsicherungsauslösung. Unterhalb der Modellschwelle wird eine reale
        Auslösung nicht ausgeschlossen. Beim Entfernen eines Fehlers wird neu berechnet.
      </p>
    </section>
  );
}
