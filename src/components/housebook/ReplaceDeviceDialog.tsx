import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "./shared";
import { useProjectStore } from "../../stores/projectStore";
import { housebook } from "../../housebook/model";
import { replaceDevice } from "../../housebook/replaceDevice";
export function ReplaceDeviceDialog({
  kind,
  id,
  onClose,
}: {
  kind: "devices" | "networkNodes";
  id: string;
  onClose: () => void;
}) {
  const p = useProjectStore((s) => s.project),
    book = housebook(p);
  const network = kind === "networkNodes" ? book.networkNodes.find((n) => n.id === id) : undefined;
  const device = kind === "devices" ? p.electrical.devices[id] : undefined;
  const [draft, setDraft] = useState({
    name: network?.name ?? device?.name ?? "",
    manufacturer: "",
    model: "",
    serial: "",
    entity: "",
    ports: network?.ports ?? 1,
    zigbeeAddress: network?.zigbeeAddress ?? "",
    power: device?.ratedPower ?? null,
  });
  const [error, setError] = useState("");
  const links =
    kind === "devices"
      ? Object.values(p.electrical.cables).filter((c) => c.startNodeId === id || c.endNodeId === id).length
      : book.networkLinks.filter((l) => l.from === id || l.to === id).length;
  return (
    <Modal title="Gerät ersetzen" onClose={onClose}>
      <p>
        Position, Geschoss, Raum, Gerätetyp und {links} Leitungsverbindungen bleiben erhalten. Anschlüsse und
        Versorgung werden übernommen. Das Ersatzgerät muss denselben Anschlussstandard verwenden.
        Modellangaben, Seriennummer und HA-Entität unten neu erfassen; gerätespezifisches Foto, Unterlagenlink
        und Wartungsdatum werden geleert.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const ok = useProjectStore
            .getState()
            .commit("Gerät ersetzen", (p) => replaceDevice(p, kind, id, draft));
          if (ok) onClose();
          else setError(useProjectStore.getState().error ?? "Gerät konnte nicht ersetzt werden.");
        }}
      >
        <div className="book-grid">
          {(
            [
              ["name", "Neuer Gerätename"],
              ["manufacturer", "Neuer Hersteller"],
              ["model", "Neues Modell"],
              ["serial", "Neue Seriennummer"],
              ["entity", "Neue HA-Entität"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                required={key === "name"}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </Field>
          ))}
          {network && network.kind !== "zigbee" && (
            <Field label="Ports des Ersatzgeräts">
              <input
                type="number"
                min={1}
                max={256}
                required
                value={draft.ports}
                onChange={(e) => {
                  setError("");
                  setDraft({ ...draft, ports: Number(e.target.value) });
                }}
              />
            </Field>
          )}
          {network?.kind === "zigbee" && (
            <Field label="Zigbee-Ersatzgerät">
              <select
                required
                value={draft.zigbeeAddress}
                onChange={(e) => setDraft({ ...draft, zigbeeAddress: e.target.value })}
              >
                <option value="">Gerät wählen</option>
                {book.zigbee?.devices
                  .filter((d) => !book.networkNodes.some((n) => n.id !== id && n.zigbeeAddress === d.address))
                  .map((d) => (
                    <option key={d.address} value={d.address}>
                      {d.name} · {d.address}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {device && (
            <Field label="Leistungsaufnahme Ersatzgerät (W)">
              <input
                type="number"
                min={0}
                step="any"
                value={draft.power ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, power: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </Field>
          )}
        </div>
        <button>Gerät mit diesen Angaben ersetzen</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
