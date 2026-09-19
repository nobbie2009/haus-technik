import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";
import { circuitMembers } from "../../src/electrical/selectors";
import { focusElectrical } from "../../src/editor/interaction/focusElectrical";
import { worldToScreen } from "../../src/geometry/coordinates";
import { useProjectStore } from "../../src/stores/projectStore";
import { useEditorStore } from "../../src/stores/editorStore";

function fixture() {
  const project = createProject();
  const floor = project.floorOrder[0]!;
  const board = addElectrical(project, floor, { x: 0, y: 0 }, "distributionBoards");
  const outlet = addElectrical(project, floor, { x: 3000, y: 4000 }, "outlets");
  const cable = addCable(project, board, outlet, [{ x: 3000, y: 0 }]);
  const circuit = crypto.randomUUID();
  project.electrical.circuits[circuit] = {
    id: circuit,
    name: "Wohnen",
    label: "SK-01",
    distributionBoardId: board,
    protectionDeviceId: null,
    phase: "unknown",
    nominalVoltage: null,
    metadata: {},
  };
  project.electrical.outlets[outlet]!.circuitId = circuit;
  const device = addElectrical(project, floor, { x: 6000, y: 4000 }, "devices");
  project.electrical.devices[device]!.connectionPointId = outlet;
  return { project, floor, board, outlet, cable, circuit, device };
}

describe("Stromkreisbestand und Navigation", () => {
  it("zählt nur ausdrücklich zugeordnete Leitungen, nicht lediglich verbundene", () => {
    const { project, circuit, cable } = fixture();
    expect(circuitMembers(project, circuit)).toMatchObject({ cables: [], planLength: 0, totalLength: 0 });
    project.electrical.cables[cable]!.circuitId = circuit;
    project.electrical.cables[cable]!.lengthAllowance = 1250;
    expect(circuitMembers(project, circuit)).toMatchObject({ planLength: 7000, totalLength: 8250 });
    expect(circuitMembers(project, circuit).cables).toHaveLength(1);
  });
  it("zählt Festanschlüsse und Steckdosenverbraucher einmal, inklusive ausgeschalteter Geräte", () => {
    const { project, floor, circuit, device, outlet } = fixture();
    project.electrical.devices[device]!.ratedPower = 600;
    const fixed = addElectrical(project, floor, { x: 1000, y: 0 }, "devices");
    project.electrical.devices[fixed]!.circuitId = circuit;
    addElectrical(project, floor, { x: 2000, y: 0 }, "devices");
    const members = circuitMembers(project, circuit);
    expect(members.devices).toHaveLength(2);
    expect(members.knownPower).toBe(600);
    expect(members.missingPower).toBe(1);
    project.electrical.outlets[outlet]!.circuitId = null;
    expect(circuitMembers(project, circuit).devices.map((item) => item.id)).toEqual([fixed]);
  });
  it("fasst den Bestand aller Etagen zusammen, unabhängig von der Ebenensichtbarkeit", () => {
    const { project, floor, circuit } = fixture();
    const upper = { ...project.floors[floor]!, id: crypto.randomUUID(), name: "OG", elevation: 3000 };
    project.floors[upper.id] = upper;
    project.floorOrder.push(upper.id);
    const socket = addElectrical(project, upper.id, { x: 0, y: 0 }, "outlets");
    project.electrical.outlets[socket]!.circuitId = circuit;
    project.layers[project.electrical.outlets[socket]!.layerId]!.visible = false;
    expect(circuitMembers(project, circuit).outlets).toHaveLength(2);
  });
  it("zentriert die Auswahl und wechselt Etage/Bereich, ohne Projekt oder Historie zu verändern", () => {
    const { project, outlet, floor } = fixture();
    project.layers[project.electrical.outlets[outlet]!.layerId]!.locked = true;
    useProjectStore.getState().replace(project);
    const before = useProjectStore.getState();
    useEditorStore.getState().setCategory("furniture");
    useEditorStore.setState({
      floorId: "old",
      size: { width: 800, height: 600 },
      viewport: { scale: 0.1, originPx: { x: 0, y: 0 } },
      draft: { points: [{ x: 1, y: 1 }], cursor: null, input: "" },
    });
    expect(focusElectrical({ kind: "outlets", id: outlet })).toBe(true);
    const editor = useEditorStore.getState();
    expect(editor).toMatchObject({
      category: "electrical",
      floorId: floor,
      tool: "select",
      selection: [{ kind: "outlets", id: outlet }],
      draft: { points: [] },
    });
    expect(worldToScreen(project.electrical.outlets[outlet]!.position, editor.viewport)).toEqual({
      x: 400,
      y: 300,
    });
    expect(useProjectStore.getState()).toBe(before);
  });
  it("zeigt den vollständigen Leitungsweg einschließlich weit entfernter Zwischenpunkte", () => {
    const { project, cable } = fixture();
    project.electrical.cables[cable]!.path = [{ x: -20000, y: 10000 }];
    useProjectStore.getState().replace(project);
    useEditorStore.setState({
      size: { width: 800, height: 600 },
      viewport: { scale: 1, originPx: { x: 0, y: 0 } },
    });
    focusElectrical({ kind: "cables", id: cable });
    const viewport = useEditorStore.getState().viewport;
    for (const p of [
      { x: 0, y: 0 },
      { x: -20000, y: 10000 },
      { x: 3000, y: 4000 },
    ]) {
      const screen = worldToScreen(p, viewport);
      expect(screen.x).toBeGreaterThanOrEqual(79);
      expect(screen.x).toBeLessThanOrEqual(721);
      expect(screen.y).toBeGreaterThanOrEqual(89);
      expect(screen.y).toBeLessThanOrEqual(511);
    }
  });
  it("lässt ausgeblendete oder gelöschte Ziele und den Editorzustand unverändert", () => {
    const { project, outlet } = fixture();
    project.layers[project.electrical.outlets[outlet]!.layerId]!.visible = false;
    useProjectStore.getState().replace(project);
    const before = useEditorStore.getState();
    expect(focusElectrical({ kind: "outlets", id: outlet })).toBe(false);
    expect(focusElectrical({ kind: "outlets", id: crypto.randomUUID() })).toBe(false);
    expect(useEditorStore.getState()).toBe(before);
  });
});
