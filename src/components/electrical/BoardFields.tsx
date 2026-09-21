import { useState } from "react";
import { usePropertyFields } from "../properties/usePropertyFields";
import { SelectField } from "./ElectricalFields";
import { ProtectionFields } from "./ProtectionFields";
import { TransformerFields } from "./TransformerFields";
import { protectionPresets, addProtectionPreset } from "../../electrical/protectionPresets";
import { transformerOutputLabel } from "../../electrical/transformers";
import {
  addBoardTransformer,
  addProtectionDevice,
  assignCircuitProtection,
} from "../../electrical/boardActions";
import { useProjectStore } from "../../stores/projectStore";
import { circuitMembers } from "../../electrical/selectors";
import { canFeedBoard, distributionPath } from "../../electrical/distributionTopology";
import { circuitOptionLabel, circuitSupply } from "../../electrical/supply";

export function BoardFields({ id, onCircuit }: { id: string; onCircuit: (id: string) => void }) {
  const { project, locked, change } = usePropertyFields({ kind: "distributionBoards", id });
  const [selectedProtection, setSelectedProtection] = useState<string | null>(null);
  const [presetId, setPresetId] = useState("B10");
  const [selectedTransformer, setSelectedTransformer] = useState<string | null>(null);
  const commit = useProjectStore((s) => s.commit);
  const board = project.electrical.distributionBoards[id]!;
  const { supply } = distributionPath(project, id);
  const feeder = board.upstreamCircuitId ? circuitSupply(project, board.upstreamCircuitId) : null;
  const protections = Object.values(project.electrical.protectionDevices).filter(
    (p) => p.distributionBoardId === id,
  );
  const circuits = Object.values(project.electrical.circuits).filter((c) => c.distributionBoardId === id);
  const add = (type: "MCB" | "RCD") => {
    let newId = "";
    if (
      commit("Schutzgerät anlegen", (draft) => {
        newId = addProtectionDevice(draft, id, type);
      })
    )
      setSelectedProtection(newId);
  };
  return (
    <section aria-label="Sicherungskasten-Zuordnung" className="board-fields">
      <SelectField
        label="Versorgung des Sicherungskastens"
        value={
          board.upstreamCircuitId
            ? `circuit:${board.upstreamCircuitId}`
            : board.meterId
              ? `meter:${board.meterId}`
              : board.supplyId
                ? `supply:${board.supplyId}`
                : ""
        }
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            const item = draft.electrical.distributionBoards[id]!;
            item.meterId = value.startsWith("meter:") ? value.slice(6) : null;
            item.supplyId = value.startsWith("supply:") ? value.slice(7) : null;
            item.upstreamCircuitId = value.startsWith("circuit:") ? value.slice(8) : null;
          })
        }
      >
        <option value="">Noch nicht zugeordnet</option>
        <optgroup label="Über Stromkreis einer Haupt- oder Unterverteilung">
          {Object.values(project.electrical.circuits)
            .filter((item) => canFeedBoard(project, id, item.id))
            .map((item) => (
              <option key={item.id} value={`circuit:${item.id}`}>
                {circuitOptionLabel(project, item.id)}
              </option>
            ))}
        </optgroup>
        <optgroup label="Über Stromzähler">
          {Object.values(project.electrical.meters).map((item) => (
            <option key={item.id} value={`meter:${item.id}`}>
              {item.label} · {item.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Direkte Einspeisung">
          {Object.values(project.electrical.supplies).map((item) => (
            <option key={item.id} value={`supply:${item.id}`}>
              {item.label} · {item.name}
            </option>
          ))}
        </optgroup>
      </SelectField>
      <p className="field-hint">
        {supply
          ? `Einspeisung: ${supply.phaseNeutralVoltage ?? project.electrical.settings.phaseNeutralVoltage} V L–N${supply.phases === 3 ? ` / ${supply.phasePhaseVoltage ?? project.electrical.settings.phasePhaseVoltage} V L–L` : ""} · ${supply.ratedCurrent ?? "?"} A je Phase`
          : "Einspeisepunkt und optional Stromzähler platzieren und zuordnen."}
      </p>
      {feeder && (
        <p className="field-hint">
          Zuleitung: {feeder.routeLabels.join(" → ")} · Absicherung {feeder.overcurrentRating ?? "?"} A.
          Diesen Rahmen teilen sich die nachgeschalteten Stromkreise.
        </p>
      )}
      <h3>Schutzgeräte</h3>
      <div className="board-add-actions">
        <button disabled={locked} onClick={() => add("MCB")}>
          B16-Sicherung hinzufügen
        </button>
        <button disabled={locked} onClick={() => add("RCD")}>
          FI hinzufügen
        </button>
      </div>
      <SelectField label="Sicherungsvorlage" value={presetId} disabled={locked} onChange={setPresetId}>
        {protectionPresets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </SelectField>
      <button
        disabled={locked}
        onClick={() => {
          let added = "";
          if (
            commit("Sicherung aus Vorlage anlegen", (draft) => {
              added = addProtectionPreset(draft, id, presetId);
            })
          )
            setSelectedProtection(added);
        }}
      >
        Sicherung aus Vorlage hinzufügen
      </button>
      <p className="field-hint">
        Vorlagen sind editierbar. Technische Daten an die vorhandene Installation anpassen.
      </p>
      <SelectField
        label="Schutzgerät im Kasten bearbeiten"
        value={
          selectedProtection && project.electrical.protectionDevices[selectedProtection]
            ? selectedProtection
            : ""
        }
        onChange={(value) => setSelectedProtection(value || null)}
      >
        <option value="">Schutzgerät wählen</option>
        {protections.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label} · {item.type} · {item.ratedCurrent ?? "?"} A
          </option>
        ))}
      </SelectField>
      {selectedProtection && project.electrical.protectionDevices[selectedProtection] && (
        <ProtectionFields id={selectedProtection} locked={locked} />
      )}
      <h3>Klingeltransformatoren</h3>
      <button
        disabled={locked}
        onClick={() => {
          let added = "";
          if (
            commit("Klingeltrafo im Kasten anlegen", (draft) => {
              added = addBoardTransformer(draft, id);
            })
          )
            setSelectedTransformer(added);
        }}
      >
        Klingeltrafo 6 / 9 / 12 / 24 V hinzufügen
      </button>
      <SelectField
        label="Klingeltrafo im Kasten bearbeiten"
        value={
          selectedTransformer &&
          project.electrical.transformers[selectedTransformer]?.distributionBoardId === id
            ? selectedTransformer
            : ""
        }
        onChange={(value) => setSelectedTransformer(value || null)}
      >
        <option value="">Klingeltrafo wählen</option>
        {Object.values(project.electrical.transformers)
          .filter((t) => t.distributionBoardId === id)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} · {transformerOutputLabel(t)}
            </option>
          ))}
      </SelectField>
      {selectedTransformer &&
        project.electrical.transformers[selectedTransformer]?.distributionBoardId === id && (
          <TransformerFields id={selectedTransformer} />
        )}
      <h3>Stromkreiszuordnung</h3>
      {!circuits.length && (
        <p className="field-hint">Über „Stromkreise verwalten“ Stromkreise für diesen Kasten anlegen.</p>
      )}
      {circuits.map((circuit) => {
        const members = circuitMembers(project, circuit.id);
        return (
          <div key={circuit.id} className="board-circuit">
            <button className="subtle" onClick={() => onCircuit(circuit.id)}>
              {circuit.label} · {circuit.name}
            </button>
            <p className="field-hint">
              {members.outlets.length} Steckdosen · {members.devices.length} Verbraucher
            </p>
            <SelectField
              label={`Sicherung für ${circuit.label || circuit.name}`}
              value={circuit.protectionDeviceId ?? ""}
              disabled={locked}
              onChange={(value) =>
                change((draft) => assignCircuitProtection(draft, circuit.id, value || null))
              }
            >
              <option value="">Nicht zugeordnet</option>
              {protections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.type} · {item.ratedCurrent ?? "?"} A
                </option>
              ))}
            </SelectField>
          </div>
        );
      })}
    </section>
  );
}
