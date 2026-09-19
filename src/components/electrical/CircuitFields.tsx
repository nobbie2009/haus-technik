import { useProjectStore } from "../../stores/projectStore";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "./ElectricalFields";
import { ProtectionFields } from "./ProtectionFields";
import { deleteCircuit } from "../../electrical/actions";
import { CircuitInventory } from "./CircuitInventory";
import type { ElectricalTarget } from "../../editor/interaction/focusElectrical";
import { addProtectionDevice, assignCircuitProtection } from "../../electrical/boardActions";
import { circuitSupply } from "../../electrical/supply";
import { SupplySummary } from "./SupplySummary";

export function CircuitFields({
  id,
  onShow,
  onBoardChange,
}: {
  id: string;
  onShow: (target: ElectricalTarget) => void;
  onBoardChange: (id: string) => void;
}) {
  const project = useProjectStore((s) => s.project);
  const commit = useProjectStore((s) => s.commit);
  const circuit = project.electrical.circuits[id]!;
  const board = project.electrical.distributionBoards[circuit.distributionBoardId]!;
  const locked = project.layers[board.layerId]!.locked;
  const supply = circuitSupply(project, id, circuit.phase === "L1/L2/L3" ? 3 : 1);
  return (
    <div className="circuit-fields">
      {locked && <p className="locked-note">Elektrikebene gesperrt</p>}
      <TextField
        label="Stromkreisname"
        value={circuit.name}
        disabled={locked}
        onCommit={(value) =>
          commit("Stromkreis bearbeiten", (draft) => {
            draft.electrical.circuits[id]!.name = value;
          })
        }
      />
      <TextField
        label="Stromkreiskennzeichnung"
        value={circuit.label}
        disabled={locked}
        onCommit={(value) =>
          commit("Stromkreis bearbeiten", (draft) => {
            draft.electrical.circuits[id]!.label = value;
          })
        }
      />
      <SelectField
        label="Verteilerzuordnung"
        value={board.id}
        disabled={locked}
        onChange={(value) => {
          if (
            commit("Stromkreis umhängen", (draft) => {
              draft.electrical.circuits[id]!.distributionBoardId = value;
              draft.electrical.circuits[id]!.protectionDeviceId = null;
            })
          )
            onBoardChange(value);
        }}
      >
        {Object.values(project.electrical.distributionBoards).map((item) => (
          <option key={item.id} value={item.id} disabled={project.layers[item.layerId]!.locked}>
            {item.label} · {item.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Phase"
        value={circuit.phase}
        disabled={locked}
        onChange={(value) =>
          commit("Stromkreis bearbeiten", (draft) => {
            draft.electrical.circuits[id]!.phase = value as typeof circuit.phase;
          })
        }
      >
        {["unknown", "L1", "L2", "L3", "L1/L2/L3"].map((value) => (
          <option key={value} value={value}>
            {value === "unknown" ? "Unbekannt" : value}
          </option>
        ))}
      </SelectField>
      <NumberField
        label="Stromkreisspannung (V)"
        value={circuit.nominalVoltage ?? supply.voltage}
        hint="Leer = automatisch. Bei zugeordneter Einspeisung gilt deren Spannung; Abweichungen werden angezeigt."
        disabled={locked}
        onCommit={(value) =>
          commit("Stromkreis bearbeiten", (draft) => {
            draft.electrical.circuits[id]!.nominalVoltage = value;
          })
        }
      />
      <SelectField
        label="Schutzgerät"
        value={circuit.protectionDeviceId ?? ""}
        disabled={locked}
        onChange={(value) =>
          commit("Schutzgerät zuordnen", (draft) => {
            assignCircuitProtection(draft, id, value || null);
          })
        }
      >
        <option value="">Nicht zugeordnet</option>
        {Object.values(project.electrical.protectionDevices)
          .filter((item) => item.distributionBoardId === board.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.type}
            </option>
          ))}
      </SelectField>
      <button
        disabled={locked}
        onClick={() =>
          commit("Schutzgerät anlegen", (draft) => {
            const protectionId = addProtectionDevice(draft, board.id);
            draft.electrical.circuits[id]!.protectionDeviceId = protectionId;
          })
        }
      >
        Neues Schutzgerät
      </button>
      {circuit.protectionDeviceId && <ProtectionFields id={circuit.protectionDeviceId} locked={locked} />}
      <SupplySummary data={supply} />
      <CircuitInventory id={id} onShow={onShow} />
      <button
        className="danger"
        disabled={locked}
        onClick={() => commit("Stromkreis löschen", (draft) => deleteCircuit(draft, id))}
      >
        Stromkreis löschen und Zuordnungen lösen
      </button>
    </div>
  );
}
