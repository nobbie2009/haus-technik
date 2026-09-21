import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import { circuitSupply, objectSupply, protectionChain } from "../../src/electrical/supply";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection, moveSelection } from "../../src/editor/actions/edit";
import { useProjectStore } from "../../src/stores/projectStore";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { addCable } from "../../src/electrical/cables";

function fixture() {
  const project = createProject();
  const floor = project.floorOrder[0]!;
  const source = addElectrical(project, floor, { x: 0, y: 0 }, "supplies");
  const meter = addElectrical(project, floor, { x: 1000, y: 0 }, "meters");
  const board = addElectrical(project, floor, { x: 2000, y: 0 }, "distributionBoards");
  const outlet = addElectrical(project, floor, { x: 3000, y: 0 }, "outlets");
  const device = addElectrical(project, floor, { x: 4000, y: 0 }, "devices");
  project.electrical.supplies[source]!.ratedCurrent = 63;
  project.electrical.meters[meter]!.supplyId = source;
  project.electrical.meters[meter]!.serialNumber = "Z-001234";
  project.electrical.meters[meter]!.readingKWh = 123.45;
  project.electrical.distributionBoards[board]!.meterId = meter;
  const fi = addProtectionDevice(project, board, "RCD");
  const ls = addProtectionDevice(project, board);
  project.electrical.protectionDevices[fi]!.ratedCurrent = 40;
  project.electrical.protectionDevices[ls]!.upstreamProtectionDeviceId = fi;
  const circuit = crypto.randomUUID();
  project.electrical.circuits[circuit] = {
    id: circuit,
    name: "Wohnen",
    label: "SK-01",
    distributionBoardId: board,
    protectionDeviceId: ls,
    phase: "L1",
    nominalVoltage: null,
    metadata: {},
  };
  project.electrical.outlets[outlet]!.circuitId = circuit;
  project.electrical.devices[device]!.connectionPointId = outlet;
  return { project, floor, source, meter, board, outlet, device, fi, ls, circuit };
}

describe("Einspeisung, Zähler und Schutzzuordnung", () => {
  it("zeigt 230/400 V als Projektvorgabe vor der Zuordnung, ohne Typenschildwerte zu erfinden", () => {
    const project = createProject();
    const id = addElectrical(project, project.floorOrder[0]!, { x: 0, y: 0 }, "outlets");
    expect(objectSupply(project, "outlets", id)).toMatchObject({
      voltage: 230,
      overcurrentRating: null,
      supply: undefined,
    });
    expect(project.electrical.outlets[id]!.ratedVoltage).toBeNull();
    project.electrical.outlets[id]!.phases = 3;
    expect(objectSupply(project, "outlets", id).voltage).toBe(400);
    project.electrical.settings.phasePhaseVoltage = 415;
    expect(objectSupply(project, "outlets", id).voltage).toBe(415);
  });
  it("leitet Spannung und Absicherung über Einspeisung, Zähler, Kasten und FI/LS bis zum Verbraucher ab", () => {
    const { project, outlet, device, meter, ls, fi } = fixture();
    const before = JSON.stringify(project);
    expect(objectSupply(project, "outlets", outlet)).toMatchObject({
      voltage: 230,
      capacity: 63,
      overcurrentRating: 16,
      planningCurrentLimit: 16,
      meter: { id: meter },
    });
    expect(objectSupply(project, "devices", device).overcurrentRating).toBe(16);
    expect(protectionChain(project, ls).map((item) => item.id)).toEqual([fi, ls]);
    expect(JSON.stringify(project)).toBe(before);
    expect(importProjectText(exportProjectText(project))).toEqual(project);
  });
  it("reagiert auf globale Vorgaben und Einspeiseänderungen ohne Bauteilwerte zu überschreiben", () => {
    const { project, outlet, source } = fixture();
    project.electrical.outlets[outlet]!.ratedVoltage = 230;
    project.electrical.settings.phaseNeutralVoltage = 240;
    expect(objectSupply(project, "outlets", outlet).voltage).toBe(240);
    project.electrical.supplies[source]!.phaseNeutralVoltage = 220;
    expect(objectSupply(project, "outlets", outlet).voltage).toBe(220);
    expect(project.electrical.outlets[outlet]!.ratedVoltage).toBe(230);
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain("nennspannung");
  });
  it("übernimmt Sicherungsänderungen und zeigt gemeinsame Einspeisekapazität getrennt", () => {
    const { project, outlet, source, ls } = fixture();
    project.electrical.protectionDevices[ls]!.ratedCurrent = 10;
    project.electrical.supplies[source]!.ratedCurrent = 6;
    expect(objectSupply(project, "outlets", outlet)).toMatchObject({
      overcurrentRating: 10,
      capacity: 6,
      planningCurrentLimit: 6,
    });
    expect(project.electrical.outlets[outlet]!.ratedCurrent).toBeNull();
  });
  it("interpretiert FI-Bemessungsstrom nicht als Überstromschutz", () => {
    const { project, circuit, fi } = fixture();
    project.electrical.circuits[circuit]!.protectionDeviceId = fi;
    const result = circuitSupply(project, circuit);
    expect(result.overcurrentRating).toBeNull();
    expect(result.warnings.join(" ")).toContain("Kein Überstromschutz");
  });
  it("berücksichtigt vorgeschaltete Sicherungen, aber nicht den FI als Strombegrenzer", () => {
    const { project, board, ls, circuit, fi } = fixture();
    project.electrical.protectionDevices[fi]!.ratedCurrent = 6;
    expect(circuitSupply(project, circuit).overcurrentRating).toBe(16);
    expect(circuitSupply(project, circuit).warnings.join(" ")).toContain("FI-Bemessungsstrom");
    const upstream = addProtectionDevice(project, board, "fuse");
    project.electrical.protectionDevices[upstream]!.ratedCurrent = 10;
    project.electrical.protectionDevices[ls]!.upstreamProtectionDeviceId = upstream;
    expect(circuitSupply(project, circuit).overcurrentRating).toBe(10);
  });
  it("macht unbekannte Sicherungswerte und gemeinsam genutzte Sicherungen sichtbar", () => {
    const { project, circuit, ls } = fixture();
    const second = { ...project.electrical.circuits[circuit]!, id: crypto.randomUUID() };
    project.electrical.circuits[second.id] = second;
    expect(circuitSupply(project, circuit).warnings.join(" ")).toContain("gemeinsam");
    project.electrical.protectionDevices[ls]!.ratedCurrent = null;
    expect(circuitSupply(project, circuit).warnings.join(" ")).toContain("Bemessungsstrom");
    expect(circuitSupply(project, circuit).overcurrentRating).toBeNull();
  });
  it("erkennt Phasen- und Spannungswidersprüche und ersetzt die Quelle nicht durch Stromkreiswerte", () => {
    const { project, circuit, source, outlet } = fixture();
    project.electrical.circuits[circuit]!.nominalVoltage = 120;
    expect(objectSupply(project, "outlets", outlet).voltage).toBe(230);
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain("Stromkreisspannung");
    project.electrical.outlets[outlet]!.phases = 3;
    project.electrical.supplies[source]!.phases = 1;
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain("einphasiger Einspeisung");
  });
  it("verwechselt L–N und L–L bei einem dreiphasigen Stromkreis ohne Quelle nicht", () => {
    const { project, board, circuit, outlet } = fixture();
    project.electrical.distributionBoards[board]!.meterId = null;
    project.electrical.circuits[circuit]!.phase = "L1/L2/L3";
    project.electrical.circuits[circuit]!.nominalVoltage = 400;
    expect(objectSupply(project, "outlets", outlet).voltage).toBe(230);
  });
  it("verwirft fehlende Quellen, mehrdeutige Einspeisung, negative Zählerstände und Schutzzyklen", () => {
    const { project, board, meter, source, fi, ls } = fixture();
    for (const mutate of [
      (p: typeof project) => {
        p.electrical.meters[meter]!.supplyId = crypto.randomUUID();
      },
      (p: typeof project) => {
        p.electrical.distributionBoards[board]!.supplyId = source;
      },
      (p: typeof project) => {
        p.electrical.meters[meter]!.readingKWh = -1;
      },
      (p: typeof project) => {
        p.electrical.protectionDevices[fi]!.upstreamProtectionDeviceId = ls;
      },
      (p: typeof project) => {
        p.electrical.settings.phaseNeutralVoltage = 0;
      },
    ])
      expect(() => transact(project, mutate)).toThrow();
  });
  it("verwirft Schutzketten über Kastengrenzen", () => {
    const { project, floor, ls } = fixture();
    const board = addElectrical(project, floor, { x: 6000, y: 0 }, "distributionBoards");
    const other = addProtectionDevice(project, board);
    project.electrical.protectionDevices[ls]!.upstreamProtectionDeviceId = other;
    expect(() => parseProject(project)).toThrow(/anderen Sicherungskasten/);
  });
  it("löscht einen Zähler samt Kabeln, löst Kastenbezug und stellt alles per Undo wieder her", () => {
    const { project, source, meter, board, outlet } = fixture();
    const cable = addCable(project, source, meter, []);
    useProjectStore.getState().replace(project);
    const loadedElectrical = structuredClone(useProjectStore.getState().project.electrical);
    expect(
      useProjectStore
        .getState()
        .commit("Zähler löschen", (draft) => deleteSelection(draft, [{ kind: "meters", id: meter }])),
    ).toBe(true);
    expect(useProjectStore.getState().project.electrical.cables[cable]).toBeUndefined();
    expect(objectSupply(useProjectStore.getState().project, "outlets", outlet).supply).toBeUndefined();
    expect(useProjectStore.getState().project.electrical.distributionBoards[board]!.meterId).toBeNull();
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.electrical).toEqual(loadedElectrical);
  });
  it("kopiert Quellen, Zähler und Kasten referenztreu mit neuen IDs", () => {
    const { project, source, meter, board } = fixture();
    const next = transact(project, (draft) => {
      duplicateSelection(draft, [
        { kind: "distributionBoards", id: board },
        { kind: "meters", id: meter },
        { kind: "supplies", id: source },
      ]);
    });
    const copy = Object.values(next.electrical.distributionBoards).find((item) => item.id !== board)!;
    const meterCopy = next.electrical.meters[copy.meterId!]!;
    expect(meterCopy.id).not.toBe(meter);
    expect(meterCopy.supplyId).not.toBe(source);
    expect(meterCopy.readingKWh).toBe(123.45);
    expect(Object.keys(next.electrical.protectionDevices)).toHaveLength(2);
  });
  it("beachtet Sperren und die Trennung zum Möbel-Tab auch bei neuen Objekten", () => {
    const { project, meter, floor } = fixture();
    expect(hitTest(project, floor, { x: 1000, y: 0 }, 0.1, false, "furniture")).toBeNull();
    expect(hitTest(project, floor, { x: 1000, y: 0 }, 0.1, false, "electrical")).toEqual({
      kind: "meters",
      id: meter,
    });
    project.layers[project.electrical.meters[meter]!.layerId]!.locked = true;
    expect(() =>
      transact(project, (draft) => moveSelection(draft, [{ kind: "meters", id: meter }], { x: 100, y: 0 })),
    ).toThrow(/gesperrt/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.settings.phaseNeutralVoltage = 240;
      }),
    ).toThrow(/gesperrt/);
  });
});
