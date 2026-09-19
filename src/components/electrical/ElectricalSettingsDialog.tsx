import { useProjectStore } from "../../stores/projectStore";
import { Modal } from "../dialogs/Modal";
import { NumberField } from "./ElectricalFields";

export function ElectricalSettingsDialog({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const commit = useProjectStore((s) => s.commit);
  const error = useProjectStore((s) => s.error);
  const locked = Object.values(project.layers).some((layer) => layer.kind === "electrical" && layer.locked);
  return (
    <Modal title="Elektrik-Projektstandard" onClose={onClose}>
      <p>
        Diese Vorgaben gelten projektweit für alle Objekte ohne eigene Einspeisespannung. Änderungen werden
        sofort übernommen und mit dem Projekt gespeichert.
      </p>
      {locked && <p className="locked-note">Zum Ändern zuerst alle Elektrikebenen entsperren.</p>}
      {(
        [
          ["phaseNeutralVoltage", "Standardspannung L–N (V)"],
          ["phasePhaseVoltage", "Standardspannung L–L (V)"],
        ] as const
      ).map(([key, label]) => (
        <NumberField
          key={key}
          label={label}
          value={project.electrical.settings[key]}
          disabled={locked}
          hint="L–N: einphasiger Anschluss. L–L: dreiphasiger Anschluss."
          onCommit={(value) =>
            commit("Elektrik-Projektstandard ändern", (draft) => {
              if (value === null || value <= 0)
                throw new Error("Eine positive Standardspannung ist erforderlich.");
              draft.electrical.settings[key] = value;
            })
          }
        />
      ))}
      <p>
        Geräte- und Bauteil-Typenschildwerte werden nicht überschrieben. Die Stromkreisabsicherung ergibt sich
        aus den zugeordneten Sicherungen.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
