import { expect, it } from "vitest";
import { hasLowBattery, readAvailability, readLastSeen } from "../../src/network/zigbeeHealth";
const empty = { availability: "unbekannt", offlineObservedAt: null, offlineRetained: false, lastSeen: null };
it("bewahrt die erste Offline-Beobachtung und setzt sie bei Rückkehr zurück", () => {
  const first = readAvailability(empty, { state: "offline" }, true, false, "2026-09-25T10:00:00.000Z");
  expect(first.offlineObservedAt).toBe("2026-09-25T10:00:00.000Z");
  const repeated = readAvailability(first, "offline", true, false, "2026-09-25T11:00:00.000Z");
  expect(repeated.offlineObservedAt).toBe(first.offlineObservedAt);
  const online = readAvailability(repeated, { state: "online" }, true, false);
  expect(online.offlineObservedAt).toBeNull();
  expect(readAvailability(online, "offline", true, false, "2026-09-25T12:00:00.000Z").offlineObservedAt).toBe(
    "2026-09-25T12:00:00.000Z",
  );
});
it("kennzeichnet gespeichertes Offline und verwechselt Gerätezustände nicht mit Erreichbarkeit", () => {
  const retained = readAvailability(empty, { state: "offline" }, true, true);
  expect(retained.offlineRetained).toBe(true);
  expect(readAvailability(retained, { state: "ON", battery: 15 }, false, false).availability).toBe("offline");
  expect(readAvailability(empty, { state: "offline" }, false, false).availability).toBe("unbekannt");
});
it("liest last_seen in ISO und Millisekunden; Empfang ersetzt keine Zigbee-Zeit", () => {
  const stamp = "2025-01-02T03:04:05.000Z";
  expect(readLastSeen(stamp)).toBe(stamp);
  expect(readLastSeen(Date.parse(stamp))).toBe(stamp);
  expect(readLastSeen("2025-01-02T04:04:05+01:00")).toBe(stamp);
  for (const invalid of ["yesterday", "2025-01-02", Date.now() + 86400000, Infinity, 12, null])
    expect(readLastSeen(invalid)).toBeNull();
  const state = readAvailability(empty, { last_seen: stamp }, false, true);
  expect(state.lastSeen).toBe(stamp);
  expect(readAvailability(state, { battery: 30 }, false, false).lastSeen).toBe(stamp);
  expect(readAvailability(state, { last_seen: "2024-01-01T00:00:00Z" }, false, true).lastSeen).toBe(stamp);
});
it("niedrige Batterie: Grenze inklusive, null unbekannt, Herstellerwarnung unabhängig", () => {
  expect(hasLowBattery(undefined, 20)).toBe(false);
  expect(hasLowBattery({ battery: null, batteryLow: null }, 20)).toBe(false);
  expect(hasLowBattery({ battery: 0, batteryLow: false }, 20)).toBe(true);
  expect(hasLowBattery({ battery: 20, batteryLow: false }, 20)).toBe(true);
  expect(hasLowBattery({ battery: 21, batteryLow: false }, 20)).toBe(false);
  expect(hasLowBattery({ battery: 85, batteryLow: true }, 10)).toBe(true);
});
