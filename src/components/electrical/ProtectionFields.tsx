import { useProjectStore } from "../../stores/projectStore";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "./ElectricalFields";
import { protectionChain } from "../../electrical/supply";

export function ProtectionFields({ id, locked }: { id: string; locked: boolean }) {
  const project = useProjectStore((s) => s.project);
  const commit = useProjectStore((s) => s.commit);
  const item = project.electrical.protectionDevices[id]!;
  return (
    <details className="protection-fields" open>
      <summary>Schutzgerät {item.label}</summary>
      <TextField
        label="Sicherungskennzeichnung"
        value={item.label}
        disabled={locked}
        onCommit={(value) =>
          commit("Schutzgerät bearbeiten", (draft) => {
            draft.electrical.protectionDevices[id]!.label = value;
          })
        }
      />
      <SelectField
        label="Schutzgerätetyp"
        value={item.type}
        disabled={locked}
        onChange={(value) =>
          commit("Schutzgerät bearbeiten", (draft) => {
            draft.electrical.protectionDevices[id]!.type = value as typeof item.type;
          })
        }
      >
        <option value="MCB">Leitungsschutzschalter</option>
        <option value="RCD">FI / RCD</option>
        <option value="RCBO">FI/LS / RCBO</option>
        <option value="fuse">Schmelzsicherung</option>
        <option value="other">Sonstiges</option>
      </SelectField>
      <TextField
        label="Charakteristik"
        value={item.characteristic}
        disabled={locked}
        onCommit={(value) =>
          commit("Schutzgerät bearbeiten", (draft) => {
            draft.electrical.protectionDevices[id]!.characteristic = value;
          })
        }
      />
      <SelectField
        label="Vorgeschaltetes Schutzgerät"
        value={item.upstreamProtectionDeviceId ?? ""}
        disabled={locked}
        onChange={(value) =>
          commit("Schutzkette zuordnen", (draft) => {
            draft.electrical.protectionDevices[id]!.upstreamProtectionDeviceId = value || null;
          })
        }
      >
        <option value="">Direkt an der Einspeisung des Kastens</option>
        {Object.values(project.electrical.protectionDevices)
          .filter(
            (candidate) =>
              candidate.distributionBoardId === item.distributionBoardId &&
              !protectionChain(project, candidate.id).some((p) => p.id === id),
          )
          .map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label} · {candidate.type}
            </option>
          ))}
      </SelectField>
      {item.type === "RCD" && (
        <p className="field-hint">
          Der FI-Bemessungsstrom beschreibt seine Belastbarkeit. Überstromschutz benötigt zusätzlich LS/RCBO
          oder Sicherung.
        </p>
      )}
      {(
        [
          ["ratedCurrent", "Bemessungsstrom (A)"],
          ["residualCurrent", "Bemessungsdifferenzstrom (mA)"],
          ["breakingCapacity", "Ausschaltvermögen (kA)"],
        ] as const
      ).map(([key, label]) => (
        <NumberField
          key={key}
          label={label}
          value={item[key]}
          disabled={locked}
          onCommit={(value) =>
            commit("Schutzgerät bearbeiten", (draft) => {
              draft.electrical.protectionDevices[id]![key] = value;
            })
          }
        />
      ))}
      <SelectField
        label="Pole"
        value={String(item.poles)}
        disabled={locked}
        onChange={(value) =>
          commit("Schutzgerät bearbeiten", (draft) => {
            draft.electrical.protectionDevices[id]!.poles = Number(value);
          })
        }
      >
        {[1, 2, 3, 4].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      <button
        disabled={locked}
        onClick={() =>
          commit("Schutzgerät löschen", (draft) => {
            for (const circuit of Object.values(draft.electrical.circuits))
              if (circuit.protectionDeviceId === id) circuit.protectionDeviceId = null;
            for (const protection of Object.values(draft.electrical.protectionDevices))
              if (protection.upstreamProtectionDeviceId === id) protection.upstreamProtectionDeviceId = null;
            delete draft.electrical.protectionDevices[id];
          })
        }
      >
        Schutzgerät löschen und Zuordnungen lösen
      </button>
    </details>
  );
}
