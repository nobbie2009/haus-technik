import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import {
  addUtilityNode,
  addUtilityPipe,
  utilities,
  pipeLength,
  pipeFloorPath,
  pipeOnFloor,
} from "../../src/utilities/model";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection, moveSelection } from "../../src/editor/actions/edit";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { materialRows, planPrimitives } from "../../src/housebook/export";
import { newId } from "../../src/utils/uuid";
import { useProjectStore } from "../../src/stores/projectStore";
import { createRoom } from "../../src/editor/actions/create";
import { saveRoomTemplate, insertRoomTemplate } from "../../src/housebook/templates";
import { housebook } from "../../src/housebook/model";

function fixture() {
  const p = createProject(),
    floor = p.floorOrder[0]!;
  const a = addUtilityNode(p, floor, { x: 0, y: 0 }, "source", "cold");
  const b = addUtilityNode(p, floor, { x: 3000, y: 4000 }, "tap", "cold");
  const pipe = addUtilityPipe(p, a, b, "cold", [{ x: 3000, y: 0 }]);
  return { p, floor, a, b, pipe };
}
describe("Wasser, Heizung und Gas", () => {
  it("übernimmt interne Rohrnetze mit neuen IDs in Raumvorlagen", () => {
    const { p, floor } = fixture();
    const room = createRoom(
      p,
      floor,
      [
        { x: -500, y: -500 },
        { x: 4000, y: -500 },
        { x: 4000, y: 5000 },
        { x: -500, y: 5000 },
      ],
      "Küche",
    );
    const saved = transact(p, (d) => saveRoomTemplate(d, room, "Küche mit Wasser"));
    const copied = transact(saved, (d) => {
      insertRoomTemplate(d, housebook(d).templates[0]!.id, floor, 15000, 0);
    });
    expect(Object.values(utilities(copied).nodes)).toHaveLength(4);
    expect(Object.values(utilities(copied).pipes)).toHaveLength(2);
    expect(parseProject(copied)).toEqual(copied);
  });
  it("speichert getrennte Medien und mehrere Anschlüsse am selben Wärmeerzeuger", () => {
    const { p, floor, b } = fixture();
    const boiler = addUtilityNode(p, floor, { x: 6000, y: 0 }, "gasBoiler", "cold");
    const radiator = addUtilityNode(p, floor, { x: 7000, y: 0 }, "radiator", "cold");
    const gas = addUtilityNode(p, floor, { x: 9000, y: 0 }, "source", "gas");
    addUtilityPipe(p, boiler, radiator, "flow");
    addUtilityPipe(p, boiler, radiator, "return");
    addUtilityPipe(p, gas, boiler, "gas");
    expect(utilities(p).nodes[boiler]!.media).toEqual(["flow", "return", "cold", "hot", "gas"]);
    addUtilityPipe(p, boiler, b, "cold");
    addUtilityPipe(p, boiler, b, "hot");
    expect(new Set(Object.values(p.layers).map((l) => l.kind))).toEqual(
      new Set(["floorPlan", "dimensions", "furniture", "electrical", "water", "heating", "gas"]),
    );
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it("akzeptiert Kalt- und Warmwasser an einer älteren Gasheizung mit VL/RL/GAS", () => {
    const { p, floor, b } = fixture();
    const boiler = addUtilityNode(p, floor, { x: 6000, y: 0 }, "gasBoiler", "flow");
    utilities(p).nodes[boiler]!.media = ["flow", "return", "gas"];
    expect(() => addUtilityPipe(p, b, boiler, "cold")).not.toThrow();
    expect(() => addUtilityPipe(p, b, boiler, "hot")).not.toThrow();
    expect(parseProject(p)).toEqual(p);
  });
  it("verhindert Selbstverbindungen, doppelte Leitungen und unpassende Medien atomar", () => {
    const { p, floor, a, b } = fixture(),
      gas = addUtilityNode(p, floor, { x: 9000, y: 0 }, "source", "gas");
    const before = JSON.stringify(p);
    expect(() =>
      transact(p, (d) => {
        addUtilityPipe(d, a, a, "cold");
      }),
    ).toThrow();
    expect(() =>
      transact(p, (d) => {
        addUtilityPipe(d, b, a, "cold");
      }),
    ).toThrow(/bereits/);
    expect(() =>
      transact(p, (d) => {
        addUtilityPipe(d, gas, b, "gas");
      }),
    ).toThrow(/Medium/);
    expect(JSON.stringify(p)).toBe(before);
  });
  it("berechnet Wegpunkte, Anschlusshöhe und Zuschlag; Endpunkte folgen dem Gerät", () => {
    const { p, a, b, pipe } = fixture(),
      net = utilities(p);
    net.nodes[b]!.elevation = 1000;
    net.pipes[pipe]!.allowance = 500;
    expect(pipeLength(p, net.pipes[pipe]!)).toBe(8500);
    const moved = transact(p, (d) => moveSelection(d, [{ kind: "utilityNodes", id: a }], { x: 1000, y: 0 }));
    expect(pipeLength(moved, utilities(moved).pipes[pipe]!)).toBe(7500);
    expect(net.nodes[a]!.position.x).toBe(0);
  });
  it("zeigt Steigleitungen auf beiden Etagen und zählt die vertikale Strecke einmal", () => {
    const { p, floor, a } = fixture(),
      other = newId();
    p.floors[other] = { ...p.floors[floor]!, id: other, name: "OG", elevation: 2800 };
    p.floorOrder.push(other);
    const b = addUtilityNode(p, other, { x: 3000, y: 4000 }, "tap", "cold");
    const id = addUtilityPipe(p, a, b, "cold"),
      pipe = utilities(p).pipes[id]!;
    expect(pipeLength(p, pipe)).toBe(7800);
    expect(pipeOnFloor(p, pipe, other)).toBe(true);
    expect(pipeFloorPath(p, pipe, floor)).toHaveLength(2);
    expect(pipeFloorPath(p, pipe, other)).toHaveLength(2);
    expect(parseProject(p)).toEqual(p);
    p.floors[other]!.elevation = 3000;
    expect(pipeLength(p, pipe)).toBe(8000);
  });
  it("löscht abhängige Leitungen und erhält Undo/Redo", () => {
    const { p, a, pipe } = fixture();
    useProjectStore.getState().replace(p);
    expect(
      useProjectStore
        .getState()
        .commit("Löschen", (d) => deleteSelection(d, [{ kind: "utilityNodes", id: a }])),
    ).toBe(true);
    expect(utilities(useProjectStore.getState().project).pipes[pipe]).toBeUndefined();
    useProjectStore.getState().undo();
    expect(utilities(useProjectStore.getState().project).pipes[pipe]).toBeDefined();
    useProjectStore.getState().redo();
    expect(utilities(useProjectStore.getState().project).nodes[a]).toBeUndefined();
  });
  it("dupliziert komplette Netze mit neuen Referenzen und lehnt einzelne Rohrkopien ab", () => {
    const { p, a, b, pipe } = fixture();
    const copy = transact(p, (d) => {
      duplicateSelection(d, [
        { kind: "utilityNodes", id: a },
        { kind: "utilityNodes", id: b },
        { kind: "utilityPipes", id: pipe },
      ]);
    });
    const pipes = Object.values(utilities(copy).pipes),
      added = pipes.find((v) => v.id !== pipe)!;
    expect(pipes).toHaveLength(2);
    expect(added.from).not.toBe(a);
    expect(added.to).not.toBe(b);
    expect(pipeLength(copy, added)).toBe(pipeLength(p, utilities(p).pipes[pipe]!));
    expect(() =>
      transact(p, (d) => {
        duplicateSelection(d, [{ kind: "utilityPipes", id: pipe }]);
      }),
    ).toThrow(/beide Anschlussobjekte/);
  });
  it("respektiert Ebenensperren auch bei indirekten Änderungen verbundener Leitungen", () => {
    const { p, floor } = fixture();
    const boiler = addUtilityNode(p, floor, { x: 6000, y: 0 }, "gasBoiler", "flow");
    const gas = addUtilityNode(p, floor, { x: 9000, y: 0 }, "source", "gas");
    const pipe = addUtilityPipe(p, gas, boiler, "gas");
    p.layers[utilities(p).pipes[pipe]!.layerId]!.locked = true;
    expect(() =>
      transact(p, (d) => moveSelection(d, [{ kind: "utilityNodes", id: boiler }], { x: 500, y: 0 })),
    ).toThrow(/gesperrt/);
    expect(() => transact(p, (d) => deleteSelection(d, [{ kind: "utilityNodes", id: boiler }]))).toThrow(
      /gesperrt/,
    );
    expect(() =>
      transact(p, (d) => {
        addUtilityNode(d, floor, { x: 100, y: 100 }, "valve", "gas");
      }),
    ).toThrow(/gesperrt/);
  });
  it("validiert Metadaten, Maße und Referenzen beim Import und lässt alte Projekte unverändert", () => {
    expect(utilities(createProject())).toEqual({ version: 1, nodes: {}, pipes: {} });
    const { p, a, pipe } = fixture();
    for (const mutate of [
      (d: typeof p) => {
        utilities(d).nodes[a]!.width = -1;
      },
      (d: typeof p) => {
        utilities(d).pipes[pipe]!.to = newId();
      },
      (d: typeof p) => {
        utilities(d).pipes[pipe]!.medium = "gas";
      },
      (d: typeof p) => {
        d.metadata.utilities = { version: 1, nodes: null, pipes: {} };
      },
    ]) {
      const bad = structuredClone(p);
      mutate(bad);
      expect(() => parseProject(bad)).toThrow();
    }
  });
  it("berücksichtigt Grundfläche, Rohrverlauf, Sichtbarkeit und Planungsbereich bei der Auswahl", () => {
    const { p, floor, a, pipe } = fixture();
    expect(hitTest(p, floor, { x: 0, y: 0 }, 0.1, false, "utilities")).toEqual({
      kind: "utilityNodes",
      id: a,
    });
    expect(hitTest(p, floor, { x: 1500, y: 0 }, 0.1, false, "utilities")).toEqual({
      kind: "utilityPipes",
      id: pipe,
    });
    expect(hitTest(p, floor, { x: 0, y: 0 }, 0.1, false, "electrical")).toBeNull();
    p.layers[utilities(p).nodes[a]!.layerId]!.visible = false;
    expect(hitTest(p, floor, { x: 0, y: 0 }, 0.1, false, "utilities")).toBeNull();
  });
  it("exportiert Materialdaten und Rohrgeometrie nur im Gesamtplan", () => {
    const { p, floor, pipe } = fixture(),
      line = utilities(p).pipes[pipe]!;
    line.material = "Kupfer";
    line.nominalDiameter = 20;
    expect(materialRows(p).some((r) => r.includes("7.00") && r.some((s) => s.includes("DN 20")))).toBe(true);
    expect(planPrimitives(p, floor).some((r) => r.kind === "text" && r.text.includes("KW"))).toBe(true);
    expect(planPrimitives(p, floor, "electrical")).toHaveLength(0);
  });
});
