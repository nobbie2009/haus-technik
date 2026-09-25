import type { BatteryState } from "./zigbeeBattery";

export interface AvailabilityState {
  availability: string;
  offlineObservedAt: string | null;
  offlineRetained: boolean;
  lastSeen: string | null;
}
export function readLastSeen(value: unknown, now = Date.now()): string | null {
  const time =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
        ? Date.parse(value)
        : NaN;
  return Number.isFinite(time) && time >= Date.UTC(2000, 0, 1) && time <= now + 300000
    ? new Date(time).toISOString()
    : null;
}
export function readAvailability(
  old: AvailabilityState,
  payload: unknown,
  available: boolean,
  retained: boolean,
  now = new Date().toISOString(),
): AvailabilityState {
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const status = available ? String(value.state ?? payload) : "";
  const state = status === "online" || status === "offline" ? status : old.availability;
  const firstOffline = state === "offline" && old.availability !== "offline";
  const lastSeen = !available ? readLastSeen(value.last_seen) : null;
  return {
    availability: state,
    offlineObservedAt: state !== "offline" ? null : firstOffline ? now : old.offlineObservedAt,
    offlineRetained: state !== "offline" ? false : firstOffline ? retained : old.offlineRetained,
    lastSeen: lastSeen && (!old.lastSeen || lastSeen > old.lastSeen) ? lastSeen : old.lastSeen,
  };
}
export function hasLowBattery(
  value: Pick<BatteryState, "battery" | "batteryLow"> | undefined,
  threshold: number,
) {
  return value?.batteryLow === true || (value?.battery != null && value.battery <= threshold);
}
