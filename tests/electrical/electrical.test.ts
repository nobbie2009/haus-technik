import { describe, expect, it } from "vitest";
import { rectangleFixture } from "../fixtures";
import { addElectrical, deleteCircuit } from "../../src/electrical/actions";
import { circuitMembers, deviceCircuitId, electricalCaption } from "../../src/electrical/selectors";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection, moveSelection } from "../../src/editor/actions/edit";
import { parseProject } from "../../src/core/validation";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { useProjectStore } from "../../src/stores/projectStore";
import { addFurniture } from "../../src/furniture/actions";

function fixture() {
  const { project, room, walls } = rectangleFixture();
  const floor = room.floorId;
  const board = addElectrical(project, floor, { x: 100, y: 100 }, "distributionBoards");
  const outlet = addElectrical(project, floor, { x: 1000, y: 0 }, "outlets");
  const device = addElectrical(project, floor, { x: 1000, y: 1500 }, "devices");
  const circuit = crypto.randomUUID(),
    protection = crypto.randomUUID();
  project.electrical.protectionDevices[protection] = {
    id: protection,
    upstreamProtectionDeviceId: null,
    distributionBoardId: board,
    type: "MCB",
    label: "F12",
    ratedCurrent: 16,
    characteristic: "B",
    poles: 1,
    residualCurrent: null,
    breakingCapacity: null,
    metadata: {},
  };
  project.electrical.circuits[circuit] = {
    id: circuit,
    name: "Wohnen",
    label: "SK-01",
    distributionBoardId: board,
    protectionDeviceId: protection,
    phase: "L1",
    nominalVoltage: 230,
    metadata: {},
  };
  project.electrical.outlets[outlet]!.circuitId = circuit;
  project.electrical.devices[device]!.connectionPointId = outlet;
  project.electrical.devices[device]!.ratedPower = 600;
  return { project, room, walls, board, outlet, device, circuit, protection };
}

describe("Elektrische Dokumentation", () => {
  it("erlaubt Leistung ohne Spannung und Strom und erhält IDs im JSON-Roundtrip", () => {
    const { project, device } = fixture();
    expect(parseProject(project).electrical.devices[device]).toMatchObject({
      ratedPower: 600,
      ratedVoltage: null,
      ratedCurrent: null,
    });
    expect(importProjectText(exportProjectText(project))).toEqual(project);
  });
  it("zählt Geräte über Steckdosen einmal und zeigt fehlende Leistungswerte explizit", () => {
    const { project, circuit, device } = fixture();
    const unknown = addElectrical(project, project.floorOrder[0]!, { x: 300, y: 500 }, "devices");
    project.electrical.devices[unknown]!.circuitId = circuit;
    expect(circuitMembers(project, circuit)).toMatchObject({ knownPower: 600, missingPower: 1 });
    expect(circuitMembers(project, circuit).devices).toHaveLength(2);
    project.electrical.devices[device]!.operatingMode = "off";
    expect(circuitMembers(project, circuit).knownPower).toBe(600);
  });
  it("erzeugt aus räumlicher Nähe keine elektrische Verbindung", () => {
    const { project, outlet, device } = fixture();
    project.electrical.devices[device]!.connectionPointId = null;
    const next = transact(project, (draft) => {
      draft.electrical.devices[device]!.position = { ...draft.electrical.outlets[outlet]!.position };
    });
    expect(deviceCircuitId(next, next.electrical.devices[device]!)).toBeNull();
  });
  it("ordnet Räume und Wandbezug räumlich zu und löst sie beim Verschieben", () => {
    const { project, room, walls, outlet, device } = fixture();
    expect(project.electrical.outlets[outlet]!.wallId).toBe(walls[0]!.id);
    expect(project.electrical.devices[device]!.roomId).toBe(room.id);
    const next = transact(project, (draft) =>
      moveSelection(draft, [{ kind: "outlets", id: outlet }], { x: 10000, y: 10000 }),
    );
    expect(next.electrical.outlets[outlet]).toMatchObject({ wallId: null, roomId: null });
  });
  it("bewahrt Objekte beim Löschen eines Verteilers und löst Stromkreiszuordnungen", () => {
    const { project, board, outlet, device } = fixture();
    const next = transact(project, (draft) =>
      deleteSelection(draft, [{ kind: "distributionBoards", id: board }]),
    );
    expect(next.electrical.circuits).toEqual({});
    expect(next.electrical.protectionDevices).toEqual({});
    expect(next.electrical.outlets[outlet]!.circuitId).toBeNull();
    expect(next.electrical.devices[device]!.connectionPointId).toBe(outlet);
  });
  it("löst Steckdosenbeziehungen beim Löschen und stellt sie mit Undo wieder her", () => {
    const { project, outlet, device } = fixture();
    useProjectStore.getState().replace(project);
    expect(
      useProjectStore
        .getState()
        .commit("Löschen", (draft) => deleteSelection(draft, [{ kind: "outlets", id: outlet }])),
    ).toBe(true);
    expect(useProjectStore.getState().project.electrical.devices[device]!.connectionPointId).toBeNull();
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.electrical).toEqual(project.electrical);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.electrical.outlets[outlet]).toBeUndefined();
  });
  it("remappt gemeinsam duplizierte Möbel, Steckdosen und Verbraucher", () => {
    const { project, outlet, device, room } = fixture();
    const furniture = addFurniture(project, room.floorId, { x: 1000, y: 1500 }, "television");
    project.electrical.devices[device]!.furnitureId = furniture;
    const next = transact(project, (draft) => {
      duplicateSelection(draft, [
        { kind: "devices", id: device },
        { kind: "outlets", id: outlet },
        { kind: "furniture", id: furniture },
      ]);
    });
    const copy = Object.values(next.electrical.devices).find((item) => item.id !== device)!;
    expect(copy.connectionPointId).not.toBe(outlet);
    expect(next.electrical.outlets[copy.connectionPointId!]).toBeDefined();
    expect(copy.furnitureId).not.toBe(furniture);
    expect(next.furniture[copy.furnitureId!]).toBeDefined();
  });
  it("sperrt auch Stromkreis- und Schutzgerätänderungen transaktional", () => {
    const { project, board, circuit, protection, outlet } = fixture();
    project.layers[project.electrical.distributionBoards[board]!.layerId]!.locked = true;
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.circuits[circuit]!.name = "Neu";
      }),
    ).toThrow(/gesperrt/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.protectionDevices[protection]!.ratedCurrent = 20;
      }),
    ).toThrow(/gesperrt/);
    expect(() => transact(project, (draft) => deleteCircuit(draft, circuit))).toThrow(/gesperrt/);
    expect(() =>
      transact(project, (draft) => moveSelection(draft, [{ kind: "outlets", id: outlet }], { x: 100, y: 0 })),
    ).toThrow(/gesperrt/);
  });
  it("berücksichtigt Sichtbarkeit und Geschosse beim Treffertest", () => {
    const { project, outlet } = fixture();
    const item = project.electrical.outlets[outlet]!;
    expect(hitTest(project, item.floorId, item.position, 0.1)).toEqual({ kind: "outlets", id: outlet });
    expect(hitTest(project, crypto.randomUUID(), item.position, 0.1)).toBeNull();
    project.layers[item.layerId]!.visible = false;
    expect(hitTest(project, item.floorId, item.position, 0.1)?.kind).toBe("walls");
  });
  it.each(["roomId", "connectionPointId", "furnitureId", "circuitId"] as const)(
    "verwirft ungültige Referenz %s",
    (key) => {
      const { project, device } = fixture();
      project.electrical.devices[device]![key] = crypto.randomUUID();
      expect(() => parseProject(project)).toThrow();
    },
  );
  it("verwirft doppelte IDs über Modulgrenzen und widersprüchliche Anschlüsse", () => {
    const { project, device, circuit } = fixture();
    project.electrical.devices[device]!.circuitId = circuit;
    expect(() => parseProject(project)).toThrow();
    project.electrical.devices[device]!.circuitId = null;
    project.electrical.devices[device]!.id = project.id;
    expect(() => parseProject(project)).toThrow();
  });
  it.each([-1, Infinity, NaN])("verwirft ungültige Leistung %s", (value) => {
    const { project, device } = fixture();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.devices[device]!.ratedPower = value;
      }),
    ).toThrow();
    expect(project.electrical.devices[device]!.ratedPower).toBe(600);
  });
  it("löst Beschriftung aus Modell und expliziter Stromkreiszuordnung auf", () => {
    const { project, outlet, device } = fixture();
    const item = project.electrical.outlets[outlet]!;
    item.labelMode = "number";
    expect(electricalCaption(project, item)).toBe(item.number);
    project.electrical.devices[device]!.labelMode = "circuit";
    expect(electricalCaption(project, project.electrical.devices[device]!)).toBe("SK-01");
    item.labelMode = "none";
    expect(electricalCaption(project, item)).toBe("");
  });
});
