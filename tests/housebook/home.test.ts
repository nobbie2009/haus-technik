import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import {
  homeBook,
  setHomeBook,
  newHomeItem,
  meterSchema,
  consumption,
  addMonths,
  completeTask,
  dueOverview,
  resolveTarget,
  placeOutdoorLight,
  type Meter,
  type MaintenanceTask,
} from "../../src/housebook/home";
import { newId } from "../../src/utils/uuid";
import { useProjectStore } from "../../src/stores/projectStore";
import { planSvg, materialRows } from "../../src/housebook/export";
const reading = (date: string, value: number, reset = false) => ({
  id: newId(),
  date,
  value,
  reset,
  note: "",
});
const meter = (): Meter => ({
  id: newId(),
  name: "Strom",
  kind: "electricity",
  unit: "kWh",
  serial: "",
  location: "",
  target: null,
  price: 0.3,
  readings: [reading("2026-01-01", 100), reading("2026-02-01", 410), reading("2026-03-01", 690)],
});
describe("Private Hausübersicht", () => {
  it("lässt alte Projekte unverändert und erhält Einträge im JSON-Rundlauf", () => {
    const p = createProject();
    expect(homeBook(p).items).toEqual([]);
    expect(p.metadata.homeOverview).toBeUndefined();
    const b = homeBook(p);
    b.items.push({ ...newHomeItem("smoke"), name: "Flur", nextCheck: "2027-01-01" });
    b.meters.push(meter());
    setHomeBook(p, b);
    expect(homeBook(parseProject(JSON.parse(JSON.stringify(p))))).toEqual(b);
  });
  it("berechnet Verbrauch, Tagesmittel und Kosten anhand echter Intervalle", () => {
    const r = consumption(meter());
    expect(r[0]).toMatchObject({ days: 31, value: 310, perDay: 10, cost: 93 });
    expect(r[1]).toMatchObject({ days: 28, value: 280, perDay: 10, cost: 84 });
    expect(consumption(meter(), "2026-01-15", "2026-03-01")).toHaveLength(1);
    expect(consumption(meter(), "2026-01-15", "2026-02-15")).toEqual([]);
  });
  it("sortiert Eingaben und trennt Zählerwechsel von Verbrauch", () => {
    const m = meter();
    m.readings = [reading("2026-03-01", 50), reading("2026-02-01", 0, true), reading("2026-01-01", 900)];
    expect(meterSchema.safeParse(m).success).toBe(true);
    expect(consumption(m)[0]!.value).toBeNull();
    expect(consumption(m)[1]!.value).toBe(50);
    m.price = null;
    expect(consumption(m)[1]!.cost).toBeNull();
  });
  it("weist Rückläufe, doppelte Ablesetage und ungültige Daten zurück", () => {
    const m = meter();
    m.readings[1]!.value = 1;
    expect(meterSchema.safeParse(m).success).toBe(false);
    m.readings[1]!.reset = true;
    expect(meterSchema.safeParse(m).success).toBe(true);
    m.readings[1]!.date = m.readings[0]!.date;
    expect(meterSchema.safeParse(m).success).toBe(false);
    m.readings[1]!.date = "2026-02-30";
    expect(meterSchema.safeParse(m).success).toBe(false);
  });
  it("kürzt wiederkehrende Termine korrekt am Monatsende", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
    const t: MaintenanceTask = {
      id: newId(),
      title: "Filter",
      location: "",
      target: null,
      itemId: null,
      notes: "",
      due: "2026-01-01",
      intervalMonths: 1,
      history: [],
    };
    completeTask(t, "2026-01-31", "gewechselt");
    expect(t.due).toBe("2026-02-28");
    expect(t.history[0]!.note).toBe("gewechselt");
    t.intervalMonths = 0;
    completeTask(t, "2026-02-28", "");
    expect(t.due).toBe("");
    expect(t.history).toHaveLength(2);
  });
  it("führt Prüfen und Austauschen zusammen und toleriert gelöschte Verknüpfungen", () => {
    const p = createProject(),
      b = homeBook(p),
      i = {
        ...newHomeItem("smoke"),
        name: "Flur",
        nextCheck: "2026-01-01",
        replaceBy: "2030-01-01",
        target: { kind: "devices" as const, id: newId() },
      };
    b.items.push(i);
    setHomeBook(p, b);
    expect(() => parseProject(p)).not.toThrow();
    expect(resolveTarget(p, i.target)).toBeNull();
    expect(dueOverview(p, "2026-02-01").map((r) => r.overdue)).toEqual([true, false]);
  });
  it("integriert Planmarkierungen in Ausgabe und Außenleuchten in Elektrik", () => {
    const p = createProject(),
      b = homeBook(p),
      i = {
        ...newHomeItem("outdoorLight"),
        name: "Terrasse",
        powerW: 12,
        floorId: p.floorOrder[0]!,
        position: { x: 100, y: 200 },
      };
    placeOutdoorLight(p, i);
    b.items.push(i);
    setHomeBook(p, b);
    expect(() => parseProject(p)).not.toThrow();
    const d = p.electrical.devices[i.target!.id]!;
    expect(d).toMatchObject({ name: "Terrasse", ratedPower: 12, operatingMode: "off", circuitId: null });
    expect(() => placeOutdoorLight(p, i)).toThrow();
    expect(planSvg(p, p.floorOrder[0]!, 50, "all")).toContain("Außenbeleuchtung: Terrasse");
    expect(materialRows(p).some((r) => r[0] === "Außenbeleuchtung" && r[2] === "Terrasse")).toBe(true);
  });
  it("verhindert ungültige Metadaten und unterstützt Undo/Redo", () => {
    const p = createProject();
    useProjectStore.getState().replace(p);
    expect(
      useProjectStore.getState().commit("Rauchmelder", (p) => {
        const b = homeBook(p);
        b.items.push({ ...newHomeItem("smoke"), name: "Flur" });
        setHomeBook(p, b);
      }),
    ).toBe(true);
    useProjectStore.getState().undo();
    expect(homeBook(useProjectStore.getState().project).items).toHaveLength(0);
    useProjectStore.getState().redo();
    expect(homeBook(useProjectStore.getState().project).items).toHaveLength(1);
    const bad = structuredClone(p);
    bad.metadata.homeOverview = { version: 99 };
    expect(() => parseProject(bad)).toThrow();
  });
});
