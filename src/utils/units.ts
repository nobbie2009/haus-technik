import type { DisplayUnit } from "../models/common";
import { requireFinite } from "../geometry/tolerances";

const factors: Record<DisplayUnit, number> = { mm: 1, cm: 10, m: 1000 };

/** Ohne Suffix gilt die explizite Feldeinheit; beim Schnellmaß standardmäßig mm. */
export function parseLength(input: string, defaultUnit: DisplayUnit = "mm"): number {
  const match = /^\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(mm|cm|m)?\s*$/i.exec(input);
  if (!match)
    throw new Error("Maß als Zahl eingeben, optional mit mm, cm oder m. Keine Tausendertrennzeichen.");
  const unit = (match[2]?.toLowerCase() ?? defaultUnit) as DisplayUnit;
  const value = Number(match[1]!.replace(",", ".")) * factors[unit];
  requireFinite(value, "Maß");
  return value;
}

export function formatLength(
  mm: number,
  unit: DisplayUnit,
  decimals = unit === "m" ? 3 : unit === "cm" ? 1 : 0,
): string {
  requireFinite(mm, "Maß");
  return `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }).format(mm / factors[unit])} ${unit}`;
}

export function formatArea(squareMm: number, decimals = 2): string {
  requireFinite(squareMm, "Fläche");
  return `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(squareMm / 1_000_000)} m²`;
}
