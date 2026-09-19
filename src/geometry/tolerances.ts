/** Rechentoleranz in mm; unabhängig von Raster und Bildschirm-Fangradius. */
export const LENGTH_EPSILON = 1e-6;
export const ANGLE_EPSILON = 1e-10;

export function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} muss endlich sein.`);
}

export function requirePositive(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0) throw new RangeError(`${name} muss größer als null sein.`);
}
