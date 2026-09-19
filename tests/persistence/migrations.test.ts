import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { rectangleFixture } from "../fixtures";
import { createProject } from "../../src/core/projectFactory";
import { migrateProject } from "../../src/persistence/migrations";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";
import { IndexedDbRepository } from "../../src/persistence/indexedDbRepository";
import { addFurniture } from "../../src/furniture/actions";
import { addElectrical } from "../../src/electrical/actions";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import { addCable } from "../../src/electrical/cables";
import { defaultElectricalSettings } from "../../src/electrical/models";
import { distributionFixture } from "../electrical/distributionFixture";
import { simulationFixture } from "../simulation/fixture";

function version9Electrical(project: ReturnType<typeof createProject>) {
  const { controls: _controls, transformers: _transformers, ...rest } = project.electrical;
  return {
    ...rest,
    devices: Object.fromEntries(
      Object.entries(rest.devices).map(
        ([id, { controlId: _control, transformerId: _transformer, ...item }]) => [id, item],
      ),
    ),
    cables: Object.fromEntries(
      Object.entries(rest.cables).map(([id, { riser: _riser, endPath: _end, ...item }]) => [id, item]),
    ),
  };
}
function version9Fixture() {
  const { project } = simulationFixture();
  return { ...project, schemaVersion: 9, electrical: version9Electrical(project) };
}

function legacyFixture() {
  const { furniture: _furniture, electrical: _electrical, ...project } = rectangleFixture().project;
  for (const layer of Object.values(project.layers))
    if (layer.kind === "furniture" || layer.kind === "electrical") {
      delete project.layers[layer.id];
      project.layerOrder = project.layerOrder.filter((id) => id !== layer.id);
    }
  return { ...project, schemaVersion: 1 };
}

function version2Fixture() {
  const project = rectangleFixture().project;
  addFurniture(project, project.floorOrder[0]!, { x: 1000, y: 1000 }, "sofa");
  const { electrical: _electrical, ...legacy } = project;
  const layer = Object.values(legacy.layers).find((item) => item.kind === "electrical")!;
  delete legacy.layers[layer.id];
  legacy.layerOrder = legacy.layerOrder.filter((id) => id !== layer.id);
  return { ...legacy, schemaVersion: 2 };
}
function version3Fixture() {
  const project = rectangleFixture().project;
  const outlet = addElectrical(project, project.floorOrder[0]!, { x: 1000, y: 0 }, "outlets");
  const device = addElectrical(project, project.floorOrder[0]!, { x: 1000, y: 1000 }, "devices");
  project.electrical.devices[device]!.connectionPointId = outlet;
  project.electrical.devices[device]!.ratedPower = 600;
  const {
    cables: _cables,
    junctions: _junctions,
    settings: _settings,
    supplies: _supplies,
    meters: _meters,
    switches: _switches,
    ...electrical
  } = version9Electrical(project);
  return {
    ...project,
    schemaVersion: 3,
    electrical: {
      ...electrical,
      devices: Object.fromEntries(
        Object.entries(electrical.devices).map(([id, { switchId: _switch, ...device }]) => [id, device]),
      ),
    },
  };
}

function version4Fixture() {
  const project = createProject("Alter Verteilerbestand");
  const floor = project.floorOrder[0]!;
  const board = addElectrical(project, floor, { x: 0, y: 0 }, "distributionBoards");
  const outlet = addElectrical(project, floor, { x: 1000, y: 0 }, "outlets");
  addProtectionDevice(project, board);
  addCable(project, board, outlet, []);
  project.electrical.outlets[outlet]!.ratedVoltage = 110;
  const {
    settings: _settings,
    supplies: _supplies,
    meters: _meters,
    switches: _switches,
    ...electrical
  } = version9Electrical(project);
  return {
    ...project,
    schemaVersion: 4,
    electrical: {
      ...electrical,
      cables: Object.fromEntries(
        Object.entries(electrical.cables).map(
          ([id, { conductorConnections: _connections, connectionAssignment: _assignment, ...cable }]) => [
            id,
            cable,
          ],
        ),
      ),
      distributionBoards: Object.fromEntries(
        Object.entries(electrical.distributionBoards).map(
          ([id, { supplyId: _s, meterId: _m, upstreamCircuitId: _u, ...item }]) => [id, item],
        ),
      ),
      protectionDevices: Object.fromEntries(
        Object.entries(electrical.protectionDevices).map(
          ([id, { upstreamProtectionDeviceId: _u, ...item }]) => [id, item],
        ),
      ),
    },
  };
}

function version5Fixture() {
  const { project } = distributionFixture();
  const { switches: _switches, ...electrical } = version9Electrical(project);
  return {
    ...project,
    schemaVersion: 5,
    electrical: {
      ...electrical,
      distributionBoards: Object.fromEntries(
        Object.entries(project.electrical.distributionBoards).map(
          ([id, { upstreamCircuitId: _upstream, ...board }]) => [id, board],
        ),
      ),
    },
  };
}

function version6Fixture() {
  const { project } = simulationFixture();
  const { switches: _switches, ...electrical } = version9Electrical(project);
  return {
    ...project,
    schemaVersion: 6,
    electrical: {
      ...electrical,
      devices: Object.fromEntries(
        Object.entries(electrical.devices).map(([id, { switchId: _switch, ...device }]) => [id, device]),
      ),
    },
  };
}

function version7Fixture() {
  const { project, devices, outlet } = simulationFixture();
  addCable(project, outlet, devices[0]!, []);
  return {
    ...project,
    schemaVersion: 7,
    electrical: {
      ...version9Electrical(project),
      cables: Object.fromEntries(
        Object.entries(version9Electrical(project).cables).map(
          ([id, { conductorConnections: _c, connectionAssignment: _a, ...cable }]) => [id, cable],
        ),
      ),
    },
  };
}

function version8Fixture() {
  const { project, upper, terminal, devices } = simulationFixture([25]);
  const id = addElectrical(project, upper.id, { x: 100, y: 100 }, "switches");
  project.electrical.switches[id]!.circuitId = terminal;
  Object.assign(project.electrical.devices[devices[0]!]!, {
    circuitId: terminal,
    connectionPointId: null,
    switchId: id,
  });
  return {
    ...project,
    schemaVersion: 8,
    electrical: {
      ...version9Electrical(project),
      switches: Object.fromEntries(
        Object.entries(project.electrical.switches).map(([key, { supply: _supply, ...item }]) => [key, item]),
      ),
    },
  };
}

describe("Schema-Migrationen nach Version 10", () => {
  it("erhält alle bisherigen IDs, Daten, Revisionen und Zeitstempel", () => {
    const legacy = legacyFixture();
    const input = JSON.stringify(legacy);
    const migrated = importProjectText(input);
    expect(migrated).toMatchObject({
      ...legacy,
      schemaVersion: 10,
      furniture: {},
      layerOrder: migrated.layerOrder,
    });
    expect(migrated.layerOrder.slice(0, 2)).toEqual(legacy.layerOrder);
    expect(migrated.layerOrder).toHaveLength(4);
    expect(JSON.stringify(legacy)).toBe(input);
    expect(migrateProject(migrated)).toEqual(migrated);
    expect(importProjectText(exportProjectText(migrated))).toEqual(migrated);
  });
  it("verwirft beschädigte und unbekannte Daten statt sie zu entfernen", () => {
    expect(() => migrateProject({ ...legacyFixture(), unknown: true })).toThrow();
    const broken = legacyFixture();
    delete broken.points[Object.keys(broken.points)[0]!];
    expect(() => migrateProject(broken)).toThrow();
    expect(() => migrateProject({ ...legacyFixture(), schemaVersion: 999 })).toThrow();
  });
  it("erhält den Möbelbestand einer Version-2-Datei und ergänzt nur Elektrik", () => {
    const legacy = version2Fixture();
    const serialized = JSON.stringify(legacy);
    const migrated = importProjectText(serialized);
    expect(migrated.furniture).toEqual(legacy.furniture);
    expect(migrated.walls).toEqual(legacy.walls);
    expect(migrated.rooms).toEqual(legacy.rooms);
    expect(migrated.version).toBe(legacy.version);
    expect(migrated.updatedAt).toBe(legacy.updatedAt);
    expect(migrated.layerOrder.slice(0, 3)).toEqual(legacy.layerOrder);
    expect(JSON.stringify(legacy)).toBe(serialized);
    expect(() => migrateProject({ ...legacy, unknown: true })).toThrow();
  });
  it("erhält Version-3-Elektroobjekte und Anschlussreferenzen unverändert", () => {
    const legacy = version3Fixture();
    const migrated = importProjectText(JSON.stringify(legacy));
    expect(migrated.electrical).toEqual({
      ...legacy.electrical,
      cables: {},
      junctions: {},
      supplies: {},
      meters: {},
      switches: {},
      controls: {},
      transformers: {},
      devices: Object.fromEntries(
        Object.entries(legacy.electrical.devices).map(([id, device]) => [
          id,
          { ...device, switchId: null, controlId: null, transformerId: null },
        ]),
      ),
      settings: defaultElectricalSettings(),
    });
    expect(migrated.layerOrder).toEqual(legacy.layerOrder);
    expect(migrated.updatedAt).toBe(legacy.updatedAt);
    expect(migrated.version).toBe(legacy.version);
    expect(() => migrateProject({ ...legacy, electrical: { ...legacy.electrical, unknown: {} } })).toThrow();
  });
  it("ergänzt Version 4 ohne Kabel, Bauteilwerte oder Sicherungsdaten zu verändern", () => {
    const legacy = version4Fixture();
    const before = JSON.stringify(legacy);
    const migrated = importProjectText(before);
    expect(migrated.electrical.outlets).toEqual(legacy.electrical.outlets);
    expect(migrated.electrical.cables).toEqual(
      Object.fromEntries(
        Object.entries(legacy.electrical.cables).map(([id, cable]) => [
          id,
          { ...cable, riser: null, endPath: [], conductorConnections: [], connectionAssignment: "none" },
        ]),
      ),
    );
    expect(migrated.electrical.settings).toEqual(defaultElectricalSettings());
    expect(migrated.electrical.supplies).toEqual({});
    expect(migrated.electrical.meters).toEqual({});
    for (const [id, item] of Object.entries(legacy.electrical.distributionBoards))
      expect(migrated.electrical.distributionBoards[id]).toEqual({
        ...item,
        supplyId: null,
        meterId: null,
        upstreamCircuitId: null,
      });
    for (const [id, item] of Object.entries(legacy.electrical.protectionDevices))
      expect(migrated.electrical.protectionDevices[id]).toEqual({
        ...item,
        upstreamProtectionDeviceId: null,
      });
    expect(migrated.updatedAt).toBe(legacy.updatedAt);
    expect(migrated.version).toBe(legacy.version);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(() => migrateProject({ ...legacy, electrical: { ...legacy.electrical, unknown: {} } })).toThrow();
  });
  it("erhält Schema 5 mit Einspeisung und Schutzgeräten und ergänzt nur leere Verteilerreferenzen", () => {
    const legacy = version5Fixture();
    const result = migrateProject(legacy);
    expect(result.electrical.supplies).toEqual(legacy.electrical.supplies);
    expect(result.electrical.protectionDevices).toEqual(legacy.electrical.protectionDevices);
    expect(result.electrical.circuits).toEqual(legacy.electrical.circuits);
    expect(result.version).toBe(legacy.version);
    for (const [id, board] of Object.entries(legacy.electrical.distributionBoards))
      expect(result.electrical.distributionBoards[id]).toEqual({ ...board, upstreamCircuitId: null });
    expect(() => migrateProject({ ...legacy, unknown: true })).toThrow();
  });
  it("migriert Schema 6 ohne implizite Schalter und ohne Bestandsänderungen", () => {
    const legacy = version6Fixture();
    const before = JSON.stringify(legacy);
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.electrical.switches).toEqual({});
    for (const [id, device] of Object.entries(legacy.electrical.devices))
      expect(migrated.electrical.devices[id]).toEqual({
        ...device,
        switchId: null,
        controlId: null,
        transformerId: null,
      });
    expect(migrated.electrical.distributionBoards).toEqual(legacy.electrical.distributionBoards);
    expect(migrated.version).toBe(legacy.version);
    expect(migrated.updatedAt).toBe(legacy.updatedAt);
    expect(JSON.stringify(legacy)).toBe(before);
    expect(() => migrateProject({ ...legacy, electrical: { ...legacy.electrical, switches: {} } })).toThrow();
  });
  it("ergänzt Schema 7 ohne Kontakt- oder Simulationszuordnungen zu erfinden", () => {
    const legacy = version7Fixture();
    const before = JSON.stringify(legacy);
    const result = migrateProject(legacy);
    for (const [id, cable] of Object.entries(legacy.electrical.cables))
      expect(result.electrical.cables[id]).toEqual({
        ...cable,
        riser: null,
        endPath: [],
        conductorConnections: [],
        connectionAssignment: "none",
      });
    expect(result.electrical.devices).toEqual(
      Object.fromEntries(
        Object.entries(legacy.electrical.devices).map(([id, d]) => [
          id,
          { ...d, controlId: null, transformerId: null },
        ]),
      ),
    );
    expect(result.updatedAt).toBe(legacy.updatedAt);
    expect(result.version).toBe(legacy.version);
    expect(JSON.stringify(legacy)).toBe(before);
  });
  it("erhält Schalter aus Schema 8 mit direkter Versorgung und unveränderten Verbraucherzuordnungen", () => {
    const legacy = version8Fixture();
    const next = migrateProject(legacy);
    for (const [id, item] of Object.entries(legacy.electrical.switches))
      expect(next.electrical.switches[id]).toEqual({ ...item, supply: { kind: "circuit" } });
    expect(next.electrical.devices).toEqual(
      Object.fromEntries(
        Object.entries(legacy.electrical.devices).map(([id, d]) => [
          id,
          { ...d, controlId: null, transformerId: null },
        ]),
      ),
    );
    expect(next.updatedAt).toBe(legacy.updatedAt);
    expect(next.version).toBe(legacy.version);
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    "migriert gespeicherte Version %s einmalig ohne das aktive Projekt zu wechseln",
    async (version) => {
      const name = `migration-${crypto.randomUUID()}`;
      const repository = new IndexedDbRepository(name);
      const active = createProject("Aktives Projekt");
      await repository.save(active);
      const legacy =
        version === 1
          ? legacyFixture()
          : version === 2
            ? version2Fixture()
            : version === 3
              ? version3Fixture()
              : version === 4
                ? version4Fixture()
                : version === 5
                  ? version5Fixture()
                  : version === 6
                    ? version6Fixture()
                    : version === 7
                      ? version7Fixture()
                      : version === 8
                        ? version8Fixture()
                        : version9Fixture();
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("projects", "readwrite");
        tx.objectStore("projects").put(legacy);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      const first = await repository.load(legacy.id);
      expect(first?.schemaVersion).toBe(10);
      expect(await repository.load(legacy.id)).toEqual(first);
      expect(await repository.loadActive()).toEqual(active);
      db.close();
    },
  );
});
