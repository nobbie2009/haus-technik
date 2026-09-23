import { useEffect, useRef, useState } from "react";
import type { NetworkNode } from "../../network/model";
import { useProjectStore } from "../../stores/projectStore";
import { TextField } from "../Fields";
import { Modal } from "../dialogs/Modal";
import { loadHomeAssistantConnection } from "../../persistence/homeAssistantConnection";
import { applyArea, readRegistry, withHaRegistry, type AreaPreview } from "../../network/homeAssistantAreas";

export function ZigbeeRoom({
  node,
  locked,
  change,
}: {
  node: NetworkNode;
  locked: boolean;
  change: (f: (n: NetworkNode) => void) => boolean;
}) {
  const project = useProjectStore((s) => s.project);
  const room = node.roomId ? project.rooms[node.roomId] : undefined;
  const validRoom = room?.floorId === node.floorId ? room : undefined;
  const [open, setOpen] = useState(false);
  return (
    <>
      <label className="field">
        Raumzuordnung
        <select
          aria-label="Zigbee-Raum"
          disabled={locked}
          value={validRoom?.id ?? ""}
          onChange={(e) =>
            change((n) => {
              if (e.target.value) n.roomId = e.target.value;
              else delete n.roomId;
            })
          }
        >
          <option value="">Kein Raum</option>
          {Object.values(project.rooms)
            .filter((r) => r.floorId === node.floorId)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      {node.roomId && !validRoom && (
        <p>Der zugeordnete Raum ist nicht mehr auf dieser Etage vorhanden. Bitte neu zuordnen.</p>
      )}
      {validRoom && (
        <TextField
          label="Raumname"
          value={validRoom.name}
          disabled={locked || !!project.layers[validRoom.layerId]?.locked}
          onCommit={(name) =>
            useProjectStore.getState().commit("Raum benennen", (p) => {
              p.rooms[validRoom.id]!.name = name;
            })
          }
        />
      )}
      <p>Räume im Haus-Grundriss zeichnen; hier kannst du das Gerät zuordnen und den Raum benennen.</p>
      <button disabled={!validRoom || locked} onClick={() => setOpen(true)}>
        Raum an Home Assistant übertragen …
      </button>
      {open && validRoom && !locked && (
        <Modal title="Raumzuordnung an Home Assistant" onClose={() => setOpen(false)}>
          <AreaTransfer
            key={`${project.id}/${node.id}/${validRoom.id}/${validRoom.name}`}
            address={node.zigbeeAddress!}
            roomName={validRoom.name}
          />
        </Modal>
      )}
    </>
  );
}
function AreaTransfer({ address, roomName }: { address: string; roomName: string }) {
  const [preview, setPreview] = useState<AreaPreview | null>(null);
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const config = useRef<ReturnType<typeof loadHomeAssistantConnection> | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function run(write: boolean) {
    if (busy) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setMessage("");
    try {
      if (!write) config.current = loadHomeAssistantConnection();
      if (!config.current) throw new Error("Bitte zuerst die Vorschau laden.");
      await withHaRegistry(config.current, abort.signal, async (request) => {
        if (write && preview) {
          await applyArea(request, address, preview, target, roomName);
          if (!abort.signal.aborted) {
            setPreview(null);
            setMessage("Raumzuordnung in Home Assistant gespeichert.");
          }
        } else {
          const result = await readRegistry(request, address);
          if (!abort.signal.aborted) {
            setPreview(result);
            setTarget(
              result.areas.find((a) => a.name.toLocaleLowerCase() === roomName.toLocaleLowerCase())
                ?.area_id ?? "",
            );
          }
        }
      });
    } catch (error) {
      if (!abort.signal.aborted) {
        setPreview(null);
        setMessage(error instanceof Error ? error.message : "Übertragung fehlgeschlagen.");
      }
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <p>
        App-Raum: <strong>{roomName}</strong>. Die Vorschau liest nur. Erst „Jetzt übertragen“ ändert den
        Bereich dieses Geräts in Home Assistant.
      </p>
      <p>
        Administratorzugang und aktivierte Home-Assistant-Discovery in Zigbee2MQTT erforderlich. Eigene
        Bereichszuordnungen einzelner HA-Entitäten haben Vorrang vor dem Gerätebereich.
      </p>
      <button disabled={busy} onClick={() => void run(false)}>
        Vorschau aus Home Assistant laden
      </button>
      {preview && (
        <>
          <p>
            Gerät: {preview.device.name_by_user ?? preview.device.name ?? address}
            <br />
            Bisheriger HA-Bereich:{" "}
            {preview.areas.find((a) => a.area_id === preview.device.area_id)?.name ??
              (preview.device.area_id || "Keiner")}
          </p>
          <label className="field">
            Zielbereich in Home Assistant
            <select
              aria-label="HA-Zielbereich"
              value={target}
              disabled={busy}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Neu anlegen: {roomName}</option>
              {preview.areas.map((a) => (
                <option key={a.area_id} value={a.area_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Danach: {preview.areas.find((a) => a.area_id === target)?.name ?? roomName}. Bestehende
            HA-Bereiche werden nicht umbenannt. Lokale Änderungen übertragen sich erst bei erneutem Aufruf.
          </p>
          <button disabled={busy} onClick={() => void run(true)}>
            Jetzt übertragen
          </button>
        </>
      )}
      <p role="status">{busy ? "Home Assistant wird abgefragt …" : message}</p>
    </>
  );
}
