import { newId } from "../../utils/uuid";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../dialogs/Modal";
import { CircuitFields } from "./CircuitFields";
import { focusElectrical } from "../../editor/interaction/focusElectrical";
import { SelectField } from "./ElectricalFields";

export function CircuitsDialog({
  onClose,
  initialBoardId = null,
  initialCircuitId = null,
}: {
  onClose: () => void;
  initialBoardId?: string | null;
  initialCircuitId?: string | null;
}) {
  const project = useProjectStore((s) => s.project);
  const error = useProjectStore((s) => s.error);
  const [selected, setSelected] = useState<string | null>(initialCircuitId);
  const [selectedBoard, setSelectedBoard] = useState(
    initialBoardId ?? Object.keys(project.electrical.distributionBoards)[0] ?? "",
  );
  const board = project.electrical.distributionBoards[selectedBoard];
  const canCreate = board && !project.layers[board.layerId]!.locked;
  const circuits = Object.values(project.electrical.circuits).filter(
    (item) => item.distributionBoardId === selectedBoard,
  );
  const current = circuits.some((item) => item.id === selected) ? selected! : circuits[0]?.id;
  const create = () => {
    if (!board || !canCreate) return;
    const id = newId();
    if (
      useProjectStore.getState().commit("Stromkreis anlegen", (draft) => {
        const labels = new Set(Object.values(draft.electrical.circuits).map((item) => item.label));
        let number = 1;
        while (labels.has(`SK-${String(number).padStart(2, "0")}`)) number++;
        draft.electrical.circuits[id] = {
          id,
          name: `Stromkreis ${number}`,
          label: `SK-${String(number).padStart(2, "0")}`,
          distributionBoardId: board.id,
          protectionDeviceId: null,
          phase: "unknown",
          nominalVoltage: null,
          metadata: {},
        };
      })
    )
      setSelected(id);
  };
  return (
    <Modal title="Stromkreise und Schutzgeräte" onClose={onClose}>
      <p className="field-hint">
        Bestandsdokumentation. Schaltlogik und technische Berechnungen folgen in weiteren Schritten.
      </p>
      {!board && (
        <p>Zum Anlegen zuerst einen Verteiler im Grundriss platzieren und die Elektrikebene entsperren.</p>
      )}
      <SelectField
        label="Sicherungskasten"
        value={selectedBoard}
        onChange={(value) => {
          setSelectedBoard(value);
          setSelected(null);
        }}
      >
        {!board && <option value="">Sicherungskasten wählen</option>}
        {Object.values(project.electrical.distributionBoards).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} · {item.name}
          </option>
        ))}
      </SelectField>
      <button disabled={!canCreate} onClick={create}>
        Neuer Stromkreis
      </button>
      <nav className="circuit-tabs" aria-label="Stromkreisliste">
        {circuits.map((item) => (
          <button key={item.id} aria-pressed={current === item.id} onClick={() => setSelected(item.id)}>
            {item.label || item.name}
          </button>
        ))}
      </nav>
      {current && (
        <CircuitFields
          key={current}
          id={current}
          onBoardChange={(id) => {
            setSelected(current);
            setSelectedBoard(id);
          }}
          onShow={(target) => {
            if (focusElectrical(target)) {
              onClose();
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>("[data-testid='drawing-surface']")?.focus(),
              );
            }
          }}
        />
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
