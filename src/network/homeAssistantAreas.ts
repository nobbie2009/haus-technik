import { z } from "zod";
import { zigbeeSocketUrl } from "./zigbeeClient";

const areaSchema = z.object({ area_id: z.string(), name: z.string() });
const deviceSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  name_by_user: z.string().nullable().optional(),
  area_id: z.string().nullable(),
  identifiers: z.array(z.tuple([z.string(), z.string()])),
});
export type HaArea = z.infer<typeof areaSchema>;
export type HaDevice = z.infer<typeof deviceSchema>;
type Request = (command: Record<string, unknown>) => Promise<unknown>;

/** A short-lived registry session, separate from live MQTT reception. */
export async function withHaRegistry<T>(
  config: { url: string; token: string },
  signal: AbortSignal,
  work: (request: Request) => Promise<T>,
): Promise<T> {
  if (!config.token || !config.url)
    throw new Error("Zuerst den Home-Assistant-Zugang in der Hausakte speichern.");
  if (signal.aborted) throw new Error("Abgebrochen.");
  const socket = new WebSocket(zigbeeSocketUrl(config.url));
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let rejectAuth: (error: Error) => void = () => {};
  const fail = () => {
    const error = new Error(
      "Home-Assistant-Verbindung beendet oder Zeitüberschreitung. Bei einer Übertragung den Stand vor erneutem Schreiben prüfen.",
    );
    rejectAuth(error);
    for (const item of pending.values()) item.reject(error);
    pending.clear();
    socket.close();
  };
  const timer = setTimeout(fail, 30000);
  signal.addEventListener("abort", fail, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      rejectAuth = reject;
      socket.onerror = fail;
      socket.onclose = fail;
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "auth_required")
            socket.send(JSON.stringify({ type: "auth", access_token: config.token }));
          else if (msg.type === "auth_ok") resolve();
          else if (msg.type === "auth_invalid") reject(new Error("Home-Assistant-Zugang ungültig."));
          else if (msg.type === "result") {
            const item = pending.get(msg.id);
            if (!item) return;
            pending.delete(msg.id);
            if (msg.success) item.resolve(msg.result);
            else
              item.reject(
                new Error(
                  "Home Assistant hat die Aktion abgelehnt. Administratorrechte und Gerätezuordnung prüfen.",
                ),
              );
          }
        } catch {
          fail();
        }
      };
    });
    const request: Request = (command) =>
      new Promise((resolve, reject) => {
        if (signal.aborted || socket.readyState !== WebSocket.OPEN) {
          reject(new Error("Verbindung nicht verfügbar."));
          return;
        }
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ ...command, id }));
      });
    return await work(request);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", fail);
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
  }
}
export async function readRegistry(request: Request, address: string) {
  const areas = z.array(areaSchema).parse(await request({ type: "config/area_registry/list" }));
  const devices = z.array(deviceSchema).parse(await request({ type: "config/device_registry/list" }));
  const matches = devices.filter((d) =>
    d.identifiers.some(
      ([domain, id]) => domain === "mqtt" && id.toLowerCase() === `zigbee2mqtt_${address.toLowerCase()}`,
    ),
  );
  if (matches.length !== 1)
    throw new Error("Keine eindeutige Z2M-Gerätezuordnung in Home Assistant. MQTT-Discovery prüfen.");
  return { areas, device: matches[0]! };
}
export interface AreaPreview {
  areas: HaArea[];
  device: HaDevice;
}
export async function applyArea(
  request: Request,
  address: string,
  preview: AreaPreview,
  targetId: string,
  name: string,
) {
  const fresh = await readRegistry(request, address);
  if (fresh.device.id !== preview.device.id || fresh.device.area_id !== preview.device.area_id)
    throw new Error("Die Gerätezuordnung wurde inzwischen geändert. Vorschau erneut laden.");
  let area = fresh.areas.find((a) => a.area_id === targetId);
  if (targetId && (!area || area.name !== preview.areas.find((a) => a.area_id === targetId)?.name))
    throw new Error("Der Zielbereich wurde geändert. Vorschau erneut laden.");
  if (!targetId) {
    if (!name.trim()) throw new Error("Raumnamen eingeben.");
    const matching = fresh.areas.filter(
      (a) => a.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    );
    if (matching.length)
      throw new Error("Ein gleichnamiger Bereich existiert bereits. Vorschau laden und diesen auswählen.");
    area = areaSchema.parse(await request({ type: "config/area_registry/create", name: name.trim() }));
  }
  try {
    await request({
      type: "config/device_registry/update",
      device_id: fresh.device.id,
      area_id: area!.area_id,
    });
  } catch {
    throw new Error(
      `Bereich „${area!.name}“ ist vorhanden; Gerätezuordnung nicht bestätigt. Vorschau erneut laden und den vorhandenen Bereich auswählen.`,
    );
  }
}
