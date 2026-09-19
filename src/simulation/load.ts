import type { ElectricalDevice } from "../electrical/models";

export interface LoadResult {
  power: number | null;
  current: number | null;
  powerFactor: number | null;
  estimated: boolean;
  issues: string[];
}
/** Ideale konstante Nennlast; sinusförmig, symmetrischer Drehstrom, induktive Blindleistung. */
export function calculateLoad(device: ElectricalDevice, voltage: number, assumeUnity: boolean): LoadResult {
  const result: LoadResult = {
    power: device.ratedPower,
    current: null,
    powerFactor: device.powerFactor,
    estimated: false,
    issues: [],
  };
  if (!Number.isFinite(voltage) || voltage <= 0)
    return { ...result, issues: ["Keine gültige Versorgungsspannung."] };
  if (device.ratedVoltage !== null && Math.abs(device.ratedVoltage - voltage) > 0.001)
    return {
      ...result,
      power: null,
      issues: ["Typenschildspannung und Versorgung weichen ab; Lastmodell nicht anwendbar."],
    };
  const factor = (device.phases === 3 ? Math.sqrt(3) : 1) * voltage;
  if (
    result.powerFactor === null &&
    device.ratedPower !== null &&
    device.ratedCurrent !== null &&
    device.ratedCurrent > 0
  ) {
    const derived = device.ratedPower / (factor * device.ratedCurrent);
    if (derived > 1 + 1e-6)
      return { ...result, issues: ["Leistung und Nennstrom sind mit dieser Spannung unvereinbar."] };
    result.powerFactor = Math.min(1, derived);
  }
  if (result.powerFactor === null && assumeUnity) {
    result.powerFactor = 1;
    result.estimated = true;
  }
  const pf = result.powerFactor;
  if (pf === null) {
    result.issues.push("Leistungsfaktor fehlt.");
    return result;
  }
  if (device.ratedPower !== null && pf > 0) {
    result.current = device.ratedPower / (factor * pf);
    if (
      device.ratedCurrent !== null &&
      Math.abs(result.current - device.ratedCurrent) > Math.max(0.01, device.ratedCurrent * 0.05)
    ) {
      result.current = null;
      result.issues.push("Nennleistung, Nennstrom und Leistungsfaktor widersprechen sich.");
    }
  } else if (device.ratedCurrent !== null) {
    result.current = device.ratedCurrent;
    result.power = factor * device.ratedCurrent * pf;
  } else
    result.issues.push(
      pf === 0
        ? "Bei cos φ = 0 lässt sich aus Wirkleistung kein Strom berechnen."
        : "Nennleistung oder Nennstrom fehlt.",
    );
  if (
    (result.current !== null && !Number.isFinite(result.current)) ||
    (result.power !== null && !Number.isFinite(result.power))
  )
    return {
      ...result,
      current: null,
      power: null,
      issues: ["Lastwerte liegen außerhalb des berechenbaren Bereichs."],
    };
  return result;
}
