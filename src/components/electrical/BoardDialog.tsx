import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { BoardFields } from "./BoardFields";
import { ProtectionFields } from "./ProtectionFields";
import { TransformerFields } from "./TransformerFields";
import { CircuitFields } from "./CircuitFields";
import { CableProperties } from "./CableProperties";
import { CircuitsDialog } from "./CircuitsDialog";
import { SelectField } from "./ElectricalFields";
import { protectionPresets, addProtectionPreset } from "../../electrical/protectionPresets";
import { addBoardTransformer } from "../../electrical/boardActions";
import { electricalNodes } from "../../electrical/cables";
import { transformerOutputLabel } from "../../electrical/transformers";
import { focusElectrical } from "../../editor/interaction/focusElectrical";
import type { ProtectionDevice } from "../../electrical/models";
import "../../app/board-dialog.css";

type Detail = { kind: "protectionDevices" | "transformers" | "circuits" | "cables"; id: string };

export function BoardDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const commit = useProjectStore((s) => s.commit);
  const error = useProjectStore((s) => s.error);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [settings, setSettings] = useState(false);
  const [circuitsOpen, setCircuitsOpen] = useState(false);
  const [preset, setPreset] = useState("B16");
  const board = project.electrical.distributionBoards[id];
  if (!board) return null;
  const locked = project.layers[board.layerId]!.locked;
  const protections = Object.values(project.electrical.protectionDevices).filter(
    (p) => p.distributionBoardId === id,
  );
  const circuits = Object.values(project.electrical.circuits).filter((c) => c.distributionBoardId === id);
  const transformers = Object.values(project.electrical.transformers).filter(
    (t) => t.distributionBoardId === id,
  );
  const nodes = electricalNodes(project);
  const cables = Object.values(project.electrical.cables).filter(
    (c) =>
      c.startNodeId === id ||
      c.endNodeId === id ||
      circuits.some((s) => s.id === c.circuitId) ||
      transformers.some((t) => t.id === c.startNodeId || t.id === c.endNodeId),
  );
  const supply = board.upstreamCircuitId
    ? project.electrical.circuits[board.upstreamCircuitId]
    : nodes[board.meterId ?? board.supplyId ?? ""];
  const current = detail ? project.electrical[detail.kind][detail.id] : null;
  const circuitCards = (protectionId: string | null) =>
    circuits
      .filter((c) => c.protectionDeviceId === protectionId)
      .map((c) => (
        <li key={c.id}>
          <button
            className="board-node board-node-circuit"
            onClick={() => setDetail({ kind: "circuits", id: c.id })}
          >
            <small>Stromkreis · {c.phase}</small>
            <strong>
              {c.label} · {c.name}
            </strong>
          </button>
          {transformers.some((t) => t.circuitId === c.id) && (
            <ul>
              {transformers
                .filter((t) => t.circuitId === c.id)
                .map((t) => (
                  <li key={t.id}>{transformerCard(t.id)}</li>
                ))}
            </ul>
          )}
        </li>
      ));
  const transformerCard = (key: string) => {
    const t = project.electrical.transformers[key]!;
    return (
      <button className="board-node" onClick={() => setDetail({ kind: "transformers", id: key })}>
        <small>Klingeltrafo</small>
        <strong>
          {t.label} · {t.name}
        </strong>
        <span>{transformerOutputLabel(t)}</span>
      </button>
    );
  };
  const protectionCard = (p: ProtectionDevice, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(p.id)) return null;
    const next = new Set([...visited, p.id]);
    const children = protections.filter((q) => q.upstreamProtectionDeviceId === p.id);
    const assigned = circuitCards(p.id);
    return (
      <li key={p.id}>
        <button
          className="board-node board-node-protection"
          onClick={() => setDetail({ kind: "protectionDevices", id: p.id })}
        >
          <span className="board-switch" aria-hidden="true">
            {p.type === "RCD" ? "FI" : p.type === "RCBO" ? "FI/LS" : "Ⅰ"}
          </span>
          <small>
            {p.type} · {p.poles}-polig
          </small>
          <strong>{p.label}</strong>
          <span>
            {p.characteristic} {p.ratedCurrent ?? "?"} A
            {p.residualCurrent ? ` · ${p.residualCurrent} mA` : ""}
          </span>
        </button>
        {(children.length > 0 || assigned.length > 0) && (
          <ul>
            {children.map((q) => protectionCard(q, next))}
            {assigned}
          </ul>
        )}
      </li>
    );
  };
  return (
    <Modal
      title={`Sicherungskasten · ${board.label} · ${board.name}`}
      onClose={onClose}
      className="board-dialog"
    >
      <p>
        Komponente anklicken, um sie in einem weiteren Fenster zu bearbeiten. Linien zeigen die gespeicherte
        Versorgung und Schutzkette.
      </p>
      {locked && <p className="locked-note">Elektrikebene gesperrt – nur Ansicht</p>}
      <div className="board-dialog-actions">
        <button onClick={() => setSettings(true)}>Versorgung und Zuordnung</button>
        <button onClick={() => setCircuitsOpen(true)}>Stromkreise verwalten</button>
        <SelectField label="Neue Sicherung" value={preset} disabled={locked} onChange={setPreset}>
          {protectionPresets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <button
          disabled={locked}
          onClick={() => {
            let added = "";
            if (
              commit("Sicherung hinzufügen", (d) => {
                added = addProtectionPreset(d, id, preset);
              })
            )
              setDetail({ kind: "protectionDevices", id: added });
          }}
        >
          Sicherung hinzufügen
        </button>
        <button
          disabled={locked}
          onClick={() => {
            let added = "";
            if (
              commit("Klingeltrafo hinzufügen", (d) => {
                added = addBoardTransformer(d, id);
              })
            )
              setDetail({ kind: "transformers", id: added });
          }}
        >
          Klingeltrafo hinzufügen
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <section aria-label="Verteilerschema" className="board-schematic">
        <h3>Versorgungsschema</h3>
        <button className="board-node board-source" onClick={() => setSettings(true)}>
          <small>Eingang des Sicherungskastens</small>
          <strong>{supply ? `${supply.label} · ${supply.name}` : "Keine Einspeisung zugeordnet"}</strong>
        </button>
        <ul className="board-tree">
          {protections.filter((p) => !p.upstreamProtectionDeviceId).map((p) => protectionCard(p))}
        </ul>
        {!protections.length && <p>Noch keine Sicherungen vorhanden. Oben eine Sicherung hinzufügen.</p>}
        {circuits.some((c) => !c.protectionDeviceId) && (
          <section className="board-unassigned">
            <h4>Stromkreise ohne Schutzgerät-Zuordnung</h4>
            <ul>{circuitCards(null)}</ul>
          </section>
        )}
        {transformers.some((t) => !circuits.some((c) => c.id === t.circuitId)) && (
          <section className="board-unassigned">
            <h4>Trafos ohne Stromkreis in diesem Kasten</h4>
            {transformers
              .filter((t) => !circuits.some((c) => c.id === t.circuitId))
              .map((t) => (
                <div key={t.id}>{transformerCard(t.id)}</div>
              ))}
          </section>
        )}
      </section>
      <section aria-label="Leitungen des Sicherungskastens">
        <h3>Leitungen und Anschlüsse · {cables.length}</h3>
        <button
          disabled={locked}
          onClick={() =>
            useEditorStore.setState({
              connectionRequest: { startNodeId: id, endNodeId: "", cableId: null, preserveSelection: true },
            })
          }
        >
          Leitung verbinden
        </button>
        <p className="field-hint">
          Leitungen mit Anschluss am Kasten oder Trafo sowie Leitungen seiner Stromkreise. Die Schutzkette
          oben ersetzt keine dokumentierte Aderbelegung.
        </p>
        <div className="board-cable-list">
          {cables.map((c) => (
            <button key={c.id} className="board-node" onClick={() => setDetail({ kind: "cables", id: c.id })}>
              <small>Leitung · {c.label}</small>
              <strong>{c.name || c.type}</strong>
              <span>
                {nodes[c.startNodeId]?.label} → {nodes[c.endNodeId]?.label}
              </span>
              <span>
                {c.type} · {c.conductorCount ?? "?"} × {c.conductorCrossSection ?? "?"} mm²
              </span>
              <small>
                {c.conductorConnections.length
                  ? `${c.conductorConnections.length} Kontaktverbindungen`
                  : "Keine Kontaktbelegung"}
              </small>
            </button>
          ))}
        </div>
        {!cables.length && (
          <p>Noch keine Leitungen zugeordnet. Leitungswege im Plan zeichnen; anschließend hier bearbeiten.</p>
        )}
      </section>
      {settings && (
        <Modal title="Versorgung und Zuordnung" onClose={() => setSettings(false)}>
          <BoardFields
            id={id}
            onCircuit={(key) => {
              setSettings(false);
              setDetail({ kind: "circuits", id: key });
            }}
          />
        </Modal>
      )}
      {circuitsOpen && <CircuitsDialog initialBoardId={id} onClose={() => setCircuitsOpen(false)} />}
      {detail && current && (
        <Modal title={`Komponente bearbeiten · ${current.label}`} onClose={() => setDetail(null)}>
          <p className="field-hint">
            Änderungen werden direkt übernommen. Nach dem Schließen bleibt der Sicherungskasten geöffnet.
          </p>
          {error && <p role="alert">{error}</p>}
          {detail.kind === "protectionDevices" && <ProtectionFields id={detail.id} locked={locked} />}
          {detail.kind === "transformers" && <TransformerFields id={detail.id} />}
          {detail.kind === "cables" && <CableProperties id={detail.id} preserveSelection />}
          {detail.kind === "circuits" && (
            <CircuitFields
              id={detail.id}
              onBoardChange={() => setDetail(null)}
              onShow={(target) => {
                if (focusElectrical(target)) onClose();
              }}
            />
          )}
        </Modal>
      )}
    </Modal>
  );
}
