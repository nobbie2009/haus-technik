import { usePropertyFields } from "../properties/usePropertyFields";
import { SelectField } from "./ElectricalFields";
import { circuitOptionLabel } from "../../electrical/supply";
import { switchControl, switchRole, controlClosed } from "../../electrical/switchingControls";
import { useSimulationStore } from "../../stores/simulationStore";

export function ControlFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "controls", id });
  const group = project.electrical.controls[id]!;
  const simulation = useSimulationStore();
  const devices = Object.values(project.electrical.devices);
  return (
    <>
      <SelectField
        label="Schaltungsart"
        value={group.mode}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.controls[id]!.mode = value as typeof group.mode;
          })
        }
      >
        <option value="changeover">Wechsel- / Kreuzschaltung</option>
        <option value="impulseRelay">Stromstoßrelais mit Tastern</option>
      </SelectField>
      <SelectField
        label="Schaltungs-Stromkreis"
        value={group.circuitId ?? ""}
        disabled={locked || !!group.switchIds.length || devices.some((d) => d.controlId === id)}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.controls[id]!.circuitId = value || null;
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.circuits).map((c) => (
          <option key={c.id} value={c.id}>
            {circuitOptionLabel(project, c.id)}
          </option>
        ))}
      </SelectField>
      <p className="field-hint">
        {group.mode === "changeover"
          ? "Mindestens zwei Schalter wählen. Erster und letzter sind Wechselschalter, weitere dazwischen Kreuzschalter. Jede Betätigung wechselt den Lichtzustand."
          : "Mindestens einen Taster wählen. Jeder Tastimpuls schaltet das bistabile Relais um. Die Tasterstellung wird nicht gespeichert."}
      </p>
      <fieldset className="switch-targets">
        <legend>Schaltstellen zuordnen</legend>
        {Object.values(project.electrical.switches)
          .filter((s) => !!group.circuitId && s.circuitId === group.circuitId)
          .map((s) => {
            const assigned = switchControl(project, s.id);
            return (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={group.switchIds.includes(s.id)}
                  disabled={locked || project.layers[s.layerId]!.locked || (!!assigned && assigned.id !== id)}
                  onChange={(event) =>
                    change((draft) => {
                      const g = draft.electrical.controls[id]!;
                      g.switchIds = event.target.checked
                        ? [...g.switchIds, s.id]
                        : g.switchIds.filter((v) => v !== s.id);
                    })
                  }
                />
                {s.label} · {project.floors[s.floorId]!.name}
                {assigned ? ` · ${switchRole(project, s.id)}` : ""}
              </label>
            );
          })}
      </fieldset>
      <p className="switch-chain">
        {group.switchIds.map((s) => project.electrical.switches[s]!.label).join(" → ") ||
          "Noch keine Schaltstellen. Zuerst Lichtschalter platzieren und demselben Stromkreis zuordnen."}
      </p>
      <SelectField
        label={group.mode === "changeover" ? "Korrespondierende Pfade" : "Dokumentierter Relaiszustand"}
        value={String(group.mode === "changeover" ? group.inverted : group.initialOn)}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            const g = draft.electrical.controls[id]!;
            if (g.mode === "changeover") g.inverted = value === "true";
            else g.initialOn = value === "true";
          })
        }
      >
        <option value="false">{group.mode === "changeover" ? "Gleich verbunden" : "Aus"}</option>
        <option value="true">{group.mode === "changeover" ? "Vertauscht" : "Ein"}</option>
      </SelectField>
      <fieldset className="switch-targets">
        <legend>Gemeinsam geschaltete Verbraucher</legend>
        {devices
          .filter(
            (d) =>
              group.circuitId && d.circuitId === group.circuitId && d.phases === 1 && !d.connectionPointId,
          )
          .map((d) => (
            <label key={d.id}>
              <input
                type="checkbox"
                checked={d.controlId === id}
                disabled={
                  locked ||
                  project.layers[d.layerId]!.locked ||
                  !!d.switchId ||
                  (!!d.controlId && d.controlId !== id)
                }
                onChange={(event) =>
                  change((draft) => {
                    draft.electrical.devices[d.id]!.controlId = event.target.checked ? id : null;
                  })
                }
              />
              {d.label} · {d.name}
            </label>
          ))}
      </fieldset>
      {simulation.active && (
        <p role="status">
          Ausgang: {controlClosed(project, group, simulation.scenario) ? "geschlossen" : "offen"} ·{" "}
          {simulation.result?.nodes[id]?.availablePhases.length ? "versorgt" : "ohne Ausgangsversorgung"}
        </p>
      )}
      <p className="field-hint">
        Funktionale Schaltgruppe mit idealen Kontakten. Kontaktbelegungen dokumentieren den Leitungsplan
        separat. Bei Stromstoßrelais wird die Steuerung aus demselben Stromkreis versorgt.
      </p>
    </>
  );
}
