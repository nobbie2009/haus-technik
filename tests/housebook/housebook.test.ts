import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createDemoProject } from "../../src/editor/demoProject";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { addElectrical } from "../../src/electrical/actions";
import { moveSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { addWallPath } from "../../src/editor/actions/topology";
import { asset, setAsset, housebook, setHousebook, cleanScenario } from "../../src/housebook/model";
import { saveRoomTemplate, insertRoomTemplate } from "../../src/housebook/templates";
import { projectReview } from "../../src/housebook/review";
import { csv, planSvg, materialRows } from "../../src/housebook/export";
import { IndexedDbRepository } from "../../src/persistence/indexedDbRepository";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";
import { simulationFixture } from "../simulation/fixture";
import { emptyScenario } from "../../src/simulation/models";
import { simulate } from "../../src/simulation/solve";
import { createRoom } from "../../src/editor/actions/create";
import { addCable } from "../../src/electrical/cables";
import { setCableContacts } from "../../src/electrical/contacts";

describe("Hausakte", () => {
  it("remappt Aderkontakte kopierter Verteilerabgänge auf neue Stromkreis-IDs", () => {
    const data = simulationFixture([25]);
    let p = data.project;
    const room = createRoom(
      p,
      data.upper.id,
      [
        { x: 1000, y: -1000 },
        { x: 6000, y: -1000 },
        { x: 6000, y: 3000 },
        { x: 1000, y: 3000 },
      ],
      "Technikraum",
    );
    const cable = addCable(p, data.sub, data.devices[0]!, []);
    setCableContacts(
      p,
      cable,
      [
        { startContactId: `${data.terminal}:L`, endContactId: "L" },
        { startContactId: `${data.terminal}:N`, endContactId: "N" },
      ],
      false,
    );
    p = transact(p, () => {});
    p = transact(p, (p) => saveRoomTemplate(p, room, "Technik"));
    p = transact(p, (p) => {
      insertRoomTemplate(p, housebook(p).templates[0]!.id, data.upper.id, 20000, 0);
    });
    const copied = Object.values(p.electrical.cables).find((c) => c.id !== cable)!;
    expect(copied.conductorConnections).toHaveLength(2);
    expect(copied.conductorConnections[0]!.startContactId).not.toContain(data.terminal);
    const circuit = p.electrical.circuits[copied.conductorConnections[0]!.startContactId.split(":")[0]!]!;
    expect(circuit.distributionBoardId).toBe(copied.startNodeId);
    expect(() => parseProject(p)).not.toThrow();
  });
  it("übernimmt zusammengehörige Schaltgruppen in neue, noch unversorgte Vorlagenstromkreise", () => {
    const data = simulationFixture([25]);
    let p = data.project;
    const roomId = createRoom(
      p,
      data.upper.id,
      [
        { x: 3000, y: -1000 },
        { x: 6000, y: -1000 },
        { x: 6000, y: 3000 },
        { x: 3000, y: 3000 },
      ],
      "Lichtzimmer",
    );
    const group = addElectrical(p, data.upper.id, { x: 4100, y: 1000 }, "controls"),
      a = addElectrical(p, data.upper.id, { x: 4200, y: 1000 }, "switches"),
      b = addElectrical(p, data.upper.id, { x: 4300, y: 1000 }, "switches");
    p.electrical.switches[a]!.circuitId = data.terminal;
    p.electrical.switches[b]!.circuitId = data.terminal;
    Object.assign(p.electrical.controls[group]!, { circuitId: data.terminal, switchIds: [a, b] });
    Object.assign(p.electrical.devices[data.devices[0]!]!, {
      connectionPointId: null,
      circuitId: data.terminal,
      controlId: group,
    });
    p = transact(p, () => {});
    p = transact(p, (p) => saveRoomTemplate(p, roomId, "Lichtzimmer"));
    p = transact(p, (p) => {
      insertRoomTemplate(p, housebook(p).templates[0]!.id, data.upper.id, 20000, 0);
    });
    const copy = Object.values(p.electrical.controls).find((g) => g.id !== group)!;
    expect(copy.switchIds).toHaveLength(2);
    expect(copy.circuitId).not.toBe(data.terminal);
    const board =
      p.electrical.distributionBoards[p.electrical.circuits[copy.circuitId!]!.distributionBoardId]!;
    expect(board.supplyId).toBeNull();
    expect(board.meterId).toBeNull();
    expect(board.upstreamCircuitId).toBeNull();
    expect(() => parseProject(p)).not.toThrow();
  });
  it("erhält neue Angaben, Szenarien und Bilder im JSON-Roundtrip", () => {
    const p = createDemoProject(),
      room = Object.values(p.rooms)[0]!,
      record = asset(room);
    record.status = "planned";
    record.notes = "Fenster austauschen";
    setAsset(room, record);
    const b = housebook(p);
    b.scenarios.push({ id: crypto.randomUUID(), name: "Abend", scenario: emptyScenario() });
    b.backgrounds[room.floorId] = {
      name: "Plan",
      data: "data:image/png;base64,AAAA",
      pixelWidth: 100,
      pixelHeight: 100,
      width: 5000,
      position: { x: -1000, y: 5000 },
      opacity: 0.4,
      visible: true,
    };
    setHousebook(p, b);
    expect(importProjectText(exportProjectText(p))).toEqual(p);
    expect(planSvg(p, room.floorId, 50, "all")).toContain("width=");
  });
  it("lehnt fehlerhafte neue Daten und aktive Dokumentlinks ab", () => {
    const p = createDemoProject();
    p.metadata.housebook = { version: 2 };
    expect(() => parseProject(p)).toThrow();
    delete p.metadata.housebook;
    const room = Object.values(p.rooms)[0]!;
    room.metadata.asset = { documentUrl: "javascript:alert(1)" };
    expect(() => parseProject(p)).toThrow();
  });
  it("erkennt fehlende Daten und bereinigt gespeicherte Szenarien nach Löschungen", () => {
    const { project, devices } = simulationFixture();
    const id = devices[0]!;
    project.electrical.devices[id]!.ratedPower = null;
    expect(projectReview(project).some((i) => i.target?.id === id && i.message.includes("Leistungs"))).toBe(
      true,
    );
    const s = emptyScenario();
    s.deviceStates[id] = "off";
    const missing = crypto.randomUUID();
    s.deviceStates[missing] = "on";
    expect(cleanScenario(project, s).deviceStates).toEqual({ [id]: "off" });
    expect(simulate(project, cleanScenario(project, s)).devices[id]!.status).toBe("off");
  });
  it("bindet Objekte an Wände und schützt indirekt gesperrte Objekte", () => {
    let p = createProject();
    const floor = p.floorOrder[0]!;
    const wall = addWallPath(p, floor, { x: 0, y: 0 }, { x: 5000, y: 0 }).wallIds[0]!;
    const id = addElectrical(p, floor, { x: 1000, y: 100 }, "outlets");
    p = transact(p, (p) => {
      const r = asset(p.electrical.outlets[id]!);
      r.mounting = { wallId: wall, distance: 1000, offset: 100, height: 300 };
      setAsset(p.electrical.outlets[id]!, r);
    });
    p = transact(p, (p) => moveSelection(p, [{ kind: "walls", id: wall }], { x: 500, y: 200 }));
    expect(p.electrical.outlets[id]!.position).toEqual({ x: 1500, y: 300 });
    p.layers[p.electrical.outlets[id]!.layerId]!.locked = true;
    expect(() =>
      transact(p, (p) => moveSelection(p, [{ kind: "walls", id: wall }], { x: 500, y: 0 })),
    ).toThrow(/gesperrt/);
  });
  it("führt Wandbefestigungen bei T-Anschlüssen auf das richtige Teilsegment mit", () => {
    let p = createProject();
    const floor = p.floorOrder[0]!,
      wall = addWallPath(p, floor, { x: 0, y: 0 }, { x: 5000, y: 0 }).wallIds[0]!;
    const id = addElectrical(p, floor, { x: 4000, y: 100 }, "outlets");
    const record = asset(p.electrical.outlets[id]!);
    record.mounting = { wallId: wall, distance: 4000, offset: 100, height: 300 };
    setAsset(p.electrical.outlets[id]!, record);
    p = transact(p, (p) => {
      addWallPath(p, floor, { x: 2000, y: -1000 }, { x: 2000, y: 0 });
    });
    expect(p.electrical.outlets[id]!.position).toEqual({ x: 4000, y: 100 });
    expect(asset(p.electrical.outlets[id]!).mounting?.distance).toBe(2000);
  });
  it("kopiert Wände mit ihren befestigten Objekten referenztreu", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!,
      wall = addWallPath(p, floor, { x: 0, y: 0 }, { x: 5000, y: 0 }).wallIds[0]!;
    const id = addElectrical(p, floor, { x: 1000, y: 0 }, "outlets"),
      record = asset(p.electrical.outlets[id]!);
    record.mounting = { wallId: wall, distance: 1000, offset: 0, height: 300 };
    setAsset(p.electrical.outlets[id]!, record);
    const next = transact(p, (p) => {
      duplicateSelection(
        p,
        [
          { kind: "walls", id: wall },
          { kind: "outlets", id },
        ],
        { x: 10000, y: 0 },
      );
    });
    const copy = Object.values(next.electrical.outlets).find((o) => o.id !== id)!;
    expect(copy.position.x).toBe(11000);
    expect(asset(copy).mounting?.wallId).not.toBe(wall);
  });
  it("fügt einen eingerichteten Vorlagenraum mit neuen IDs und gelöster externer Versorgung ein", () => {
    let p = createDemoProject();
    const room = Object.values(p.rooms)[0]!,
      floor = room.floorId;
    p = transact(p, (p) => {
      addElectrical(p, floor, { x: 1000, y: 1000 }, "outlets");
    });
    p = transact(p, (p) => saveRoomTemplate(p, room.id, "Wohnzimmer"));
    const before = new Set(Object.keys(p.electrical.outlets));
    p = transact(p, (p) => {
      insertRoomTemplate(p, housebook(p).templates[0]!.id, floor, 20000, 0);
    });
    expect(Object.keys(p.rooms)).toHaveLength(5);
    const copy = Object.values(p.electrical.outlets).find((n) => !before.has(n.id))!;
    expect(copy.position.x).toBe(21000);
    expect(copy.roomId).not.toBe(room.id);
    expect(asset(copy).status).toBe("planned");
    expect(copy.circuitId).toBeNull();
    expect(() => parseProject(p)).not.toThrow();
  });
  it("verhindert doppelte Netzwerkports und liefert sichere CSV-/SVG-Ausgabe", () => {
    const p = createDemoProject(),
      b = housebook(p),
      floorId = p.floorOrder[0]!;
    const a = {
        id: crypto.randomUUID(),
        name: "A",
        kind: "socket" as const,
        ports: 2,
        floorId,
        position: { x: 0, y: 0 },
      },
      c = { ...a, id: crypto.randomUUID(), name: "B" };
    b.networkNodes.push(a, c);
    b.networkLinks.push({
      id: crypto.randomUUID(),
      name: "LAN",
      from: a.id,
      to: c.id,
      fromPort: 1,
      toPort: 1,
      cableType: "Cat6",
      allowance: 0,
    });
    setHousebook(p, b);
    parseProject(p);
    b.networkLinks.push({ ...b.networkLinks[0]!, id: crypto.randomUUID() });
    setHousebook(p, b);
    expect(() => parseProject(p)).toThrow();
    expect(csv([["=HYPERLINK(1)", 'A"B']])).toContain("'=HYPERLINK");
    expect(csv([["A\nB"]])).toContain('"A\nB"');
    Object.values(p.rooms)[0]!.name = '<script>alert("x")</script>';
    expect(planSvg(p, floorId, 50, "all")).not.toContain("<script>");
    expect(materialRows(p)[0]).toContain("Status");
  });
});
describe("Wiederherstellung und konkurrierende Tabs", () => {
  it("bewahrt alte Stände auf und lehnt konkurrierendes Überschreiben atomar ab", async () => {
    const name = `book-${crypto.randomUUID()}`,
      a = new IndexedDbRepository(name),
      b = new IndexedDbRepository(name),
      p = createProject();
    await a.save(p);
    const copy = (await b.load(p.id))!;
    const next = { ...p, name: "Tab A", version: 1 };
    await a.save(next);
    await expect(b.save({ ...copy, name: "Tab B", version: 1 })).rejects.toThrow(/anderer Tab/);
    expect((await a.load(p.id))?.name).toBe("Tab A");
    expect((await a.snapshots(p.id))[0]!.project.name).toBe(p.name);
    await b.load(p.id);
    await b.save({ ...next, name: "Nach Neuladen", version: 2 });
    expect((await b.snapshots(p.id)).length).toBe(2);
  });
  it("begrenzt die Anzahl früherer Stände", async () => {
    const r = new IndexedDbRepository(`book-${crypto.randomUUID()}`),
      p = createProject();
    for (let i = 0; i < 25; i++) await r.save({ ...p, version: i });
    expect(await r.snapshots(p.id)).toHaveLength(20);
  });
});
