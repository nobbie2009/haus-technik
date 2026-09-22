import { useRef, useState } from "react";
import { Modal } from "../dialogs/Modal";
import { SelectField } from "./ElectricalFields";
import { ContactConnections } from "./ContactConnections";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { addCable, electricalNodes } from "../../electrical/cables";
import { connectionPair, contactsFor, setCableContacts } from "../../electrical/contacts";
import type { Cable } from "../../electrical/models";
import { connectionContacts, suggestContacts as suggested } from "../../electrical/contactSuggestions";
import { newId } from "../../utils/uuid";
import { boardCircuit } from "../../electrical/boardConnection";
import { syncWiring, resolveWiring } from "../../electrical/wiring";
import { networkNodeTable } from "../../network/model";
import { ensureNetworkPower, networkPower } from "../../network/power";

export function ConnectionDialog() {
  const request = useEditorStore((s) => s.connectionRequest)!;
  const project = useProjectStore((s) => s.project);
  const initialProject = useRef(project);
  const existing = request.cableId ? project.electrical.cables[request.cableId] : null;
  const [startId, setStart] = useState(request.startNodeId);
  const [endId, setEnd] = useState(request.endNodeId);
  const [boardChoices, setBoardChoices] = useState<Record<string, string>>(() => {
    const choices: Record<string, string> = {};
    for (const [id, side] of [
      [request.startNodeId, "start"],
      [request.endNodeId, "end"],
    ] as const) {
      if (!project.electrical.distributionBoards[id]) continue;
      const pin = existing?.conductorConnections[0]?.[side === "start" ? "startContactId" : "endContactId"];
      choices[id] = pin?.includes(":") ? `circuit:${pin.split(":")[0]}` : existing ? "input" : "";
    }
    return choices;
  });
  const reservedIds = useRef<Record<string, string>>({});
  const [rows, setRows] = useState<Cable["conductorConnections"]>(() =>
    structuredClone(
      existing?.conductorConnections ?? suggested(project, request.startNodeId, request.endNodeId),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const all = electricalNodes(project);
  const boardIds = [startId, endId].filter((id) => !!project.electrical.distributionBoards[id]);
  const preview = structuredClone(project);
  const departures: { boardId: string; circuitId: string }[] = [];
  let previewError = "";
  for (const boardId of boardIds) {
    const choice = boardChoices[boardId];
    if (!choice) continue;
    reservedIds.current[boardId] ??= newId();
    try {
      const circuitId = boardCircuit(preview, boardId, choice, reservedIds.current[boardId]!);
      if (circuitId) departures.push({ boardId, circuitId });
    } catch (e) {
      previewError = e instanceof Error ? e.message : "Abgang nicht verfügbar.";
    }
  }
  const boardPorts: Record<string, string | null> = {};
  for (const id of boardIds)
    if (boardChoices[id]) boardPorts[id] = departures.find((d) => d.boardId === id)?.circuitId ?? null;
  const available = connectionContacts(preview, startId, endId, boardPorts, existing?.id);
  const selectedContacts = (id: string) => {
    const filtered = id === startId ? available.start : available.end;
    // Existing documented contacts remain visible until deliberately changed.
    const saved =
      existing?.conductorConnections.map((r) => (id === startId ? r.startContactId : r.endContactId)) ?? [];
    return [
      ...filtered,
      ...contactsFor(preview, id).filter((c) => saved.includes(c.id) && !filtered.some((f) => f.id === c.id)),
    ];
  };
  const departure = departures[0];
  const chooseBoard = (id: string, value: string) => {
    setBoardChoices((old) => ({ ...old, [id]: value }));
    setError(null);
    if (!value || value === "input") {
      setRows(value ? suggested(preview, startId, endId, { ...boardPorts, [id]: null }, existing?.id) : []);
      return;
    }
    const draft = structuredClone(project);
    reservedIds.current[id] ??= newId();
    const circuitId = boardCircuit(draft, id, value, reservedIds.current[id]!);
    setRows(
      circuitId ? suggested(draft, startId, endId, { ...boardPorts, [id]: circuitId }, existing?.id) : [],
    );
  };
  const nodes = Object.values(all).filter((item) => project.layers[item.layerId]?.visible);
  const pair = connectionPair(project, startId, endId);
  const assign = !!pair;
  const inferred = resolveWiring(preview);
  const inferredCircuit =
    departure?.circuitId ??
    inferred.circuits.get(startId) ??
    inferred.circuits.get(endId) ??
    project.electrical.switches[startId]?.circuitId ??
    project.electrical.outlets[startId]?.circuitId ??
    project.electrical.switches[endId]?.circuitId ??
    project.electrical.outlets[endId]?.circuitId;
  const stale = project !== initialProject.current;
  const close = () => useEditorStore.getState().cancel();
  const selectEnd = (side: "start" | "end", value: string) => {
    if (stale) return;
    let selectionPreview = preview;
    if (value.startsWith("network:")) {
      const networkId = value.slice(8);
      let powerId = "";
      if (
        !useProjectStore.getState().commit("Netzwerk-Stromanschluss einrichten", (d) => {
          powerId = ensureNetworkPower(d, networkId);
        })
      )
        return;
      const fresh = useProjectStore.getState().project;
      initialProject.current = fresh;
      selectionPreview = structuredClone(preview);
      selectionPreview.electrical.devices[powerId] = fresh.electrical.devices[powerId]!;
      value = powerId;
    }
    const a = side === "start" ? value : startId,
      b = side === "end" ? value : endId;
    if (side === "start") setStart(value);
    else setEnd(value);
    setRows(suggested(selectionPreview, a, b, boardPorts, existing?.id));
    setError(null);
  };
  const save = () => {
    if (stale || previewError) return;
    if (boardIds.some((id) => !boardChoices[id])) {
      setError("Am Sicherungskasten zuerst Sicherung / Stromkreis oder Einspeisung auswählen.");
      return;
    }
    if (departures.length > 1) {
      setError(
        "Zwei abgesicherte Abgänge nicht miteinander verbinden. Am versorgten Kasten die Einspeisung wählen.",
      );
      return;
    }
    if (
      departure &&
      (!rows.length ||
        !rows.some((r) => {
          const pin = departure.boardId === startId ? r.startContactId : r.endContactId;
          return pin.startsWith(`${departure.circuitId}:L`);
        }))
    ) {
      setError("Für den gewählten Abgang mindestens den Außenleiterkontakt verbinden.");
      return;
    }
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
        if (!id) id = addCable(draft, startId, endId, request.path ?? []);
        for (const boardId of boardIds)
          boardCircuit(draft, boardId, boardChoices[boardId]!, reservedIds.current[boardId]!);
        for (const row of rows) {
          if (
            !selectedContacts(startId).some((c) => c.id === row.startContactId) ||
            !selectedContacts(endId).some((c) => c.id === row.endContactId)
          )
            throw new Error("Kontakt gehört nicht zum gewählten Abgang.");
        }
        setCableContacts(draft, id, rows, false);
        if (departure) {
          draft.electrical.cables[id]!.circuitId = departure.circuitId;
        } else if (boardIds.length) draft.electrical.cables[id]!.circuitId = null;
        const previousIssues = new Set(resolveWiring(project).issues);
        const newIssues = syncWiring(draft).filter((issue) => !previousIssues.has(issue));
        if (newIssues.length) throw new Error(newIssues.join(" "));
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
      <p>Endobjekte und Kontakte prüfen. Leitung und Anschluss werden gemeinsam gespeichert.</p>
      {request.path && (
        <p className="field-hint">
          Gezeichneter Leitungsweg mit {request.path.length} Zwischenpunkten. Die Endobjekte sind durch den
          Verlauf festgelegt.
        </p>
      )}
      <div className="connection-endpoints">
        {(["start", "end"] as const).map((side) => {
          const id = side === "start" ? startId : endId;
          return (
            <section key={side}>
              <SelectField
                label={side === "start" ? "Startobjekt" : "Zielobjekt"}
                value={id}
                disabled={!!existing || !!request.path}
                onChange={(value) => selectEnd(side, value)}
              >
                <option value="">Objekt wählen</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id} disabled={project.layers[node.layerId]!.locked}>
                    {node.label} · {node.name} · {project.floors[node.floorId]!.name}
                  </option>
                ))}
                <optgroup label="Netzwerkgeräte · Stromanschluss einrichten">
                  {Object.values(networkNodeTable(project))
                    .filter((n) => project.layers[n.layerId]?.visible && !networkPower(project, n.id))
                    .map((n) => (
                      <option
                        key={n.id}
                        value={`network:${n.id}`}
                        disabled={project.layers[n.layerId]?.locked}
                      >
                        {n.name} · {project.floors[n.floorId]?.name}
                      </option>
                    ))}
                </optgroup>
              </SelectField>
              {project.electrical.distributionBoards[id] && (
                <>
                  <SelectField
                    label={`${side === "start" ? "Start" : "Ziel"} · Sicherung / Stromkreis`}
                    value={boardChoices[id] ?? ""}
                    onChange={(value) => chooseBoard(id, value)}
                  >
                    <option value="">Sicherung oder Einspeisung wählen</option>
                    <option value="input">Einspeisung des Kastens · IN</option>
                    {Object.values(project.electrical.protectionDevices)
                      .filter((p) => p.distributionBoardId === id)
                      .map((p) => {
                        const circuits = Object.values(project.electrical.circuits).filter(
                          (c) => c.protectionDeviceId === p.id,
                        );
                        const label = `${p.label} · ${p.type} ${p.characteristic} ${p.ratedCurrent ?? "?"} A`;
                        return circuits.length ? (
                          <optgroup key={p.id} label={label}>
                            {circuits.map((c) => (
                              <option key={c.id} value={`circuit:${c.id}`}>
                                {label} → {c.label} · {c.name}
                              </option>
                            ))}
                          </optgroup>
                        ) : (
                          <option key={p.id} value={`protection:${p.id}`}>
                            {label} · neuen Abgang anlegen
                          </option>
                        );
                      })}
                    {Object.values(project.electrical.circuits)
                      .filter((c) => c.distributionBoardId === id && !c.protectionDeviceId)
                      .map((c) => (
                        <option key={c.id} value={`circuit:${c.id}`}>
                          Ohne Sicherung · {c.label} · {c.name}
                        </option>
                      ))}
                  </SelectField>
                  <p className="field-hint">
                    Sicherung wählen, dann deren Kontakte verbinden. Bei Sicherungen ohne Stromkreis wird der
                    Abgang erst beim Speichern angelegt. N und PE bezeichnen zugehörige Leiter, keine
                    geschalteten Sicherungspole.
                  </p>
                </>
              )}
              <div
                className="contact-pins"
                aria-label={side === "start" ? "Verfügbare Startkontakte" : "Verfügbare Zielkontakte"}
              >
                {selectedContacts(id).map((contact) => (
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
        start={selectedContacts(startId)}
        end={selectedContacts(endId)}
        onChange={(value) => {
          setRows(value);
          setError(null);
        }}
      />
      <button
        onClick={() => {
          setRows(suggested(preview, startId, endId, boardPorts, existing?.id));
          setError(null);
        }}
      >
        Kontaktvorschläge übernehmen
      </button>
      <p className="connection-summary">
        Stromkreis:{" "}
        {inferredCircuit
          ? preview.electrical.circuits[inferredCircuit]?.name
          : "Wird aus der verbundenen Versorgung ermittelt"}
        . Anschluss und Simulation werden automatisch gemeinsam zugeordnet.
      </p>
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
      {(project.electrical.switches[startId] || project.electrical.switches[endId]) && (
        <p className="field-hint">
          Die Kontaktvorlage folgt der Schalterrolle. Wechsel-/Kreuzschalter und Taster werden über ihre
          Schaltgruppe zugeordnet; N und PE werden nicht über den Schaltkontakt geführt.
        </p>
      )}
      <p className="field-hint">
        Stromkreis und Schalterzuordnung folgen der Leitung. Die Leiterprüfung prüft zusätzlich den
        vollständigen Stromweg einschließlich N.
      </p>
      {(error || stale || previewError) && (
        <p className="connection-error" role="alert">
          {stale ? "Das Projekt wurde geändert. Dialog schließen und erneut öffnen." : error || previewError}
        </p>
      )}
      <div className="dialog-actions">
        <button onClick={close}>Abbrechen</button>
        <button
          className="primary"
          onClick={save}
          disabled={stale || !!previewError || !startId || !endId || startId === endId}
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
