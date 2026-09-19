export function simulationNumber(value: number | null, unit: string, decimals = 2) {
  return value === null
    ? "Nicht berechenbar"
    : `${value.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`;
}
export const simulationStatus = {
  running: "Ein",
  off: "Aus",
  unpowered: "Ohne Versorgung",
  incomplete: "Daten fehlen / Konflikt",
};
