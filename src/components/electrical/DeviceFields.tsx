import { usePropertyFields } from "../properties/usePropertyFields";
import { NumberField, SelectField } from "./ElectricalFields";
import { TextField } from "../Fields";
import { deviceCircuitId } from "../../electrical/selectors";
import { circuitOptionLabel } from "../../electrical/supply";
import { switchChain } from "../../electrical/switchTopology";
import { switchControl } from "../../electrical/switchingControls";
import { DeviceControlFields } from "./DeviceControlFields";
import { ConsumerFields } from "./ConsumerFields";
import { deviceSymbolKind } from "../../rendering/deviceAppearance";

export function DeviceFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "devices", id });
  const device = project.electrical.devices[id]!;
  const circuitId = deviceCircuitId(project, device);
  return (
    <>
      <label className="connection-assignment">
        <input
          type="checkbox"
          checked={device.metadata.hasProtectiveEarth !== false}
          disabled={locked}
          onChange={(e) =>
            change((d) => {
              d.electrical.devices[id]!.metadata.hasProtectiveEarth = e.target.checked;
            })
          }
        />
        PE-Anschluss vorhanden
      </label>
      <ConsumerFields id={id} />
      <TextField
        label="Gerätetyp"
        value={device.type}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.type = value;
          })
        }
      />
      <SelectField
        label="Symbol im Plan"
        value={
          device.metadata.electricalSymbol === "lamp" || device.metadata.electricalSymbol === "device"
            ? device.metadata.electricalSymbol
            : "auto"
        }
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            if (value === "auto") delete draft.electrical.devices[id]!.metadata.electricalSymbol;
            else draft.electrical.devices[id]!.metadata.electricalSymbol = value;
          })
        }
      >
        <option value="auto">Automatisch nach Typ / Lichtname</option>
        <option value="lamp">Lampe mit Lichtschein</option>
        <option value="device">Verbraucher mit Betriebsanzeige</option>
      </SelectField>
      <SelectField
        label="Anschluss"
        value={
          device.connectionPointId
            ? `outlet:${device.connectionPointId}`
            : device.circuitId
              ? `circuit:${device.circuitId}`
              : ""
        }
        disabled={locked || device.metadata.wiringManaged === true}
        onChange={(value) =>
          change((draft) => {
            const item = draft.electrical.devices[id]!;
            item.connectionPointId = value.startsWith("outlet:") ? value.slice(7) : null;
            item.circuitId = value.startsWith("circuit:") ? value.slice(8) : null;
          })
        }
      >
        <option value="">Nicht angeschlossen</option>
        <optgroup label="Steckdosen">
          {Object.values(project.electrical.outlets).map((outlet) => (
            <option key={outlet.id} value={`outlet:${outlet.id}`}>
              {outlet.label} · {outlet.name} · {project.floors[outlet.floorId]!.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Festanschluss an Stromkreis">
          {Object.values(project.electrical.circuits).map((circuit) => (
            <option key={circuit.id} value={`circuit:${circuit.id}`}>
              {circuitOptionLabel(project, circuit.id)}
            </option>
          ))}
        </optgroup>
      </SelectField>
      <p className="field-hint">
        Stromkreis: {circuitId ? project.electrical.circuits[circuitId]!.name : "Nicht zugeordnet"}
      </p>
      <SelectField
        label="Lichtschalter"
        value={device.switchId ?? ""}
        disabled={
          locked ||
          device.metadata.wiringManaged === true ||
          !!device.controlId ||
          !device.circuitId ||
          !!device.connectionPointId ||
          device.phases !== 1
        }
        onChange={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.switchId = value || null;
          })
        }
      >
        <option value="">Kein Lichtschalter</option>
        {Object.values(project.electrical.switches)
          .filter(
            (item) =>
              item.circuitId === device.circuitId && !!item.circuitId && !switchControl(project, item.id),
          )
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.name}
            </option>
          ))}
      </SelectField>
      <p className="field-hint">
        {device.metadata.wiringManaged === true
          ? "Anschluss und Lichtschalter werden aus den Leitungen übernommen. Zum Ändern die Anschlussleitung bearbeiten."
          : "Zum Anschließen eine Leitung zur Steckdose oder zum Lichtschalter zeichnen. Stromkreis und Simulation werden gemeinsam übernommen."}
      </p>
      <DeviceControlFields id={id} />
      {device.switchId && (
        <p className="switch-chain" aria-label="Schalterkette des Verbrauchers">
          {switchChain(project, device.switchId)
            .switches.map((item) => item.label || item.name)
            .join(" → ")}{" "}
          → {device.label || device.name}
          <br />
          Alle Schalter müssen geschlossen sein.
        </p>
      )}
      <SelectField
        label="Möbelbezug"
        value={device.furnitureId ?? ""}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.furnitureId = value || null;
          })
        }
      >
        <option value="">Eigenständiges Gerät</option>
        {Object.values(project.furniture)
          .filter((item) => item.floorId === device.floorId)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </SelectField>
      {(
        [
          ["ratedPower", "Nennleistung (W)"],
          ["ratedVoltage", "Nennspannung (V)"],
          ["ratedCurrent", "Nennstrom (A)"],
          ["powerFactor", "Leistungsfaktor cos φ"],
        ] as const
      ).map(([key, label]) => (
        <NumberField
          key={key}
          label={label}
          value={device[key]}
          disabled={locked}
          onCommit={(value) =>
            change((draft) => {
              draft.electrical.devices[id]![key] = value;
            })
          }
        />
      ))}
      <SelectField
        label="Phasen"
        value={String(device.phases)}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical.devices[id]!.phases = Number(value) as 1 | 3;
          })
        }
      >
        <option value="1">Einphasig</option>
        <option value="3">Dreiphasig</option>
      </SelectField>
      {deviceSymbolKind(device) === "lamp" ? (
        <p className="field-hint">
          Die Lampe folgt ihrer Versorgung und dem Lichtschalter. Neue Lampen starten mit 5 W; der Wert ist
          frei änderbar.
        </p>
      ) : (
        <SelectField
          label="Dokumentierter Betriebszustand"
          value={device.operatingMode}
          disabled={locked}
          onChange={(value) =>
            change((draft) => {
              draft.electrical.devices[id]!.operatingMode = value as typeof device.operatingMode;
            })
          }
        >
          <option value="off">Aus</option>
          <option value="on">Ein</option>
          <option value="standby">Standby</option>
        </SelectField>
      )}
    </>
  );
}
