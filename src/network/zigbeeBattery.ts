export interface BatteryState {
  battery: number | null;
  batteryLow: boolean | null;
  batteryReceivedAt: string | null;
  batteryRetained: boolean;
}
export function readBattery(
  value: Record<string, unknown>,
  old: BatteryState,
  retained: boolean,
): BatteryState {
  const percent =
    typeof value.battery === "number" &&
    Number.isFinite(value.battery) &&
    value.battery >= 0 &&
    value.battery <= 100;
  const low = typeof value.battery_low === "boolean";
  return {
    battery: percent ? (value.battery as number) : old.battery,
    batteryLow: low ? (value.battery_low as boolean) : old.batteryLow,
    batteryReceivedAt: percent || low ? new Date().toISOString() : old.batteryReceivedAt,
    batteryRetained: percent || low ? retained : old.batteryRetained,
  };
}
export function batteryLabel(value?: Pick<BatteryState, "battery" | "batteryLow">) {
  return `Batterie: ${value?.battery != null ? `${value.battery} %` : "unbekannt"}${value?.batteryLow === true ? " · Batteriewarnung" : ""}`;
}
