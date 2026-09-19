import type { ElectricalDevice } from "../electrical/models";
import type { DeviceResult } from "../simulation/models";

export type DeviceSymbolKind = "lamp" | "device";
export function deviceSymbolKind(device: ElectricalDevice): DeviceSymbolKind {
  const override = device.metadata.electricalSymbol;
  if (override === "lamp" || override === "device") return override;
  const type = device.type.trim().toLowerCase();
  if (["lamp", "light", "lighting", "lampe", "leuchte", "licht"].includes(type)) return "lamp";
  // Nur Darstellung: eindeutige Lichtnamen alter generischer Objekte bleiben ohne Datenmigration nutzbar.
  if (
    ["other", "unknown"].includes(type) &&
    /(?:licht|lampe|leuchte|light|lamp)(?:\s*\d+)?$/iu.test(device.name.trim())
  )
    return "lamp";
  return "device";
}
export function deviceAppearance(device: ElectricalDevice, result?: DeviceResult) {
  const kind = deviceSymbolKind(device);
  const state = !result
    ? "idle"
    : result.status === "running" && result.power === 0
      ? "ready"
      : result.status;
  const running = state === "running";
  const label =
    state === "idle"
      ? ""
      : state === "running"
        ? kind === "lamp"
          ? "Leuchtet"
          : "In Betrieb"
        : state === "ready"
          ? "Bereit · 0 W"
          : state === "off"
            ? "Aus"
            : state === "unpowered"
              ? "Ohne Versorgung"
              : "Daten fehlen";
  const color =
    state === "idle"
      ? "#9b4b18"
      : state === "incomplete"
        ? "#754b8a"
        : running
          ? kind === "lamp"
            ? "#8b5b00"
            : "#14694e"
          : "#52685d";
  return { kind, state, running, label, color };
}
