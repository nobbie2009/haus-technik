import { useState } from "react";
import { housebook, setHousebook } from "../../housebook/model";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { newId } from "../../utils/uuid";
import { Modal } from "../dialogs/Modal";
import { networkCableLength } from "../../network/cables";

export function NetworkConnectionDialog() {
  const request = useEditorStore((s) => s.networkRequest)!;
  const project = useProjectStore((s) => s.project);
  const error = useProjectStore((s) => s.error);
  const book = housebook(project);
  const from = book.networkNodes.find((n) => n.id === request.from);
  const to = book.networkNodes.find((n) => n.id === request.to);
  const ports = (id: string, count: number) =>
    Array.from({ length: count }, (_, i) => i + 1).filter(
      (port) =>
        !book.networkLinks.some(
          (l) => (l.from === id && l.fromPort === port) || (l.to === id && l.toPort === port),
        ),
    );
  const fromPorts = ports(request.from, from?.ports ?? 0),
    toPorts = ports(request.to, to?.ports ?? 0);
  const preferred = (node: typeof from, free: number[]) =>
    free.find((port) =>
      node?.poe?.role === "consumer"
        ? port === node.poe.inputPort
        : node?.poe?.role === "source" && node.poe.enabledPorts.includes(port),
    ) ??
    free[0] ??
    0;
  const [fromPort, setFromPort] = useState(preferred(from, fromPorts));
  const [toPort, setToPort] = useState(preferred(to, toPorts));
  const [name, setName] = useState(`${from?.name ?? "Start"} → ${to?.name ?? "Ziel"}`.slice(0, 150));
  const [cableType, setCableType] = useState("Cat 6A");
  const [allowance, setAllowance] = useState(0);
  const close = () => useEditorStore.getState().cancel();
  const link = {
    id: "",
    name,
    from: request.from,
    to: request.to,
    fromPort,
    toPort,
    cableType,
    allowance: allowance * 1000,
    medium: "ethernet" as const,
    route: request.route,
  };
  return (
    <Modal title="Netzwerkkabel anschließen" onClose={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            useProjectStore.getState().commit("Netzwerkkabel verlegen und anschließen", (draft) => {
              const next = housebook(draft);
              next.networkLinks.push({ ...link, id: newId() });
              setHousebook(draft, next);
            })
          )
            close();
        }}
      >
        {error && <p role="alert">{error}</p>}
        <p>
          {from?.name} ({project.floors[from?.floorId ?? ""]?.name}) → {to?.name} (
          {project.floors[to?.floorId ?? ""]?.name})
        </p>
        <p>
          Leitungsweg und Portanschlüsse werden gemeinsam gespeichert. PoE wird aus dieser Verbindung
          abgeleitet.
        </p>
        <div className="book-grid">
          <label className="field">
            Startport
            <select
              aria-label="Startport"
              value={fromPort}
              onChange={(e) => setFromPort(Number(e.target.value))}
            >
              {!fromPorts.length && <option value={0}>Kein freier Port</option>}
              {fromPorts.map((port) => (
                <option key={port} value={port}>
                  {port}
                  {from?.poe?.role === "source" && from.poe.enabledPorts.includes(port) ? " · PoE aktiv" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Zielport
            <select aria-label="Zielport" value={toPort} onChange={(e) => setToPort(Number(e.target.value))}>
              {!toPorts.length && <option value={0}>Kein freier Port</option>}
              {toPorts.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Kabelkennzeichnung
            <input required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Kabeltyp
            <input
              required
              maxLength={150}
              value={cableType}
              onChange={(e) => setCableType(e.target.value)}
            />
          </label>
          <label className="field">
            Längenzuschlag (m)
            <input
              type="number"
              min={0}
              step="any"
              required
              value={allowance}
              onChange={(e) => setAllowance(Number(e.target.value))}
            />
          </label>
        </div>
        {from && to && (
          <p>
            Gesamtlänge einschließlich Etagenhöhe und Zuschlag:{" "}
            {(networkCableLength(project, from, to, link) / 1000).toLocaleString("de-DE", {
              maximumFractionDigits: 2,
            })}{" "}
            m
          </p>
        )}
        <div className="book-actions">
          <button disabled={!from || !to || !fromPort || !toPort}>Kabel und Anschlüsse speichern</button>
          <button type="button" onClick={close}>
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}
