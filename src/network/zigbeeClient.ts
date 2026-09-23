export interface ZigbeeConnection {
  url: string;
  token: string;
  baseTopic: string;
}
export function zigbeeSocketUrl(url: string) {
  const parsed = new URL(url);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Home-Assistant-Basisadresse ohne Zugangsdaten, Query oder Fragment eingeben.");
  if (typeof location !== "undefined" && location.protocol === "https:" && parsed.protocol !== "https:")
    throw new Error("Für die HTTPS-App auch eine HTTPS-Adresse von Home Assistant verwenden.");
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/api/websocket`;
  return parsed.href;
}

/** Home Assistant's MQTT subscription API requires an administrator token.
 * Only the explicit networkmap action publishes; live refresh never requests scans.
 */
export class ZigbeeClient {
  private socket: WebSocket;
  private stopped = false;
  private ready = false;
  private id = 2;
  private watchdog: ReturnType<typeof setTimeout>;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  constructor(
    private config: ZigbeeConnection,
    private callbacks: {
      ready: () => void;
      message: (topic: string, payload: unknown, retained: boolean) => void;
      error: (message: string) => void;
    },
  ) {
    if (!config.token.trim())
      throw new Error("Home-Assistant-Token fehlt. Unter Hausakte → Home Assistant hinterlegen.");
    if (
      !config.baseTopic ||
      config.baseTopic.length > 200 ||
      /[+#\s\u0000]/.test(config.baseTopic) ||
      config.baseTopic.endsWith("/")
    )
      throw new Error("Gültiges Zigbee2MQTT-Basistopic ohne Platzhalter eingeben.");
    this.socket = new WebSocket(zigbeeSocketUrl(config.url));
    this.watchdog = setTimeout(() => this.fail("Home Assistant antwortet nicht rechtzeitig."), 15000);
    this.socket.onmessage = (event) => {
      if (this.stopped) return;
      try {
        if (typeof event.data !== "string" || event.data.length > 4_000_000) throw new Error();
        const data = JSON.parse(event.data);
        if (data.type === "auth_required")
          this.socket.send(JSON.stringify({ type: "auth", access_token: config.token.trim() }));
        else if (data.type === "auth_invalid") this.fail("Home Assistant hat den Zugriffstoken abgelehnt.");
        else if (data.type === "auth_ok")
          this.socket.send(JSON.stringify({ id: 1, type: "mqtt/subscribe", topic: `${config.baseTopic}/#` }));
        else if (data.type === "result" && data.success === false)
          this.fail(
            "MQTT-Zugriff abgelehnt. MQTT-Integration und Administratorberechtigung des Tokens prüfen.",
          );
        else if (data.type === "result" && data.id === 1 && data.success) {
          clearTimeout(this.watchdog);
          this.ready = true;
          callbacks.ready();
          this.heartbeat = setInterval(() => {
            clearTimeout(this.watchdog);
            this.socket.send(JSON.stringify({ id: this.id++, type: "ping" }));
            this.watchdog = setTimeout(() => this.fail("Verbindung zu Home Assistant unterbrochen."), 8000);
          }, 10000);
        } else if (data.type === "pong") clearTimeout(this.watchdog);
        else if (
          data.type === "event" &&
          data.id === 1 &&
          typeof data.event?.topic === "string" &&
          data.event.topic.startsWith(`${config.baseTopic}/`)
        ) {
          let payload = data.event.payload;
          if (typeof payload === "string") {
            try {
              payload = JSON.parse(payload);
            } catch {
              /* Availability can be plain text. */
            }
          }
          callbacks.message(
            data.event.topic.slice(config.baseTopic.length + 1),
            payload,
            Boolean(data.event.retain),
          );
        }
      } catch {
        this.fail("Ungültige oder zu große Antwort von Home Assistant / Zigbee2MQTT.");
      }
    };
    this.socket.onerror = () =>
      this.fail("Verbindung fehlgeschlagen. Home-Assistant-Adresse, Erreichbarkeit und HTTPS prüfen.");
    this.socket.onclose = () => {
      if (!this.stopped) this.fail("Verbindung zu Home Assistant geschlossen.");
    };
  }
  scan(transaction: string) {
    if (!this.ready || this.stopped) throw new Error("Zuerst die Aktualisierung starten.");
    this.socket.send(
      JSON.stringify({
        id: this.id++,
        type: "call_service",
        domain: "mqtt",
        service: "publish",
        service_data: {
          topic: `${this.config.baseTopic}/bridge/request/networkmap`,
          payload: JSON.stringify({ type: "raw", routes: true, transaction }),
          retain: false,
        },
      }),
    );
  }
  private fail(message: string) {
    if (this.stopped) return;
    this.stop();
    this.callbacks.error(message);
  }
  stop() {
    this.stopped = true;
    this.ready = false;
    clearTimeout(this.watchdog);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.socket.close();
  }
}
