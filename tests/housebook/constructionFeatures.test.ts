import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { addWallPath } from "../../src/editor/actions/topology";
import { addElectrical } from "../../src/electrical/actions";
import { transact } from "../../src/editor/history/transaction";
import { mountOnWall } from "../../src/housebook/wallElevation";
import { asset } from "../../src/housebook/model";
import { addSiteElement } from "../../src/site/model";
import { setWallPhotos, wallPhotos, wallPhotoSvg } from "../../src/housebook/wallPhotos";
import {
  constructionNotes,
  setConstructionNotes,
  type ConstructionNote,
} from "../../src/housebook/construction";
import { IndexedDbRepository } from "../../src/persistence/indexedDbRepository";
import type { ConsumerEntry } from "../../src/electrical/consumerLibrary";
const id = () => crypto.randomUUID();
describe("Wandansicht und Baustellendokumentation", () => {
  it("setzt Montagepunkte auf beiden Wandseiten und respektiert Grenzen und Sperren", () => {
    let p = createProject();
    const floor = p.floorOrder[0]!;
    const wall = addWallPath(p, floor, { x: 0, y: 0 }, { x: 4000, y: 0 }).wallIds[0]!;
    const outlet = addElectrical(p, floor, { x: 100, y: 100 }, "outlets");
    p = transact(p, (d) => mountOnWall(d, wall, outlet, 1200, 350, 1));
    expect(p.electrical.outlets[outlet]!.position).toEqual({ x: 1200, y: p.walls[wall]!.thickness / 2 });
    p = transact(p, (d) => mountOnWall(d, wall, outlet, 2000, 600, -1));
    expect(p.electrical.outlets[outlet]!.position.y).toBe(-p.walls[wall]!.thickness / 2);
    expect(asset(p.electrical.outlets[outlet]!).mounting?.height).toBe(600);
    expect(() => mountOnWall(p, wall, outlet, 4001, 300, 1)).toThrow();
    expect(() => mountOnWall(p, wall, outlet, 100, Infinity, 1)).toThrow();
    p.layers[p.electrical.outlets[outlet]!.layerId]!.locked = true;
    expect(() => mountOnWall(p, wall, outlet, 100, 300, 1)).toThrow(/gesperrt/);
  });
  it("erhält Außenfotos und benannte Bezugspunkte auch im Export und prüft Bildgrenzen", () => {
    const p = createProject();
    const area = addSiteElement(p, p.floorOrder[0]!, "reference", [{ x: 0, y: 0 }]);
    setWallPhotos(p, area, [
      {
        id: id(),
        name: "Garten",
        side: "Nord",
        notes: "",
        data: "data:image/png;base64,AAAA",
        pixelWidth: 1000,
        pixelHeight: 500,
        calibration: null,
        traces: [],
        references: [{ id: id(), name: "Ecke <A>", notes: "Zaun", point: { x: 0.2, y: 0.3 } }],
      },
    ]);
    const loaded = parseProject(JSON.parse(JSON.stringify(p)));
    const photo = wallPhotos(loaded, area)[0]!;
    expect(photo.references?.[0]?.point).toEqual({ x: 0.2, y: 0.3 });
    expect(wallPhotoSvg(photo)).toContain("Ecke &lt;A&gt;");
    photo.references![0]!.point.x = 1.1;
    expect(() => setWallPhotos(p, area, [photo])).toThrow();
  });
  it("bewahrt Fotos, Messwerte und Sprachnotizen und weist fremde Medien-URLs zurück", () => {
    const p = createProject();
    const row: ConstructionNote = {
      id: id(),
      at: new Date().toISOString(),
      title: "Kabelgraben",
      target: null,
      notes: "Vor dem Verfüllen",
      measurement: "45 cm unter Kante",
      done: false,
      photo: "data:image/png;base64,AAAA",
      audio: "data:audio/webm;codecs=opus;base64,AAAA",
    };
    setConstructionNotes(p, [row]);
    expect(constructionNotes(parseProject(JSON.parse(JSON.stringify(p))))).toEqual([row]);
    expect(() => setConstructionNotes(p, [row, row])).toThrow();
    expect(() => setConstructionNotes(p, [{ ...row, audio: "https://example.com/audio.mp3" }])).toThrow();
  });
  it("speichert Vorlagen unabhängig vom Projekt ohne Seriennummer und ohne parallele Einträge zu verlieren", async () => {
    const name = `library-${id()}`,
      a = new IndexedDbRepository(name),
      b = new IndexedDbRepository(name);
    const entry: ConsumerEntry = {
      id: id(),
      name: "Gerät",
      manufacturer: "Hersteller",
      model: "Modell",
      serial: "individuell",
      width: 600,
      depth: 500,
      height: 900,
      rotation: 0,
      annualEnergyKWh: 100,
      ratedPower: 1000,
      ratedVoltage: 230,
      phases: 1,
    };
    const second = { ...entry, id: id(), name: "Zweites Gerät" };
    await Promise.all([a.updateDeviceLibrary(entry), b.updateDeviceLibrary(second)]);
    await a.save(createProject("Anderes Projekt"));
    expect(await b.deviceLibrary()).toHaveLength(2);
    expect((await b.deviceLibrary()).every((e) => e.serial === "")).toBe(true);
    expect(entry.serial).toBe("individuell");
    await a.updateDeviceLibrary(entry, true);
    expect((await b.deviceLibrary())[0]?.name).toBe("Zweites Gerät");
  });
});
