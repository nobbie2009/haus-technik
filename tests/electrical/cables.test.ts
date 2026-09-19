import { describe, expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addCable, cableLengths, cablePath, buildCableGraph } from "../../src/electrical/cables";
import { transact } from "../../src/editor/history/transaction";
import { moveSelection, deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import { parseProject } from "../../src/core/validation";
import { importProjectText, exportProjectText } from "../../src/persistence/projectFile";
import { useProjectStore } from "../../src/stores/projectStore";

function fixture() {
  const project = createProject();
  const floor = project.floorOrder[0]!;
  const a = addElectrical(project, floor, { x: 0, y: 0 }, "distributionBoards");
  const b = addElectrical(project, floor, { x: 3000, y: 4000 }, "outlets");
  const cable = addCable(project, a, b, [{ x: 3000, y: 0 }]);
  return { project, floor, a, b, cable };
}
describe("Leitungswege und Bauteilgraph", () => {
  it("berechnet Planlänge und Zuschlag ohne redundante Endpunktkoordinaten", () => {
    const { project, cable } = fixture();
    project.electrical.cables[cable]!.lengthAllowance = 1500;
    expect(cableLengths(project, project.electrical.cables[cable]!)).toEqual({
      planLength: 7000,
      verticalLength: 0,
      totalLength: 8500,
    });
    expect(project.electrical.cables[cable]!.path).toEqual([{ x: 3000, y: 0 }]);
    expect(importProjectText(exportProjectText(project))).toEqual(project);
    cablePath(project, project.electrical.cables[cable]!)[0]!.x = 99;
    expect(cableLengths(project, project.electrical.cables[cable]!).planLength).toBe(7000);
  });
  it("führt Endpunkte bei Bewegung mit und hält Wegpunkte fest", () => {
    const { project, b, cable } = fixture();
    const next = transact(project, (draft) =>
      moveSelection(draft, [{ kind: "outlets", id: b }], { x: 0, y: 1000 }),
    );
    expect(cableLengths(next, next.electrical.cables[cable]!).planLength).toBe(8000);
    expect(next.electrical.cables[cable]!.path).toEqual(project.electrical.cables[cable]!.path);
  });
  it("verschiebt Kabelwegpunkte ohne die Endobjekte zu verschieben", () => {
    const { project, cable, a, b } = fixture();
    const next = transact(project, (draft) =>
      moveSelection(draft, [{ kind: "cables", id: cable }], { x: 100, y: 100 }),
    );
    expect(next.electrical.cables[cable]!.path).toEqual([{ x: 3100, y: 100 }]);
    expect(next.electrical.outlets[b]).toEqual(project.electrical.outlets[b]);
    expect(next.electrical.distributionBoards[a]).toEqual(project.electrical.distributionBoards[a]);
  });
  it("löscht abhängige Leitungen mit einem Knoten und stellt alles atomar wieder her", () => {
    const { project, b, cable } = fixture();
    useProjectStore.getState().replace(project);
    useProjectStore
      .getState()
      .commit("Löschen", (draft) => deleteSelection(draft, [{ kind: "outlets", id: b }]));
    expect(useProjectStore.getState().project.electrical.cables[cable]).toBeUndefined();
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.electrical).toEqual(project.electrical);
  });
  it("dupliziert Leitungen und Endobjekte mit intern neu zugeordneten IDs", () => {
    const { project, a, b, cable } = fixture();
    const next = transact(project, (draft) => {
      duplicateSelection(draft, [
        { kind: "cables", id: cable },
        { kind: "outlets", id: b },
        { kind: "distributionBoards", id: a },
      ]);
    });
    const copy = Object.values(next.electrical.cables).find((item) => item.id !== cable)!;
    expect(copy.startNodeId).not.toBe(a);
    expect(copy.endNodeId).not.toBe(b);
    expect(cableLengths(next, copy).planLength).toBe(7000);
  });
  it("erzeugt an Linienkreuzungen keine versteckten Knoten", () => {
    const project = createProject();
    const floor = project.floorOrder[0]!;
    const nodes = [
      { x: -1000, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: -1000 },
      { x: 0, y: 1000 },
    ].map((p) => addElectrical(project, floor, p, "junctions"));
    addCable(project, nodes[0]!, nodes[1]!, []);
    addCable(project, nodes[2]!, nodes[3]!, []);
    const graph = buildCableGraph(project);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(2);
    expect(new Set(graph.edges.flatMap((edge) => [edge.startNodeId, edge.endNodeId])).size).toBe(4);
    graph.nodes[0]!.position.x = 100;
    expect(project.electrical.junctions[nodes[0]!]!.position.x).toBe(-1000);
  });
  it("sperrt indirekte Leitungsänderungen durch Endpunktverschiebung", () => {
    const { project, b, cable } = fixture();
    const layer = structuredClone(project.layers[project.electrical.cables[cable]!.layerId]!);
    layer.id = crypto.randomUUID();
    layer.locked = true;
    project.layers[layer.id] = layer;
    project.layerOrder.push(layer.id);
    project.electrical.cables[cable]!.layerId = layer.id;
    expect(() =>
      transact(project, (draft) => moveSelection(draft, [{ kind: "outlets", id: b }], { x: 100, y: 0 })),
    ).toThrow(/gesperrt/);
  });
  it("verwirft fehlende Endpunkte und Wege über Geschossgrenzen", () => {
    const { project, cable, b } = fixture();
    const invalid = structuredClone(project);
    invalid.electrical.cables[cable]!.startNodeId = crypto.randomUUID();
    expect(() => parseProject(invalid)).toThrow();
    const floor = { ...project.floors[project.floorOrder[0]!]!, id: crypto.randomUUID() };
    project.floors[floor.id] = floor;
    project.floorOrder.push(floor.id);
    project.electrical.outlets[b]!.floorId = floor.id;
    expect(() => parseProject(project)).toThrow();
  });
  it("verwirft Nullsegmente, Schleifen und unzulässige Kabeldaten", () => {
    const { project, cable, a } = fixture();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.path = [{ x: 0, y: 0 }];
      }),
    ).toThrow();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.endNodeId = a;
      }),
    ).toThrow();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.conductorCrossSection = -1;
      }),
    ).toThrow();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.conductorCount = 2.5;
      }),
    ).toThrow();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.cables[cable]!.lengthAllowance = -1;
      }),
    ).toThrow();
  });
});
