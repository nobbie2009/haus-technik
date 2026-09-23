import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { housebook, setHousebook } from "../../src/housebook/model";
import { addNetworkNode } from "../../src/network/model";
import { readZigbeeDevices, readZigbeeMap } from "../../src/network/zigbeeModel";
import { zigbeeSocketUrl } from "../../src/network/zigbeeClient";
import { useProjectStore } from "../../src/stores/projectStore";
import { useZigbeeStore } from "../../src/stores/zigbeeStore";
import { parseProject } from "../../src/core/validation";

const devices = [
  {
    ieee_address: "0x0000000000000001",
    friendly_name: "Router Beispiel",
    type: "Router",
    definition: { model: "Test", vendor: "Beispiel" },
    secret: "discard",
  },
];
class Socket {
  static latest: Socket;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: Record<string, unknown>[] = [];
  closed = false;
  constructor(public url: string) {
    Socket.latest = this;
  }
  send(value: string) {
    this.sent.push(JSON.parse(value));
  }
  close() {
    this.closed = true;
  }
  emit(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
  topic(topic: string, payload: unknown) {
    this.emit({
      id: 1,
      type: "event",
      event: { topic: `zigbee2mqtt/${topic}`, payload: JSON.stringify(payload), retain: false },
    });
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", Socket);
  useProjectStore.getState().replace(createProject());
});
afterEach(() => {
  useZigbeeStore.getState().stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function start() {
  useZigbeeStore
    .getState()
    .start({ url: "http://ha.example.test:8123", token: "test-token", baseTopic: "zigbee2mqtt" }, 5);
  const ws = Socket.latest;
  ws.emit({ type: "auth_required" });
  ws.emit({ type: "auth_ok" });
  ws.emit({ type: "result", id: 1, success: true });
  ws.topic("bridge/devices", devices);
  return ws;
}
it("liest Geräte, aktualisiert nur alle fünf Sekunden und startet niemals automatisch einen Scan", () => {
  const ws = start();
  expect(ws.sent[0]).toEqual({ type: "auth", access_token: "test-token" });
  expect(ws.url).not.toContain("test-token");
  ws.topic("Router Beispiel", { linkquality: 170, battery: 90, network_key: "discard" });
  expect(Object.keys(useZigbeeStore.getState().live)).toHaveLength(0);
  vi.advanceTimersByTime(5000);
  expect(useZigbeeStore.getState().live[devices[0]!.ieee_address]).toMatchObject({ lqi: 170, battery: 90 });
  expect(ws.sent.some((m) => m.type === "call_service")).toBe(false);
  const serialized = JSON.stringify(useProjectStore.getState().project);
  expect(serialized).not.toContain("discard");
  expect(serialized).not.toContain("test-token");
  const before = useZigbeeStore.getState().refreshedAt;
  useZigbeeStore.getState().stop();
  ws.topic("Router Beispiel", { linkquality: 1 });
  vi.advanceTimersByTime(30000);
  expect(ws.closed).toBe(true);
  expect(useZigbeeStore.getState().refreshedAt).toBe(before);
});
it("fordert Topologie nur ausdrücklich an, verhindert parallele Scans und speichert gerichtete LQI", () => {
  const ws = start();
  useZigbeeStore.getState().scan();
  useZigbeeStore.getState().scan();
  const calls = ws.sent.filter((m) => m.type === "call_service");
  expect(calls).toHaveLength(1);
  const request = JSON.parse((calls[0]!.service_data as { payload: string }).payload);
  ws.topic("bridge/response/networkmap", {
    transaction: request.transaction,
    status: "ok",
    data: {
      type: "raw",
      value: {
        links: [
          {
            source: { ieeeAddr: devices[0]!.ieee_address },
            target: { ieeeAddr: "0x0000000000000002" },
            lqi: 88,
            routes: [{ destinationAddress: 42 }],
          },
        ],
      },
    },
  });
  expect(useZigbeeStore.getState().scanning).toBe(false);
  expect(housebook(useProjectStore.getState().project).zigbee!.links[0]).toMatchObject({
    lqi: 88,
    routes: [42],
  });
});
it("beendet den Empfang beim Projektwechsel und weist ungültige Verbindungsadressen zurück", () => {
  const ws = start();
  useProjectStore.getState().replace(createProject("Anderes Projekt"));
  expect(ws.closed).toBe(true);
  expect(useZigbeeStore.getState().running).toBe(false);
  ws.topic("bridge/devices", devices);
  expect(housebook(useProjectStore.getState().project).zigbee).toBeUndefined();
  expect(() => zigbeeSocketUrl("https://user:pass@example.test")).toThrow();
  expect(() => zigbeeSocketUrl("https://example.test?token=secret")).toThrow();
});
it("behält Platzierungen beim erneuten Import und validiert doppelte Geräte", () => {
  const ws = start(),
    p = useProjectStore.getState().project;
  const id = addNetworkNode(p, p.floorOrder[0]!, { x: 100, y: 200 }, "zigbee", devices[0]!.ieee_address);
  ws.topic("bridge/devices", [{ ...devices[0], friendly_name: "Umbenannt" }]);
  expect(
    housebook(useProjectStore.getState().project).networkNodes.find((n) => n.id === id)?.position,
  ).toEqual({ x: 100, y: 200 });
  expect(() =>
    addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "zigbee", devices[0]!.ieee_address),
  ).toThrow();
  expect(() => parseProject(JSON.parse(JSON.stringify(p)))).not.toThrow();
  expect(() => readZigbeeDevices([devices[0], devices[0]])).toThrow();
  expect(() => readZigbeeMap({ data: {} })).toThrow();
  const b = housebook(p);
  b.networkLinks.push({
    id: crypto.randomUUID(),
    name: "Falsch",
    from: id,
    to: id,
    fromPort: 1,
    toPort: 1,
    cableType: "Cat 6",
    allowance: 0,
  });
  setHousebook(p, b);
  expect(() => parseProject(p)).toThrow(/Zigbee/);
});
