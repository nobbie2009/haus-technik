import type { ElectricalDevice } from "./models";

export function hasAutomaticCurrent(device: ElectricalDevice): boolean {
  return (
    typeof device.metadata.automaticCurrent === "number" &&
    device.ratedCurrent === device.metadata.automaticCurrent
  );
}

/** Editable estimate, never independent evidence for deriving a power factor. */
export function fillCurrentDefault(device: ElectricalDevice): void {
  const automatic = hasAutomaticCurrent(device);
  if (device.ratedCurrent !== null && !automatic) {
    delete device.metadata.automaticCurrent;
    return;
  }
  const power = device.ratedPower,
    voltage = device.ratedVoltage,
    pf = device.powerFactor ?? 1;
  const current =
    power !== null && power >= 0 && voltage !== null && voltage > 0 && pf > 0 && pf <= 1
      ? power / (voltage * pf * (device.phases === 3 ? Math.sqrt(3) : 1))
      : null;
  if (current === null || !Number.isFinite(current)) {
    if (automatic) device.ratedCurrent = null;
    delete device.metadata.automaticCurrent;
    return;
  }
  device.ratedCurrent = Number(current.toFixed(6));
  device.metadata.automaticCurrent = device.ratedCurrent;
}
