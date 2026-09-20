import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import {
  consumerLibrary,
  setConsumerLibrary,
  consumerShape,
  consumerEntrySchema,
  importConsumerLibrary,
} from "../../src/electrical/consumerLibrary";
import { placeConsumer } from "../../src/electrical/placeConsumer";
import { newId } from "../../src/utils/uuid";
import { asset } from "../../src/housebook/model";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { deleteSelection, moveSelection } from "../../src/editor/actions/edit";
import { planPrimitives, materialRows } from "../../src/housebook/export";
import { conductorFixture } from "../simulation/conductorFixture";
import { emptyScenario } from "../../src/simulation/models";
import { simulate } from "../../src/simulation/solve";
import { addCable, cableFloorPath } from "../../src/electrical/cables";

export const consumerEntry = () =>
  consumerEntrySchema.parse({
    id: newId(),
    name: "Kühlschrank",
    manufacturer: "Beispiel",
    model: "K600",
    serial: "TEST-123",
    width: 600,
    depth: 1000,
    height: 1850,
    rotation: Math.PI / 2,
    annualEnergyKWh: 150,
    ratedPower: 100,
    ratedVoltage: 230,
    phases: 1,
  });
describe("Verbraucherbibliothek", () => {
  it("platziert eigenständige Elektrogeräte mit vollständigen Daten, ohne zusätzliche Möbel", () => {
    const p = createProject(),
      entry = consumerEntry();
    setConsumerLibrary(p, [entry]);
    const id = placeConsumer(p, p.floorOrder[0]!, { x: 3000, y: -1000 }, entry.id);
    const device = p.electrical.devices[id]!;
    expect(asset(device).serial).toBe("TEST-123");
    expect(device).toMatchObject({
      name: "Kühlschrank",
      ratedPower: 100,
      ratedVoltage: 230,
      connectionPointId: null,
      operatingMode: "off",
    });
    expect(consumerShape(device)).toMatchObject({ width: 600, depth: 1000, annualEnergyKWh: 150 });
    expect(Object.keys(p.furniture)).toHaveLength(0);
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    setConsumerLibrary(p, []);
    expect(consumerShape(device)?.width).toBe(600);
  });
  it("berücksichtigt die gedrehte Fläche beim Auswählen und beim Export", () => {
    const p = createProject(),
      entry = consumerEntry(),
      floor = p.floorOrder[0]!;
    setConsumerLibrary(p, [entry]);
    const id = placeConsumer(p, floor, { x: 3000, y: -1000 }, entry.id);
    expect(hitTest(p, floor, { x: 3400, y: -1000 }, 0.1, false, "electrical")).toEqual({
      kind: "devices",
      id,
    });
    expect(hitTest(p, floor, { x: 3000, y: -1400 }, 0.1, false, "electrical")).toBeNull();
    expect(
      planPrimitives(p, floor).some(
        (primitive) =>
          primitive.kind === "line" && primitive.points.some((point) => Math.abs(point.x - 3500) < 0.001),
      ),
    ).toBe(true);
    expect(materialRows(p).flat().join(" ")).toContain("150 kWh/Jahr; SN: TEST-123");
  });
  it("rechnet mit Watt statt mit Jahresenergie und Leitungsenden folgen dem Gerät", () => {
    const { project, circuit, board, floor } = conductorFixture(),
      entry = consumerEntry();
    setConsumerLibrary(project, [entry]);
    const id = placeConsumer(project, floor, { x: 4000, y: 0 }, entry.id);
    const device = project.electrical.devices[id]!;
    device.circuitId = circuit;
    device.operatingMode = "on";
    expect(simulate(project, emptyScenario()).devices[id]!.power).toBe(100);
    const cable = addCable(project, board, id, []);
    const moved = transact(project, (p) => moveSelection(p, [{ kind: "devices", id }], { x: 1000, y: 500 }));
    expect(cableFloorPath(moved, moved.electrical.cables[cable]!, floor).at(-1)).toEqual({ x: 5000, y: 500 });
    const deleted = transact(moved, (p) => deleteSelection(p, [{ kind: "devices", id }]));
    expect(deleted.electrical.cables[cable]).toBeUndefined();
    expect(consumerLibrary(deleted)).toHaveLength(1);
  });
  it("respektiert Ebenensperren und verwirft ungültige Maße atomar", () => {
    const p = createProject(),
      entry = consumerEntry(),
      floor = p.floorOrder[0]!;
    setConsumerLibrary(p, [entry]);
    const id = placeConsumer(p, floor, { x: 0, y: 0 }, entry.id);
    expect(() =>
      transact(p, (draft) => {
        draft.electrical.devices[id]!.metadata.consumerShape = {
          ...consumerShape(draft.electrical.devices[id]!)!,
          width: -1,
        };
      }),
    ).toThrow();
    p.layers[p.electrical.devices[id]!.layerId]!.locked = true;
    expect(() => transact(p, (draft) => placeConsumer(draft, floor, { x: 0, y: 0 }, entry.id))).toThrow();
    expect(() =>
      transact(p, (draft) => {
        draft.electrical.devices[id]!.metadata.consumerShape = {
          ...consumerShape(draft.electrical.devices[id]!)!,
          width: 800,
        };
      }),
    ).toThrow();
    expect(consumerShape(p.electrical.devices[id]!)!.width).toBe(600);
  });
  it("importiert Bibliotheken mit neuen IDs und lehnt beschädigte/mehrdeutige Einträge ab", () => {
    const p = createProject(),
      entry = consumerEntry();
    setConsumerLibrary(p, [entry]);
    importConsumerLibrary(p, JSON.stringify([entry]), newId);
    expect(consumerLibrary(p)).toHaveLength(2);
    expect(consumerLibrary(p)[1]!.id).not.toBe(entry.id);
    expect(() => setConsumerLibrary(p, [entry, entry])).toThrow();
    p.metadata.consumerLibrary = [{ ...entry, ratedVoltage: -230 }];
    expect(() => parseProject(p)).toThrow();
    expect(consumerLibrary(createProject())).toEqual([]);
  });
});
