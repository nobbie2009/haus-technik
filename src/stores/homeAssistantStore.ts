import { create } from "zustand";
import { loadHomeAssistantConnection } from "../persistence/homeAssistantConnection";
export interface HaState {
  entity_id: string;
  state: string;
  last_updated?: string;
  attributes?: { unit_of_measurement?: string };
}
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
interface LiveState {
  states: HaState[];
  readAt: number;
  running: boolean;
  busy: boolean;
  error: string;
  seconds: number;
  visible: boolean;
  stop: (clear?: boolean) => void;
  start: (seconds: number, once?: boolean) => void;
}
export const useHomeAssistantStore = create<LiveState>((set, get) => ({
  states: [],
  readAt: 0,
  running: false,
  busy: false,
  error: "",
  seconds: 10,
  visible: true,
  stop(clear = false) {
    generation++;
    clearTimeout(timer);
    controller?.abort();
    set({ running: false, busy: false, ...(clear ? { states: [], readAt: 0, error: "" } : {}) });
  },
  start(seconds, once = false) {
    get().stop(true);
    const session = generation;
    seconds = seconds === 5 ? 5 : 10;
    set({ running: !once, seconds });
    const poll = async () => {
      if (session !== generation) return;
      set({ busy: true });
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 15000);
      try {
        const { url, token } = loadHomeAssistantConnection();
        const base = new URL(url);
        if (
          !["http:", "https:"].includes(base.protocol) ||
          base.username ||
          base.password ||
          base.search ||
          base.hash ||
          !token.trim()
        )
          throw new Error("Home-Assistant-Adresse und Zugriffstoken in der Hausakte prüfen.");
        const response = await fetch(`${base.href.replace(/\/$/, "")}/api/states`, {
          headers: { Authorization: `Bearer ${token.trim()}`, Accept: "application/json" },
          signal: request.signal,
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Home Assistant: HTTP ${response.status}.`);
        const data: unknown = await response.json();
        if (
          !Array.isArray(data) ||
          !data.every((s) => s && typeof s.entity_id === "string" && typeof s.state === "string")
        )
          throw new Error("Ungültige Entitätenliste.");
        if (session === generation)
          set({
            states: data.map((s) => ({
              entity_id: s.entity_id,
              state: s.state,
              last_updated: typeof s.last_updated === "string" ? s.last_updated : undefined,
              attributes: {
                unit_of_measurement:
                  typeof s.attributes?.unit_of_measurement === "string"
                    ? s.attributes.unit_of_measurement
                    : undefined,
              },
            })),
            readAt: Date.now(),
            error: "",
          });
      } catch (e) {
        if (session === generation)
          set({
            error:
              e instanceof Error && e.name === "AbortError"
                ? "Home-Assistant-Abruf: Zeitlimit erreicht."
                : "Home Assistant nicht erreichbar oder Antwort ungültig. Verbindung in der Hausakte prüfen.",
          });
      } finally {
        clearTimeout(timeout);
        if (session === generation) {
          set({ busy: false });
          if (!once) timer = setTimeout(() => void poll(), seconds * 1000);
        }
      }
    };
    void poll();
  },
}));
