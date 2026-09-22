import { useState } from "react";
import { solarPlacement } from "../../electrical/solarPlan";
import { SolarDeviceFields } from "./SolarDeviceFields";
import type { ElectricalKind, ElectricalLabelMode } from "../../electrical/models";
import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "./ElectricalFields";
import { CircuitsDialog } from "./CircuitsDialog";
import { DeviceFields } from "./DeviceFields";
import { SwitchFields } from "./SwitchFields";
import { ControlFields } from "./ControlFields";
import { TransformerFields } from "./TransformerFields";
import { BoardFields } from "./BoardFields";
import { BoardDialog } from "./BoardDialog";
import { SupplyFields } from "./SupplyFields";
import { MeterFields } from "./MeterFields";
import { SupplySummary } from "./SupplySummary";
import { objectSupply, circuitOptionLabel } from "../../electrical/supply";

export function ElectricalProperties({ id, kind }: { id: string; kind: ElectricalKind }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind, id });
  const item = project.electrical[kind][id]!;
  const [manage, setManage] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [managedCircuit, setManagedCircuit] = useState<string | null>(null);
  return (
    <>
      {kind === "distributionBoards" && (
        <button onClick={() => setBoardOpen(true)}>Sicherungskasten öffnen</button>
      )}
      {kind === "distributionBoards" && boardOpen && (
        <BoardDialog id={id} onClose={() => setBoardOpen(false)} />
      )}
      {(kind === "outlets" || (kind === "devices" && !solarPlacement(item))) && (
        <SupplySummary data={objectSupply(project, kind, id)} />
      )}
      <TextField
        label="Elektro-Name"
        value={item.name}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical[kind][id]!.name = value;
          })
        }
      />
      <TextField
        label="Kennzeichnung"
        value={item.label}
        disabled={locked}
        onCommit={(value) =>
          change((draft) => {
            draft.electrical[kind][id]!.label = value;
          })
        }
      />
      <SelectField
        label="Beschriftung im Plan"
        value={item.labelMode}
        disabled={locked}
        onChange={(value) =>
          change((draft) => {
            draft.electrical[kind][id]!.labelMode = value as ElectricalLabelMode;
          })
        }
      >
        <option value="label">Kennzeichnung</option>
        <option value="name">Name</option>
        {kind === "outlets" && <option value="number">Nummer</option>}
        {(kind === "devices" || kind === "outlets" || kind === "switches") && (
          <option value="circuit">Stromkreis</option>
        )}
        <option value="none">Keine</option>
      </SelectField>
      {kind === "junctions" && (
        <SelectField
          label="Verbindungspunkttyp"
          value={project.electrical.junctions[id]!.type}
          disabled={locked}
          onChange={(value) =>
            change((draft) => {
              draft.electrical.junctions[id]!.type = value as "junctionBox" | "terminal" | "connectionPoint";
            })
          }
        >
          <option value="junctionBox">Abzweigdose</option>
          <option value="terminal">Klemme</option>
          <option value="connectionPoint">Verbindungspunkt</option>
        </SelectField>
      )}
      {kind === "outlets" && (
        <>
          <TextField
            label="Steckdosennummer"
            value={project.electrical.outlets[id]!.number}
            disabled={locked}
            onCommit={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.number = value;
              })
            }
          />
          <TextField
            label="Steckdosentyp"
            value={project.electrical.outlets[id]!.socketType}
            disabled={locked}
            onCommit={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.socketType = value;
              })
            }
          />
          <SelectField
            label="Stromkreis"
            value={project.electrical.outlets[id]!.circuitId ?? ""}
            disabled={locked}
            onChange={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.circuitId = value || null;
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
          <NumberField
            label="Bauteil-Nennspannung (V)"
            hint="Optionaler Typenschildwert; geplante Versorgung siehe oben."
            value={project.electrical.outlets[id]!.ratedVoltage}
            disabled={locked}
            onCommit={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.ratedVoltage = value;
              })
            }
          />
          <NumberField
            label="Steckdosen-Nennstrom (A)"
            hint="Belastbarkeit der Steckdose, nicht Sicherungswert oder Stromaufnahme."
            value={project.electrical.outlets[id]!.ratedCurrent}
            disabled={locked}
            onCommit={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.ratedCurrent = value;
              })
            }
          />
          <SelectField
            label="Phasen"
            value={String(project.electrical.outlets[id]!.phases)}
            disabled={locked}
            onChange={(value) =>
              change((draft) => {
                draft.electrical.outlets[id]!.phases = Number(value) as 1 | 3;
              })
            }
          >
            <option value="1">Einphasig</option>
            <option value="3">Dreiphasig</option>
          </SelectField>
          <p className="field-hint">
            Wandbezug:{" "}
            {project.electrical.outlets[id]!.wallId
              ? "Wand an dieser Position"
              : "Keine Wand an dieser Position"}
          </p>
        </>
      )}
      {kind === "devices" &&
        (solarPlacement(item) ? <SolarDeviceFields id={id} /> : <DeviceFields id={id} />)}
      {kind === "switches" && <SwitchFields id={id} />}
      {kind === "controls" && <ControlFields id={id} />}
      {kind === "transformers" && <TransformerFields id={id} />}
      {kind === "supplies" && <SupplyFields id={id} />}
      {kind === "meters" && <MeterFields id={id} />}
      {kind === "distributionBoards" && (
        <BoardFields
          id={id}
          onCircuit={(circuitId) => {
            setManagedCircuit(circuitId);
            setManage(true);
          }}
        />
      )}
      <button
        className="electrical-manage"
        onClick={() => {
          setManagedCircuit(null);
          setManage(true);
        }}
      >
        Stromkreise verwalten
      </button>
      {lengthField("Position X", item.position.x, (draft, value) => {
        draft.electrical[kind][id]!.position.x = value;
      })}
      {lengthField("Position Y", item.position.y, (draft, value) => {
        draft.electrical[kind][id]!.position.y = value;
      })}
      <p className="field-hint">
        Raum: {item.roomId ? project.rooms[item.roomId]!.name : "Keine eindeutige Zuordnung"}
      </p>
      {manage && (
        <CircuitsDialog
          initialBoardId={kind === "distributionBoards" ? id : null}
          initialCircuitId={managedCircuit}
          onClose={() => setManage(false)}
        />
      )}
    </>
  );
}
