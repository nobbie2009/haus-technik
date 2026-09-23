import { afterEach, expect, it, vi } from "vitest";
import { applyArea, readRegistry, withHaRegistry } from "../../src/network/homeAssistantAreas";
import { batteryLabel, readBattery } from "../../src/network/zigbeeBattery";

const address = "0x0000000000000001";
const device = {
  id: "ha-device",
  name: "Sensor",
  area_id: "old",
  identifiers: [["mqtt", `zigbee2mqtt_${address}`]] as [string, string][],
};
const areas = [
  { area_id: "old", name: "Alt" },
  { area_id: "new", name: "Küche" },
];
const preview = { device, areas };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function registry(current = device) {
  return vi.fn(async (command: Record<string, unknown>): Promise<unknown> => {
    if (command.type === "config/area_registry/list") return areas;
    if (command.type === "config/device_registry/list") return [current];
    if (command.type === "config/area_registry/create") return { area_id: "created", name: command.name };
    return {};
  });
}
it("liest eine Vorschau ohne Schreibzugriff und ordnet nur über MQTT-IEEE zu", async () => {
  const request = registry();
  expect(await readRegistry(request, address)).toEqual(preview);
  expect(request.mock.calls).toHaveLength(2);
  await expect(
    readRegistry(registry({ ...device, identifiers: [["other", `zigbee2mqtt_${address}`]] }), address),
  ).rejects.toThrow("Keine eindeutige");
});
it("überträgt einen bestehenden Bereich ohne Umbenennen oder Neuanlegen", async () => {
  const request = registry();
  await applyArea(request, address, preview, "new", "Küche");
  expect(request.mock.calls[2]![0]).toEqual({
    type: "config/device_registry/update",
    device_id: "ha-device",
    area_id: "new",
  });
  expect(request.mock.calls).toHaveLength(3);
});
it("legt einen neuen Bereich an und nutzt dessen bestätigte Kennung", async () => {
  const request = registry();
  await applyArea(request, address, preview, "", "Büro");
  expect(request.mock.calls[2]![0]).toEqual({ type: "config/area_registry/create", name: "Büro" });
  expect(request.mock.calls[3]![0]).toEqual({
    type: "config/device_registry/update",
    device_id: "ha-device",
    area_id: "created",
  });
});
it("blockiert veraltete Vorschauen und doppelte Bereichsnamen", async () => {
  const changed = registry({ ...device, area_id: "elsewhere" });
  await expect(applyArea(changed, address, preview, "new", "Küche")).rejects.toThrow("inzwischen geändert");
  expect(changed.mock.calls).toHaveLength(2);
  const duplicate = registry();
  await expect(applyArea(duplicate, address, preview, "", "Küche")).rejects.toThrow("existiert bereits");
  expect(duplicate.mock.calls).toHaveLength(2);
});
it("meldet einen Teilerfolg ohne blind einen zweiten Bereich anzulegen", async () => {
  const base = registry();
  const request = async (command: Record<string, unknown>) => {
    if (command.type === "config/device_registry/update") throw new Error("offline");
    return base(command);
  };
  await expect(applyArea(request, address, preview, "", "Büro")).rejects.toThrow(
    "Bereich „Büro“ ist vorhanden",
  );
});
it("unterscheidet leere Batterien, fehlende Werte und Warnungen; andere Nachrichten verjüngen den Wert nicht", () => {
  const empty = { battery: null, batteryLow: null, batteryReceivedAt: null, batteryRetained: false };
  expect(batteryLabel(empty)).toBe("Batterie: unbekannt");
  const value = readBattery({ battery: 0, battery_low: true }, empty, true);
  expect(batteryLabel(value)).toBe("Batterie: 0 % · Batteriewarnung");
  expect(value.batteryRetained).toBe(true);
  expect(readBattery({ battery: 101, linkquality: 90 }, value, false)).toEqual(value);
  expect(readBattery({ battery: "85" }, empty, false)).toEqual(empty);
  expect(readBattery({ battery_low: false }, value, false).batteryLow).toBe(false);
});

class RegistrySocket {
  static latest: RegistrySocket;
  static OPEN = 1;
  readyState = 1;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: Record<string, unknown>[] = [];
  constructor() {
    RegistrySocket.latest = this;
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
it("beendet wartende Registry-Abfragen beim Schließen ohne weitere Schreibbefehle", async () => {
  vi.stubGlobal("WebSocket", RegistrySocket);
  const abort = new AbortController();
  const work = withHaRegistry(
    { url: "http://ha.example.test", token: "fake-token" },
    abort.signal,
    (request) => readRegistry(request, address),
  );
  const rejected = expect(work).rejects.toThrow("beendet");
  const ws = RegistrySocket.latest;
  ws.emit({ type: "auth_required" });
  ws.emit({ type: "auth_ok" });
  await Promise.resolve();
  expect(ws.sent[1]).toMatchObject({ type: "config/area_registry/list" });
  abort.abort();
  await rejected;
  expect(ws.readyState).toBe(3);
  expect(ws.sent).toHaveLength(2);
});
it("begrenzt fehlende HA-Antworten und meldet ungültige Zugänge", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", RegistrySocket);
  const config = { url: "http://ha.example.test", token: "fake-token" };
  const signal = new AbortController().signal;
  const waiting = withHaRegistry(config, signal, (request) => readRegistry(request, address));
  const timedOut = expect(waiting).rejects.toThrow("Zeitüberschreitung");
  await vi.advanceTimersByTimeAsync(30000);
  await timedOut;
  expect(RegistrySocket.latest.readyState).toBe(3);
  const denied = withHaRegistry(config, signal, (request) => readRegistry(request, address));
  const invalid = expect(denied).rejects.toThrow("ungültig");
  RegistrySocket.latest.emit({ type: "auth_invalid" });
  await invalid;
  expect(RegistrySocket.latest.readyState).toBe(3);
});
