import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { setup, setSetup, moveSetup, addSetupRoom } from "../../src/housebook/setup";
import {
  solarPlants,
  setSolarPlants,
  newSolarPlant,
  modulePower,
  ensureSolarMeter,
} from "../../src/housebook/solar";
import { searchProject } from "../../src/housebook/search";
import { homeBook, setHomeBook, newHomeItem } from "../../src/housebook/home";
import { assetSchema, setAsset, housebook, setHousebook } from "../../src/housebook/model";
import { addElectrical } from "../../src/electrical/actions";
import { newId } from "../../src/utils/uuid";
import { useProjectStore } from "../../src/stores/projectStore";
describe("Einrichtung, Suche und Solarakte", () => {
  it("liest alte Projekte ohne Metadatenänderung", () => {
    const p = createProject();
    expect(setup(p).step).toBe(0);
    expect(solarPlants(p)).toEqual([]);
    expect(p.metadata).toEqual({});
  });
  it("erhält Fortschritt, Themen und übersprungene Schritte im JSON", () => {
    const p = createProject(),
      s = setup(p);
    s.topics = ["solar", "network"];
    setSetup(p, s);
    moveSetup(p, 1, "done");
    moveSetup(p, 2, "skipped");
    const loaded = parseProject(JSON.parse(JSON.stringify(p)));
    expect(setup(loaded)).toMatchObject({ step: 2, done: [0], skipped: [1], topics: ["solar", "network"] });
    moveSetup(loaded, 1);
    moveSetup(loaded, 2, "done");
    expect(setup(loaded).skipped).toEqual([]);
  });
  it("verhindert Raumduplikate bei Wiederaufnahme und respektiert Geschosse", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!,
      id = addSetupRoom(p, floor, "Küche", 3000, 4000, 0, 0);
    expect(addSetupRoom(p, floor, " KÜCHE ", 5000, 2000, 8000, 0)).toBe(id);
    expect(Object.keys(p.rooms)).toHaveLength(1);
    expect(Object.keys(p.walls)).toHaveLength(4);
    expect(() => parseProject(p)).not.toThrow();
  });
  it("lehnt ungültige Schritte und Raummaße ab", () => {
    const p = createProject();
    expect(() => addSetupRoom(p, p.floorOrder[0]!, "Bad", -1, 20, 0, 0)).toThrow();
    p.metadata.setupGuide = { ...setup(p), step: 99 };
    expect(() => parseProject(p)).toThrow();
  });
  it("summiert bekannte Modulleistung und lässt unbekannte offen", () => {
    const s = newSolarPlant();
    expect(modulePower(s)).toBeNull();
    s.modules.push({ id: newId(), quantity: 2, wp: 440, asset: assetSchema.parse({}) });
    expect(modulePower(s)).toBe(880);
    s.modules.push({ id: newId(), quantity: 1, wp: null, asset: assetSchema.parse({}) });
    expect(modulePower(s)).toBeNull();
  });
  it("legt einen Ertragszähler idempotent ohne erfundene Ablesung an", () => {
    const p = createProject(),
      s = { ...newSolarPlant(), name: "Balkon" };
    setSolarPlants(p, [s]);
    const id = ensureSolarMeter(p, s.id);
    expect(ensureSolarMeter(p, s.id)).toBe(id);
    expect(homeBook(p).meters).toHaveLength(1);
    expect(homeBook(p).meters[0]).toMatchObject({ kind: "solar", unit: "kWh", readings: [], price: null });
    expect(solarPlants(parseProject(JSON.parse(JSON.stringify(p))))[0]!.meterId).toBe(id);
  });
  it("erhält einen bestehenden Ertragszähler und erkennt unpassende Zuordnung", () => {
    const p = createProject(),
      s = { ...newSolarPlant(), name: "Balkon" };
    setSolarPlants(p, [s]);
    const id = ensureSolarMeter(p, s.id),
      b = homeBook(p);
    b.meters[0]!.readings.push({ id: newId(), date: "2026-01-01", value: 100, reset: false, note: "" });
    setHomeBook(p, b);
    expect(ensureSolarMeter(p, s.id)).toBe(id);
    expect(homeBook(p).meters[0]!.readings).toHaveLength(1);
    b.meters[0]!.kind = "water";
    setHomeBook(p, b);
    expect(() => ensureSolarMeter(p, s.id)).toThrow();
  });
  it("weist ungültige Solardaten zurück und toleriert gelöschte Verweise", () => {
    const p = createProject(),
      s = { ...newSolarPlant(), name: "Balkon", outletId: newId(), meterId: newId() };
    setSolarPlants(p, [s]);
    expect(() => parseProject(p)).not.toThrow();
    p.metadata.solarPlants = [{ ...s, inverter: { ...s.inverter, powerW: -1 } }];
    expect(() => parseProject(p)).toThrow();
  });
  it("findet Seriennummern und kombinierte Begriffe samt exaktem Ziel", () => {
    const p = createProject(),
      id = addElectrical(p, p.floorOrder[0]!, { x: 0, y: 0 }, "devices");
    p.electrical.devices[id]!.name = "Kühlschrank";
    setAsset(p.electrical.devices[id]!, assetSchema.parse({ serial: "SER-123", notes: "Küche" }));
    const results = searchProject(p, "kuche ser-123");
    expect(results).toHaveLength(1);
    expect(results[0]!.target).toEqual({ kind: "devices", id });
    expect(searchProject(p, "SER-123", "Wartung")).toEqual([]);
  });
  it("sucht Hausobjekte, SSIDs, Komponenten und Unterlagen ohne Bilddaten", () => {
    const p = createProject(),
      b = homeBook(p);
    b.items.push({
      ...newHomeItem("smoke"),
      name: "Flurmelder",
      asset: assetSchema.parse({ serial: "RM-123" }),
    });
    setHomeBook(p, b);
    const book = housebook(p);
    book.networkNodes.push({
      id: newId(),
      name: "Router",
      kind: "router",
      floorId: p.floorOrder[0]!,
      ports: 4,
      position: { x: 0, y: 0 },
      details: { ssid: "MeinWLAN", band: "", ip: "", mac: "", location: "", notes: "" },
    });
    setHousebook(p, book);
    const s = { ...newSolarPlant(), name: "Balkon" };
    s.inverter.asset.serial = "INV-99";
    s.asset.documentUrl = "https://example.org/Handbuch";
    setSolarPlants(p, [s]);
    expect(searchProject(p, "RM-123")[0]!.section).toBe("smoke");
    expect(searchProject(p, "MeinWLAN")[0]!.section).toBe("network");
    expect(searchProject(p, "INV-99 Handbuch")[0]!.id).toBe(s.id);
  });
  it("stellt Solarakte und Ertragszähler gemeinsam per Undo/Redo wieder her", () => {
    const p = createProject();
    useProjectStore.getState().replace(p);
    expect(
      useProjectStore.getState().commit("Solar", (p) => {
        const s = { ...newSolarPlant(), name: "Balkon" };
        setSolarPlants(p, [s]);
        ensureSolarMeter(p, s.id);
      }),
    ).toBe(true);
    useProjectStore.getState().undo();
    expect(solarPlants(useProjectStore.getState().project)).toEqual([]);
    expect(homeBook(useProjectStore.getState().project).meters).toEqual([]);
    useProjectStore.getState().redo();
    expect(solarPlants(useProjectStore.getState().project)).toHaveLength(1);
    expect(homeBook(useProjectStore.getState().project).meters).toHaveLength(1);
  });
});
