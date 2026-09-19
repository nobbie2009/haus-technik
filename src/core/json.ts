/** Prüft auch direkte JS-Aufrufer: JSON.stringify würde ungültige Werte still verändern. */
export function isJsonTree(value: unknown, ancestors = new Set<object>(), depth = 0): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || depth > 100 || ancestors.has(value)) return false;
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  ancestors.add(value);
  const children = Array.isArray(value) ? Array.from(value) : Object.values(value);
  const valid = children.every((child) => isJsonTree(child, ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}
