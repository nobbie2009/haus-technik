import { create } from "zustand";
import { ZigbeeClient, type ZigbeeConnection } from "../network/zigbeeClient";
import {
  emptyZigbee,
  readZigbeeDevices,
  readZigbeeMap,
  readZigbeeScanFailures,
  type ZigbeeSnapshot,
} from "../network/zigbeeModel";
import { useProjectStore } from "./projectStore";
import { housebook, setHousebook } from "../housebook/model";

interface LiveDevice {
  lqi: number | null;
  battery: number | null;
  availability: string;
  receivedAt: string;
}
interface State {
  interval: 5 | 10;
  projectId: string | null;
  running: boolean;
  connected: boolean;
  scanning: boolean;
  error: string;
  refreshedAt: string | null;
  snapshot: ZigbeeSnapshot;
  live: Record<string, LiveDevice>;
  start: (config: ZigbeeConnection, seconds: 5 | 10) => void;
  stop: () => void;
  scan: () => void;
}
let client: ZigbeeClient | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;
let listTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let scanId: string | null = null;
function persist(snapshot: ZigbeeSnapshot, projectId: string) {
  if (useProjectStore.getState().project.id !== projectId) return;
  useProjectStore.getState().commit("Zigbee-Geräte und Kartenstand übernehmen", (p) => {
    const book = housebook(p);
    book.zigbee = structuredClone(snapshot);
    setHousebook(p, book);
  });
}
export const useZigbeeStore = create<State>((set, get) => ({
  interval: 10,
  projectId: null,
  running: false,
  connected: false,
  scanning: false,
  error: "",
  refreshedAt: null,
  snapshot: emptyZigbee(),
  live: {},
  stop() {
    generation++;
    client?.stop();
    client = null;
    if (timer) clearInterval(timer);
    if (scanTimer) clearTimeout(scanTimer);
    if (listTimer) clearTimeout(listTimer);
    timer = null;
    scanTimer = null;
    listTimer = null;
    scanId = null;
    set({ running: false, connected: false, scanning: false });
  },
  start(config, seconds) {
    get().stop();
    const run = generation;
    const project = useProjectStore.getState().project;
    const stored = housebook(project).zigbee;
    let pending = structuredClone(
      stored && (stored.baseTopic ?? "zigbee2mqtt") === config.baseTopic ? stored : emptyZigbee(),
    );
    pending.baseTopic = config.baseTopic;
    let receivedDevices = false;
    const live: Record<string, LiveDevice> = {};
    const flush = () => {
      if (run === generation)
        set({
          snapshot: structuredClone(pending),
          live: structuredClone(live),
          refreshedAt: new Date().toISOString(),
        });
    };
    set({
      projectId: project.id,
      interval: seconds,
      running: true,
      connected: false,
      error: "",
      live: {},
      snapshot: pending,
      refreshedAt: null,
    });
    try {
      client = new ZigbeeClient(config, {
        ready() {
          if (run !== generation) return;
          set({ connected: true });
          timer = setInterval(flush, seconds * 1000);
          listTimer = setTimeout(() => {
            if (!receivedDevices && run === generation)
              set({ error: "Keine Z2M-Geräteliste empfangen. MQTT-Basistopic und Zigbee2MQTT prüfen." });
          }, 15000);
        },
        error(message) {
          if (run !== generation) return;
          get().stop();
          set({ error: message });
        },
        message(topic, payload, retained) {
          if (run !== generation || project.id !== useProjectStore.getState().project.id) return;
          if (topic === "bridge/devices") {
            receivedDevices = true;
            set({ error: "" });
            const devices = readZigbeeDevices(payload);
            pending = {
              ...pending,
              devices,
              links: pending.links.filter(
                (l) => devices.some((d) => d.address === l.from) && devices.some((d) => d.address === l.to),
              ),
            };
            if (listTimer) clearTimeout(listTimer);
            persist(pending, project.id);
            flush();
          } else if (
            topic === "bridge/state" &&
            (payload === "offline" ||
              (payload && typeof payload === "object" && "state" in payload && payload.state === "offline"))
          ) {
            get().stop();
            set({ error: "Zigbee2MQTT meldet offline. Angezeigt wird der letzte Stand." });
          } else if (topic === "bridge/response/networkmap") {
            const response = payload as {
              status?: string;
              transaction?: string;
              data?: { type?: string };
            } | null;
            if (response?.status === "error") {
              if (response.transaction === scanId) {
                if (scanTimer) clearTimeout(scanTimer);
                scanId = null;
                set({
                  scanning: false,
                  error: "Zigbee2MQTT konnte die Netzwerkkarte nicht vollständig abfragen.",
                });
              }
              return;
            }
            if (response?.data?.type !== "raw") return;
            const links = readZigbeeMap(payload);
            pending = {
              ...pending,
              links,
              scannedAt: retained ? null : new Date().toISOString(),
              failures: readZigbeeScanFailures(payload),
            };
            if (response.transaction === scanId) {
              if (scanTimer) clearTimeout(scanTimer);
              scanId = null;
              set({ scanning: false, error: "" });
            }
            persist(pending, project.id);
            flush();
          } else {
            const available = topic.endsWith("/availability");
            const name = available ? topic.slice(0, -13) : topic;
            const device = pending.devices.find((d) => d.name === name || d.address === name);
            if (!device) return;
            const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
            const old = live[device.address] ?? {
              lqi: null,
              battery: null,
              availability: "unbekannt",
              receivedAt: "",
            };
            live[device.address] = {
              ...old,
              lqi:
                typeof value.linkquality === "number" && value.linkquality >= 0 && value.linkquality <= 255
                  ? value.linkquality
                  : old.lqi,
              battery:
                typeof value.battery === "number" && value.battery >= 0 && value.battery <= 100
                  ? value.battery
                  : old.battery,
              availability:
                available && ["online", "offline"].includes(String(value.state ?? payload))
                  ? String(value.state ?? payload)
                  : old.availability,
              receivedAt: new Date().toISOString(),
            };
          }
        },
      });
    } catch (error) {
      get().stop();
      set({ error: error instanceof Error ? error.message : "Verbindung fehlgeschlagen." });
    }
  },
  scan() {
    if (!get().connected || get().scanning || !client) return;
    scanId = crypto.randomUUID();
    set({ scanning: true, error: "" });
    client.scan(scanId);
    scanTimer = setTimeout(() => {
      get().stop();
      set({
        error:
          "Keine Scanantwort nach 3 Minuten. Empfang gestoppt; ein bereits laufender Z2M-Scan kann dort noch weiterlaufen.",
      });
    }, 180000);
  },
}));
useProjectStore.subscribe((state, before) => {
  if (state.project.id !== before.project.id) {
    useZigbeeStore.getState().stop();
    useZigbeeStore.setState({ projectId: null, snapshot: emptyZigbee(), live: {}, error: "" });
  }
});
