import { z } from "zod";
import { create } from "zustand";
import { furnitureCatalog } from "./catalog";

const size = z.number().finite().positive().max(100000);
export const furnitureTemplateSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().trim().min(1).max(150),
  type: z.string().refine((v) => furnitureCatalog.some((p) => p.type === v), "Unbekannte Grundform"),
  width: size,
  depth: size,
  height: size,
  manufacturer: z.string().trim().max(150),
  source: z.union([
    z.literal(""),
    z
      .url()
      .max(2000)
      .refine((v) => {
        const url = new URL(v);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
      }, "Nur HTTP-/HTTPS-Produktlinks ohne Zugangsdaten"),
  ]),
});
export type FurnitureTemplate = z.infer<typeof furnitureTemplateSchema>;
export const furnitureFileSchema = z.strictObject({
  format: z.literal("home-technik-furniture"),
  version: z.literal(1),
  items: z
    .array(furnitureTemplateSchema)
    .max(1000)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Doppelte Kennungen"),
});
export function readFurnitureFile(text: string) {
  if (text.length > 2_000_000) throw new Error("Die Katalogdatei darf höchstens 2 MB groß sein.");
  return furnitureFileSchema.parse(JSON.parse(text)).items;
}
export function furnitureFile(items: FurnitureTemplate[]) {
  const text = JSON.stringify(
    furnitureFileSchema.parse({ format: "home-technik-furniture", version: 1, items }),
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > 2_000_000)
    throw new Error("Der Katalog darf höchstens 2 MB groß sein.");
  return text;
}
const key = "home-technik.furniture-library.v1";
let initial: FurnitureTemplate[] = [],
  initialError = "";
try {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved) initial = readFurnitureFile(saved);
  }
} catch {
  initialError =
    "Der gespeicherte Möbelkatalog konnte nicht gelesen werden. Bestehende Daten werden nicht überschrieben. Bitte eine Sicherung des Browsers prüfen.";
}
export const useFurnitureLibrary = create<{
  items: FurnitureTemplate[];
  error: string;
  save: (items: FurnitureTemplate[]) => void;
}>((set, get) => ({
  items: initial,
  error: initialError,
  save(items) {
    if (get().error) throw new Error(get().error);
    const value = furnitureFile(items);
    localStorage.setItem(key, value);
    set({ items: structuredClone(items) });
  },
}));
export function furniturePreset(key: string) {
  if (key.startsWith("library:")) {
    const entry = useFurnitureLibrary.getState().items.find((i) => `library:${i.id}` === key);
    if (!entry) throw new Error("Diese Möbelvorlage ist nicht mehr verfügbar. Bitte neu auswählen.");
    return entry;
  }
  return furnitureCatalog.find((p) => p.type === key) ?? furnitureCatalog.at(-1)!;
}
export function mergeFurniture(current: FurnitureTemplate[], incoming: FurnitureTemplate[]) {
  const result = [...current];
  for (const entry of incoming) {
    const existing = result.find((i) => i.id === entry.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(entry)) continue;
    result.push(existing ? { ...entry, id: crypto.randomUUID() } : entry);
  }
  return furnitureFileSchema.parse({ format: "home-technik-furniture", version: 1, items: result }).items;
}
/** Only explicit units; never guess whether a bare number is cm or mm. */
export function readProductDimensions(text: string): { width: number; depth: number; height: number } {
  if (text.length > 20000)
    throw new Error("Bitte nur den Abschnitt mit den Produktmaßen einfügen (maximal 20.000 Zeichen).");
  const convert = (value: string, unit: string) =>
    Number(value.replace(",", ".")) *
    (unit.toLowerCase() === "m" ? 1000 : unit.toLowerCase() === "cm" ? 10 : 1);
  const result: Record<string, number> = {};
  for (const [field, label] of [
    ["width", "Breite|Width"],
    ["depth", "Tiefe|Depth"],
    ["height", "Höhe|Hoehe|Height"],
  ]) {
    const matches = [
      ...text.matchAll(
        new RegExp(`(?:^|[\\s;,])(?:${label})\\s*:?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m)\\b`, "gim"),
      ),
    ];
    const values = [...new Set(matches.map((m) => convert(m[1]!, m[2]!)))];
    if (values.length > 1)
      throw new Error(
        "Mehrere unterschiedliche Maße gefunden. Bitte nur die Produktmaße ohne Verpackung einfügen.",
      );
    if (values.length === 1) result[field!] = values[0]!;
  }
  if (Object.keys(result).length === 0) {
    const triples = [
      ...text.matchAll(
        /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/gi,
      ),
    ];
    if (triples.length === 1) {
      const m = triples[0]!;
      result.width = convert(m[1]!, m[4]!);
      result.depth = convert(m[2]!, m[4]!);
      result.height = convert(m[3]!, m[4]!);
    }
  }
  const parsed = z.object({ width: size, depth: size, height: size }).safeParse(result);
  if (!parsed.success)
    throw new Error(
      "Breite, Tiefe und Höhe mit Einheit nicht eindeutig erkannt. Bitte die Maße manuell eingeben.",
    );
  return parsed.data;
}
