import { afterEach, expect, it, vi } from "vitest";
import { addFurniture } from "../../src/furniture/actions";
import { createProject } from "../../src/core/projectFactory";
import {
  furnitureFile,
  furniturePreset,
  mergeFurniture,
  readFurnitureFile,
  readProductDimensions,
  useFurnitureLibrary,
} from "../../src/furniture/library";
import { parseProject } from "../../src/core/validation";
const item = {
  id: crypto.randomUUID(),
  name: "Testregal",
  type: "wardrobe",
  width: 800,
  depth: 280,
  height: 2020,
  manufacturer: "Beispiel",
  source: "https://example.com/product",
};
afterEach(() => {
  useFurnitureLibrary.setState({ items: [], error: "" });
  vi.unstubAllGlobals();
});
it("übernimmt Herstellermaße mit Einheiten und deutschem Komma", () => {
  expect(readProductDimensions("Breite: 80 cm\nTiefe: 28 cm\nHöhe: 202 cm")).toEqual({
    width: 800,
    depth: 280,
    height: 2020,
  });
  expect(readProductDimensions("0,8 × 0,28 × 2,02 m")).toEqual({ width: 800, depth: 280, height: 2020 });
  expect(readProductDimensions("Width 800 mm; Depth 280 mm; Height 2020 mm")).toEqual({
    width: 800,
    depth: 280,
    height: 2020,
  });
  expect(() => readProductDimensions("80 x 28 x 202")).toThrow();
  expect(() => readProductDimensions("Breite 80 cm Tiefe 28 cm Höhe 202 cm Verpackung Breite 90 cm")).toThrow(
    "unterschiedliche",
  );
});
it("prüft Katalogdateien, lehnt ausführbare Links ab und überschreibt keine Vorlagen", () => {
  expect(readFurnitureFile(furnitureFile([item]))).toEqual([item]);
  expect(() => furnitureFile([{ ...item, source: "javascript:alert(1)" }])).toThrow();
  expect(() => furnitureFile([{ ...item, width: 0 }])).toThrow();
  expect(() => readFurnitureFile('{"format":"other"}')).toThrow();
  expect(mergeFurniture([item], [item])).toHaveLength(1);
  const merged = mergeFurniture([item], [{ ...item, name: "Abweichend" }]);
  expect(merged).toHaveLength(2);
  expect(merged[0]).toEqual(item);
  expect(merged[1]!.id).not.toBe(item.id);
});
it("platziert unabhängige Möbelkopien in mehreren Projekten und erhält sie ohne Katalog", () => {
  useFurnitureLibrary.setState({ items: [item] });
  for (const project of [createProject(), createProject()]) {
    const id = addFurniture(project, project.floorOrder[0]!, { x: 0, y: 0 }, `library:${item.id}`);
    expect(project.furniture[id]).toMatchObject({
      name: item.name,
      width: 800,
      depth: 280,
      height: 2020,
      metadata: { manufacturer: "Beispiel", productSource: item.source },
    });
    expect(parseProject(project).furniture[id]!.width).toBe(800);
    project.furniture[id]!.width = 900;
    expect(useFurnitureLibrary.getState().items[0]!.width).toBe(800);
  }
  useFurnitureLibrary.setState({ items: [] });
  expect(() => furniturePreset(`library:${item.id}`)).toThrow("nicht mehr verfügbar");
});
it("meldet Speicherfehler ohne den Katalog im Arbeitsspeicher zu verändern", () => {
  vi.stubGlobal("localStorage", {
    setItem: () => {
      throw new Error("voll");
    },
  });
  expect(() => useFurnitureLibrary.getState().save([item])).toThrow("voll");
  expect(useFurnitureLibrary.getState().items).toEqual([]);
});
