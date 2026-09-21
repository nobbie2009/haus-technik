import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addUtilityNode, utilities } from "../../src/utilities/model";
import { homeBook, setHomeBook } from "../../src/housebook/home";
import { syncPlanMeters, planMeters, saveMeter } from "../../src/housebook/planMeters";
import { transact } from "../../src/editor/history/transaction";
import { duplicateSelection, deleteSelection } from "../../src/editor/actions/edit";
import { useProjectStore } from "../../src/stores/projectStore";
import { newId } from "../../src/utils/uuid";

describe("Automatische Planzähler", () => {
  it("verknüpft einen bestehenden Verlauf mit einem automatisch erfassten Planzähler", () => {
    const p = transact(createProject(), (d) => {
      addUtilityNode(d, d.floorOrder[0]!, { x: 0, y: 0 }, "meter", "cold");
    });
    const b = homeBook(p),
      automatic = b.meters[0]!;
    const manual = {
      ...structuredClone(automatic),
      id: newId(),
      name: "Gartenwasser",
      target: null,
      readings: [{ id: newId(), date: "2026-01-01", value: 42, reset: false, note: "Bestand" }],
    };
    b.meters.push(manual);
    setHomeBook(p, b);
    const next = transact(p, (d) => saveMeter(d, { ...manual, target: automatic.target }));
    expect(homeBook(next).meters).toEqual([{ ...manual, target: automatic.target }]);
    const detached = transact(next, (d) => saveMeter(d, { ...manual, target: null }));
    expect(homeBook(detached).meters.find((m) => m.id === manual.id)?.readings).toEqual(manual.readings);
    expect(homeBook(detached).meters.filter((m) => m.target)).toHaveLength(1);
  });
  it("bewahrt Daten eines bereits belegten Planzählers bei neuer Zuordnung", () => {
    const p = transact(createProject(), (d) => {
      addElectrical(d, d.floorOrder[0]!, { x: 0, y: 0 }, "meters");
    });
    const b = homeBook(p),
      occupied = b.meters[0]!;
    occupied.serial = "Eigene Nummer";
    occupied.readings = [{ id: newId(), date: "2026-01-01", value: 99, reset: false, note: "" }];
    const manual = { ...structuredClone(occupied), id: newId(), name: "Bestehender Zähler", target: null };
    b.meters.push(manual);
    setHomeBook(p, b);
    const next = transact(p, (d) => saveMeter(d, { ...manual, target: occupied.target }));
    expect(homeBook(next).meters).toEqual([
      { ...occupied, target: null },
      { ...manual, target: occupied.target },
    ]);
    expect(() => transact(next, (d) => saveMeter(d, { ...manual, unit: "m³" }))).toThrow(/Einheit/);
  });
  it("lässt historische Zähler mit entferntem Planziel weiter bearbeiten", () => {
    const p = transact(createProject(), (d) => {
      addElectrical(d, d.floorOrder[0]!, { x: 0, y: 0 }, "meters");
    });
    const meter = homeBook(p).meters[0]!;
    const removed = transact(p, (d) => deleteSelection(d, [{ kind: "meters", id: meter.target!.id }]));
    const next = transact(removed, (d) => saveMeter(d, { ...meter, serial: "Nachgetragen" }));
    expect(homeBook(next).meters[0]!.serial).toBe("Nachgetragen");
  });
  it("erfasst ausschließlich Zähler mit passendem Medium, Einheit und Planverknüpfung", () => {
    const p = transact(createProject(), (p) => {
      const floor = p.floorOrder[0]!;
      addElectrical(p, floor, { x: 0, y: 0 }, "meters");
      addElectrical(p, floor, { x: 0, y: 0 }, "outlets");
      for (const medium of ["cold", "hot", "gas", "flow"] as const)
        addUtilityNode(p, floor, { x: 0, y: 0 }, "meter", medium);
      addUtilityNode(p, floor, { x: 0, y: 0 }, "valve", "cold");
    });
    expect(homeBook(p).meters.map((m) => [m.kind, m.unit])).toEqual([
      ["electricity", "kWh"],
      ["water", "m³"],
      ["water", "m³"],
      ["gas", "m³"],
      ["heat", "kWh"],
    ]);
    expect(homeBook(p).meters.every((m) => m.target && m.location)).toBe(true);
    expect(planMeters(p)).toHaveLength(5);
    expect(syncPlanMeters(p)).toBe(false);
  });
  it("übernimmt vorhandene Verknüpfungen ohne Duplikate oder Verlust von Ablesungen", () => {
    const p = createProject(),
      id = addElectrical(p, p.floorOrder[0]!, { x: 0, y: 0 }, "meters");
    syncPlanMeters(p);
    const b = homeBook(p),
      m = b.meters[0]!;
    m.name = "Eigener Name";
    m.serial = "TEST-123";
    m.price = 0.3;
    m.readings.push({ id: newId(), date: "2026-01-01", value: 123, reset: false, note: "Test" });
    setHomeBook(p, b);
    useProjectStore.getState().replace(p, true);
    expect(homeBook(useProjectStore.getState().project)).toEqual(b);
    const removed = transact(p, (d) => deleteSelection(d, [{ kind: "meters", id }]));
    expect(homeBook(removed)).toEqual(b);
  });
  it("ergänzt alte Projekte beim Laden und markiert sie zum Speichern", () => {
    const p = createProject();
    addUtilityNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "meter", "gas");
    useProjectStore.getState().replace(p, true);
    const state = useProjectStore.getState();
    expect(homeBook(state.project).meters[0]!.kind).toBe("gas");
    expect(state.saveStatus).toBe("dirty");
    useProjectStore.getState().replace(state.project, true);
    expect(homeBook(useProjectStore.getState().project).meters).toHaveLength(1);
    expect(useProjectStore.getState().saveStatus).toBe("saved");
  });
  it("nimmt automatische Einträge gemeinsam mit dem Planzähler zurück und dupliziert ohne Ablesungen", () => {
    useProjectStore.getState().replace(createProject());
    let id = "";
    useProjectStore.getState().commit("Zähler", (p) => {
      id = addElectrical(p, p.floorOrder[0]!, { x: 0, y: 0 }, "meters");
    });
    expect(homeBook(useProjectStore.getState().project).meters).toHaveLength(1);
    useProjectStore.getState().undo();
    expect(homeBook(useProjectStore.getState().project).meters).toHaveLength(0);
    useProjectStore.getState().redo();
    const before = useProjectStore.getState().project,
      b = homeBook(before);
    b.meters[0]!.readings.push({ id: newId(), date: "2026-01-01", value: 23, reset: false, note: "" });
    setHomeBook(before, b);
    const p = transact(before, (d) => {
      duplicateSelection(d, [{ kind: "meters", id }]);
    });
    expect(homeBook(p).meters).toHaveLength(2);
    expect(homeBook(p).meters.map((m) => m.readings.length)).toEqual([1, 0]);
    expect(new Set(homeBook(p).meters.map((m) => m.target!.id)).size).toBe(2);
  });
  it("behält Verbrauchshistorie bei geändertem Medium als eigenen Eintrag", () => {
    let id = "";
    const p = transact(createProject(), (p) => {
      id = addUtilityNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "meter", "cold");
    });
    const b = homeBook(p);
    b.meters[0]!.readings.push({ id: newId(), date: "2026-01-01", value: 7, reset: false, note: "" });
    setHomeBook(p, b);
    const changed = transact(p, (d) => {
      const source = addUtilityNode(d, d.floorOrder[0]!, { x: 2000, y: 0 }, "source", "gas");
      utilities(d).nodes[id]!.media = ["gas"];
      utilities(d).nodes[id]!.layerId = utilities(d).nodes[source]!.layerId;
    });
    const result = homeBook(changed).meters;
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ...b.meters[0]!, target: null });
    expect(result[1]!.kind).toBe("gas");
    expect(result[1]!.readings).toEqual([]);
  });
});
