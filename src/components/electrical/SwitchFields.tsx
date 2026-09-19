import { usePropertyFields } from "../properties/usePropertyFields";
import { SelectField } from "./ElectricalFields";
import { circuitOptionLabel } from "../../electrical/supply";
import { useSimulationStore } from "../../stores/simulationStore";
import { SwitchSupplyFields } from "./SwitchSupplyFields";
import { switchControl, switchRole } from "../../electrical/switchingControls";

export function SwitchFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "switches", id });
  const item = project.electrical.switches[id]!;
  const simulation = useSimulationStore();
  const group = switchControl(project, id);
  const scenarioClosed = simulation.scenario.switchStates[id] ?? item.closed;
  const devices = Object.values(project.electrical.devices);
  const assigned = devices.filter((device) => device.switchId === id);
  const eligible = devices.filter(
    (device) =>
      device.switchId === id ||
      (item.circuitId &&
        device.circuitId === item.circuitId &&
        !device.connectionPointId &&
        device.phases === 1),
  );
  return (
    <>
      {simulation.active && (
        <div className="simulation-note">
          <p>Simulation: {group ? switchRole(project, id) : `Schalter ${scenarioClosed ? "ein" : "aus"}`}</p>
          <button onClick={() => simulation.operate(id)}>
            {group?.mode === "impulseRelay"
              ? "Tastimpuls auslösen"
              : group
                ? "Schalter umlegen"
                : `Im Szenario ${scenarioClosed ? "ausschalten" : "einschalten"}`}
          </button>
        </div>
      )}
      <p className="field-hint">
        {group
          ? `${switchRole(project, id)} in ${group.label}. Zuordnung und Verbraucher an der Schaltgruppe bearbeiten.`
          : "Ein-/Aus-Schalter. Für mehrere Schaltstellen eine Wechsel-/Kreuzschaltung oder ein Stromstoßrelais platzieren und diesen Schalter dort zuordnen."}
      </p>
      <SelectField
        label="Schalter-Stromkreis"
        value={item.circuitId ?? ""}
        disabled={locked || !!group || assigned.length > 0}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.switches[id]!.circuitId = value || null;
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.circuits).map((circuit) => (
          <option key={circuit.id} value={circuit.id}>
            {circuitOptionLabel(project, circuit.id)}
          </option>
        ))}
      </SelectField>
      {!!assigned.length && (
        <p className="field-hint">Zum Wechsel des Stromkreises zuerst die Verbraucherzuordnungen lösen.</p>
      )}
      {group?.mode !== "impulseRelay" && (
        <SelectField
          label="Dokumentierte Schalterstellung"
          value={item.closed ? "closed" : "open"}
          disabled={locked}
          onChange={(value) =>
            change((draft) => {
              draft.electrical.switches[id]!.closed = value === "closed";
            })
          }
        >
          <option value="closed">{group ? "Stellung I" : "Ein (geschlossen)"}</option>
          <option value="open">{group ? "Stellung II" : "Aus (offen)"}</option>
        </SelectField>
      )}
      {!group && <SwitchSupplyFields id={id} />}
      {!group && (
        <fieldset className="switch-targets">
          <legend>Geschaltete Lampen / Verbraucher</legend>
          {eligible.map((device) => (
            <label key={device.id}>
              <input
                type="checkbox"
                checked={device.switchId === id}
                disabled={
                  locked ||
                  project.layers[device.layerId]!.locked ||
                  !!device.controlId ||
                  (!!device.switchId && device.switchId !== id)
                }
                onChange={(event) =>
                  change((draft) => {
                    draft.electrical.devices[device.id]!.switchId = event.target.checked ? id : null;
                  })
                }
              />
              {device.label} · {device.name}
              {device.switchId && device.switchId !== id ? " (anderer Schalter)" : ""}
            </label>
          ))}
          {!eligible.length && (
            <p className="field-hint">
              Zuerst den Schalter und eine einphasige Lampe demselben Stromkreis zuordnen. An der Lampe
              „Festanschluss an Stromkreis“ wählen.
            </p>
          )}
        </fieldset>
      )}
      <p className="field-hint">
        In der Simulation schaltet dieser Kontakt alle zugeordneten Geräte. Deren eigener Betriebszustand
        bleibt erhalten. Für Lampen normalerweise „Ein“ wählen.
      </p>
      <p className="field-hint">
        Wandbezug: {item.wallId ? "Wand an dieser Position" : "Keine Wand an dieser Position"}
      </p>
    </>
  );
}
