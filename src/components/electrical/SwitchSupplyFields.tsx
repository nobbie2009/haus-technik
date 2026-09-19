import { usePropertyFields } from "../properties/usePropertyFields";
import { SelectField } from "./ElectricalFields";
import { setSwitchSupply, switchChain } from "../../electrical/switchTopology";

export function SwitchSupplyFields({ id }: { id: string }) {
  const { project, locked, change } = usePropertyFields({ kind: "switches", id });
  const item = project.electrical.switches[id]!;
  const chain = switchChain(project, id).switches;
  const children = Object.values(project.electrical.switches).filter(
    (entry) => entry.supply.kind === "switch" && entry.supply.switchId === id,
  );
  return (
    <>
      <SelectField
        label="Schalterversorgung / Reihenschaltung"
        value={item.supply.kind === "switch" ? item.supply.switchId : item.supply.kind}
        disabled={locked}
        onChange={(value) =>
          change((draft) =>
            setSwitchSupply(
              draft,
              id,
              value === "circuit" || value === "disconnected"
                ? { kind: value }
                : { kind: "switch", switchId: value },
            ),
          )
        }
      >
        <option value="circuit">Direkt aus dem Stromkreis</option>
        <option value="disconnected">Nicht angeschlossen</option>
        {Object.values(project.electrical.switches)
          .filter(
            (source) =>
              source.id !== id &&
              !!source.circuitId &&
              (!item.circuitId || source.circuitId === item.circuitId) &&
              !switchChain(project, source.id).switches.some((entry) => entry.id === id),
          )
          .map((source) => (
            <option key={source.id} value={source.id}>
              Nach {source.label} · {source.name}
            </option>
          ))}
      </SelectField>
      <p className="field-hint">
        Reihenschaltung: Alle Schalter der Kette müssen geschlossen sein. Der Verbraucher wird dem letzten
        Schalter zugeordnet.
      </p>
      {chain.length > 1 && (
        <p className="switch-chain" aria-label="Schalterkette">
          {chain.map((entry) => entry.label || entry.name).join(" → ")}
        </p>
      )}
      {!!children.length && (
        <p className="field-hint">
          Nachgeschaltet: {children.map((entry) => entry.label || entry.name).join(", ")}
        </p>
      )}
    </>
  );
}
