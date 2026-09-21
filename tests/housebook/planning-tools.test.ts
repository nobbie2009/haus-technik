import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { connections } from "../../src/housebook/connections";
import { createProject } from "../../src/core/projectFactory";
import { addUtilityNode, addUtilityPipe, utilities } from "../../src/utilities/model";
import { renovationView, projectChanges } from "../../src/housebook/compare";
import { setAsset, assetSchema } from "../../src/housebook/model";
import { addElectrical } from "../../src/electrical/actions";
import { projectReview } from "../../src/housebook/review";
import { maintenanceCalendar } from "../../src/housebook/calendar";
import { homeBook, setHomeBook } from "../../src/housebook/home";
import { newId } from "../../src/utils/uuid";
import { IndexedDbRepository } from "../../src/persistence/indexedDbRepository";
import { addCable } from "../../src/electrical/cables";
import { addNetworkNode } from "../../src/network/model";
import { housebook, setHousebook } from "../../src/housebook/model";
it("verfolgt die Einspeisung über mehrere Geschosse und alle nachgeordneten Verbraucher", () => {
  const { project, devices, outlet, terminal, sub, feeder } = simulationFixture();
  const trace = connections(project, devices[0]!, "trace");
  expect(trace.ids).toEqual(expect.arrayContaining([devices[0], outlet, terminal, sub, feeder]));
  expect(trace.ids).not.toContain(devices[1]);
  expect(connections(project, terminal, "shutdown").ids).toEqual(expect.arrayContaining(devices));
});
it("hebt einen dokumentierten Kabelweg durch Abzweigdosen hervor", () => {
  const { project, sub, outlet, upper } = simulationFixture();
  const junction = addElectrical(project, upper.id, { x: 3000, y: 0 }, "junctions");
  const a = addCable(project, sub, junction, []),
    b = addCable(project, junction, outlet, []);
  expect(connections(project, outlet, "trace").ids).toEqual(expect.arrayContaining([a, b, junction]));
});
it("verfolgt Netzwerkverbindungen ohne eine Abschaltwirkung zu erfinden", () => {
  const p = createProject(),
    f = p.floorOrder[0]!;
  const a = addNetworkNode(p, f, { x: 0, y: 0 }, "router"),
    b = addNetworkNode(p, f, { x: 2000, y: 0 }, "switch");
  const book = housebook(p);
  book.networkLinks.push({
    id: newId(),
    name: "LAN",
    from: a,
    to: b,
    fromPort: 1,
    toPort: 1,
    cableType: "Cat6",
    allowance: 0,
  });
  setHousebook(p, book);
  expect(connections(p, a, "trace").ids).toEqual(expect.arrayContaining([a, b]));
  expect(connections(p, a, "shutdown").ids).toHaveLength(0);
});
it("berücksichtigt bei Absperrung alternative Rohrwege und vorhandene geschlossene Ventile", () => {
  const p = createProject(),
    f = p.floorOrder[0]!;
  const source = addUtilityNode(p, f, { x: 0, y: 0 }, "source", "cold");
  const valve = addUtilityNode(p, f, { x: 1000, y: 0 }, "valve", "cold");
  const tap = addUtilityNode(p, f, { x: 2000, y: 0 }, "tap", "cold");
  addUtilityPipe(p, source, valve, "cold");
  addUtilityPipe(p, valve, tap, "cold");
  expect(connections(p, valve, "shutdown").ids).toContain(tap);
  addUtilityPipe(p, source, tap, "cold");
  expect(connections(p, valve, "shutdown").ids).not.toContain(tap);
  expect(connections(p, valve, "trace").ids).toContain(source);
  utilities(p).nodes[valve]!.closed = true;
  expect(connections(p, valve, "shutdown").ids).toHaveLength(0);
  expect(connections(p, valve, "shutdown", "gas").note).toContain("Kein Hausanschluss");
});
it("blendet Bestand und Planung ohne Datenänderung getrennt ein", () => {
  const p = createProject(),
    f = p.floorOrder[0]!;
  const old = addElectrical(p, f, { x: 0, y: 0 }, "outlets"),
    planned = addElectrical(p, f, { x: 1000, y: 0 }, "outlets");
  setAsset(p.electrical.outlets[old]!, assetSchema.parse({ status: "remove" }));
  setAsset(p.electrical.outlets[planned]!, assetSchema.parse({ status: "planned" }));
  const before = structuredClone(p),
    existing = renovationView(p, "existing"),
    future = renovationView(p, "future");
  expect(existing.layers[existing.electrical.outlets[planned]!.layerId]!.visible).toBe(false);
  expect(future.layers[future.electrical.outlets[old]!.layerId]!.visible).toBe(false);
  expect(p).toEqual(before);
  p.electrical.outlets[old]!.name = "Neu benannt";
  expect(projectChanges(before, p)).toContainEqual({ name: "Neu benannt", change: "Geändert" });
});
it("findet doppelte Kennzeichnungen und offene Rohranschlüsse", () => {
  const p = createProject(),
    f = p.floorOrder[0]!;
  const a = addElectrical(p, f, { x: 0, y: 0 }, "outlets"),
    b = addElectrical(p, f, { x: 1000, y: 0 }, "outlets");
  p.electrical.outlets[b]!.label = p.electrical.outlets[a]!.label;
  const tap = addUtilityNode(p, f, { x: 0, y: 0 }, "tap", "cold");
  const issues = projectReview(p);
  expect(issues.some((i) => i.target?.id === b && i.message.includes("Doppelte"))).toBe(true);
  expect(issues.some((i) => i.target?.id === tap && i.message.includes("Rohranschluss"))).toBe(true);
});
it("exportiert stabile Kalender-IDs, escaped Inhalte und ganztägige Termine", () => {
  const p = createProject(),
    b = homeBook(p);
  b.tasks.push({
    id: newId(),
    title: "Filter, Prüfung; jährlich",
    location: "Keller\nHeizung",
    target: null,
    itemId: null,
    notes: "",
    due: "2026-10-01",
    intervalMonths: 12,
    history: [],
  });
  setHomeBook(p, b);
  const output = maintenanceCalendar(p, new Date("2026-09-21T00:00:00Z"));
  expect(output).toContain("DTSTART;VALUE=DATE:20261001");
  expect(output).toContain("Filter\\, Prüfung\\; jährlich");
  expect(output).toContain("Keller\\nHeizung");
  expect(output).not.toContain("RRULE");
  expect(output.replace(/\r\n /g, "")).toContain(`${b.tasks[0]!.id}@home-technik`);
});
it("bewahrt benannte Versionsstände auch nach mehr als 20 automatischen Ständen", async () => {
  const repo = new IndexedDbRepository(`test-${newId()}`),
    p = createProject();
  await repo.save(p);
  await repo.saveNamedSnapshot(p, "Vor Umbau");
  for (let i = 0; i < 23; i++) {
    p.name = `Revision ${i}`;
    p.version++;
    await repo.save(p);
  }
  const rows = await repo.snapshots(p.id);
  expect(rows.some((s) => s.name === "Vor Umbau" && s.project.name === "Mein Haus")).toBe(true);
  expect(rows).toHaveLength(21);
  expect((await repo.load(p.id))!.name).toBe("Revision 22");
  await expect(repo.saveNamedSnapshot(p, " ")).rejects.toThrow();
});
