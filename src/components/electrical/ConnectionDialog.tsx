import { useRef, useState } from "react";
import { Modal } from "../dialogs/Modal";
import { SelectField } from "./ElectricalFields";
import { ContactConnections } from "./ContactConnections";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { addCable, electricalNodes } from "../../electrical/cables";
import { connectionPair, contactsFor, setCableContacts } from "../../electrical/contacts";
import type { Cable } from "../../electrical/models";
import type { Project } from "../../models/project";

function suggested(project: Project, start: string, end: string): Cable["conductorConnections"] {
  const pair = connectionPair(project, start, end);
  if (!pair) return [];
  const values =
    pair.kind === "switch"
      ? [["L_OUT", "L"]]
      : pair.device.phases === 1
        ? [
            ["L", "L"],
            ["N", "N"],
          ]
        : [
            ["L1", "L1"],
            ["L2", "L2"],
            ["L3", "L3"],
          ];
  const startIds = new Set(contactsFor(project, start).map((c) => c.id)),
    endIds = new Set(contactsFor(project, end).map((c) => c.id));
  return values
    .map(([other, device]) => ({
      startContactId: pair.device.id === start ? device! : other!,
      endContactId: pair.device.id === start ? other! : device!,
    }))
    .filter((row) => startIds.has(row.startContactId) && endIds.has(row.endContactId));
}

export function ConnectionDialog() {
  const request = useEditorStore((s) => s.connectionRequest)!;
  const project = useProjectStore((s) => s.project);
  const initialProject = useRef(project);
  const existing = request.cableId ? project.electrical.cables[request.cableId] : null;
  const [startId, setStart] = useState(request.startNodeId);
  const [endId, setEnd] = useState(request.endNodeId);
  const [rows, setRows] = useState<Cable["conductorConnections"]>(() =>
    structuredClone(
      existing?.conductorConnections ?? suggested(project, request.startNodeId, request.endNodeId),
    ),
  );
  const [assign, setAssign] = useState(!!existing && existing.connectionAssignment !== "none");
  const [error, setError] = useState<string | null>(null);
  const all = electricalNodes(project);
  const nodes = Object.values(all).filter((item) => project.layers[item.layerId]?.visible);
  const pair = connectionPair(project, startId, endId);
  const stale = project !== initialProject.current;
  const close = () => useEditorStore.getState().cancel();
  const selectEnd = (side: "start" | "end", value: string) => {
    const a = side === "start" ? value : startId,
      b = side === "end" ? value : endId;
    if (side === "start") setStart(value);
    else setEnd(value);
    setRows(suggested(project, a, b));
    setAssign(false);
    setError(null);
  };
  const save = () => {
    if (stale) return;
    if (!startId || !endId || startId === endId) {
      setError("Zwei unterschiedliche Endobjekte wählen.");
      return;
    }
    if (rows.some((row) => !row.startContactId || !row.endContactId)) {
      setError("Bitte alle Kontakte auswählen oder die unvollständige Verbindung entfernen.");
      return;
    }
    let id = request.cableId ?? "";
    if (
      useProjectStore.getState().commit("Kontaktverbindung speichern", (draft) => {
        for (const nodeId of [startId, endId]) {
          const node = electricalNodes(draft)[nodeId];
          if (!node || draft.layers[node.layerId]!.locked || !draft.layers[node.layerId]!.visible)
            throw new Error("Endobjekte müssen vorhanden, sichtbar und entsperrt sein.");
        }
        if (!id) id = addCable(draft, startId, endId, []);
        setCableContacts(draft, id, rows, assign);
      })
    ) {
      close();
      if (!request.preserveSelection) useEditorStore.setState({ selection: [{ kind: "cables", id }] });
    } else {
      setError(useProjectStore.getState().error);
      useProjectStore.setState({ error: null });
    }
  };
  return (
    <Modal title="Anschlüsse verbinden" onClose={close} className="connection-dialog">
      <p>Endobjekte und Kontakte prüfen. Erst „Speichern“ verändert das Projekt.</p>
      <div className="connection-endpoints">
        {(["start", "end"] as const).map((side) => {
          const id = side === "start" ? startId : endId;
          return (
            <section key={side}>
              <SelectField
                label={side === "start" ? "Startobjekt" : "Zielobjekt"}
                value={id}
                disabled={!!existing}
                onChange={(value) => selectEnd(side, value)}
              >
                <option value="">Objekt wählen</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id} disabled={project.layers[node.layerId]!.locked}>
                    {node.label} · {node.name} · {project.floors[node.floorId]!.name}
                  </option>
                ))}
              </SelectField>
              <div
                className="contact-pins"
                aria-label={side === "start" ? "Verfügbare Startkontakte" : "Verfügbare Zielkontakte"}
              >
                {contactsFor(project, id).map((contact) => (
                  <span key={contact.id}>{contact.label}</span>
                ))}
                {id && !contactsFor(project, id).length && (
                  <span>Für diesen Objekttyp noch keine Kontaktvorlage.</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="field-hint">
        Endobjekte können auf unterschiedlichen Etagen liegen. Ohne Kontaktbelegung wird ein Leitungsweg
        angelegt. Bei einem Geschosswechsel entsteht ein bearbeitbarer Steigpunkt an der Startposition.
      </p>
      <p className="field-hint">
        Generische Kontaktvorlagen. PE nur belegen, wenn der Anschluss am konkreten Gerät vorhanden ist.
        Herstellerkontakte können abweichen.
      </p>
      <ContactConnections
        rows={rows}
        start={contactsFor(project, startId)}
        end={contactsFor(project, endId)}
        onChange={(value) => {
          setRows(value);
          setError(null);
        }}
      />
      {!!pair && (
        <label className="connection-assignment">
          <input type="checkbox" checked={assign} onChange={(event) => setAssign(event.target.checked)} />
          Verbraucher {pair.kind === "switch" ? "diesem Lichtschalter" : "dieser Steckdose"} zuordnen
          (Simulation)
        </label>
      )}
      {assign && pair && (
        <p className="connection-summary">
          {pair.device.label} · {pair.device.name} wird{" "}
          {pair.kind === "switch"
            ? `über ${all[pair.otherId]!.label} geschaltet`
            : `an ${all[pair.otherId]!.label} angeschlossen`}
          .
          {pair.kind === "switch" &&
            " Der Stromkreis des Schalters wird übernommen. L′ → L ist dafür erforderlich."}
        </p>
      )}
      {!assign && (
        <p className="field-hint">
          Nur Kontaktbelegung dokumentieren; vorhandene unabhängige Anschlusszuordnungen bleiben bestehen.
          {existing?.connectionAssignment !== "none" &&
            existing &&
            " Die bisher von dieser Leitung verwaltete Zuordnung wird gelöst."}
        </p>
      )}
      {(project.electrical.switches[startId] || project.electrical.switches[endId]) && (
        <p className="field-hint">
          Die Kontaktvorlage folgt der Schalterrolle. Wechsel-/Kreuzschalter und Taster werden über ihre
          Schaltgruppe zugeordnet; N und PE werden nicht über den Schaltkontakt geführt.
        </p>
      )}
      <p className="field-hint">
        Die Simulation verwendet weiterhin Stromkreis- und Gerätezuordnungen. Kontaktbelegungen allein bilden
        noch keinen vollständigen Leiterstromkreis.
      </p>
      {(error || stale) && (
        <p className="connection-error" role="alert">
          {stale ? "Das Projekt wurde geändert. Dialog schließen und erneut öffnen." : error}
        </p>
      )}
      <div className="dialog-actions">
        <button onClick={close}>Abbrechen</button>
        <button
          className="primary"
          onClick={save}
          disabled={stale || !startId || !endId || startId === endId}
        >
          {assign
            ? "Verbinden und zuordnen"
            : rows.length || existing
              ? "Belegung speichern"
              : "Leitungsweg speichern"}
        </button>
      </div>
    </Modal>
  );
}
