import { describe, expect, it } from "vitest";
import { rectangleFixture } from "../fixtures";
import { addFurniture } from "../../src/furniture/actions";
import { addElectrical } from "../../src/electrical/actions";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { useEditorStore } from "../../src/stores/editorStore";

describe("Getrennte Bearbeitungsbereiche", () => {
  it("startet jeden Tab in Auswahl und beendet laufende Platzierungen", () => {
    for (const category of ["building", "furniture", "electrical", "network", "site", "utilities"] as const) {
      useEditorStore.setState({
        tool: "electrical",
        cableStartId: "pending",
        draft: { points: [{ x: 10, y: 20 }], cursor: null, input: "" },
      });
      useEditorStore.getState().setCategory(category);
      expect(useEditorStore.getState()).toMatchObject({
        category,
        tool: "select",
        cableStartId: null,
        draft: { points: [] },
      });
    }
  });
  it("selektiert an derselben Position ausschließlich Objekte des aktiven Bereichs", () => {
    const { project, room } = rectangleFixture();
    const position = { x: 2000, y: 1600 };
    const furniture = addFurniture(project, room.floorId, position, "sofa");
    const outlet = addElectrical(project, room.floorId, position, "outlets");
    expect(hitTest(project, room.floorId, position, 0.1, false, "building")).toEqual({
      kind: "rooms",
      id: room.id,
    });
    expect(hitTest(project, room.floorId, position, 0.1, false, "furniture")).toEqual({
      kind: "furniture",
      id: furniture,
    });
    expect(hitTest(project, room.floorId, position, 0.1, false, "electrical")).toEqual({
      kind: "outlets",
      id: outlet,
    });
    expect(hitTest(project, room.floorId, { x: 400, y: 0 }, 0.1, false, "electrical")).toBeNull();
    expect(hitTest(project, room.floorId, { x: 400, y: 0 }, 0.1, false, "furniture")).toBeNull();
  });
  it("verwirft Auswahl und Entwurf beim Bereichswechsel, auch per Werkzeugkürzel", () => {
    const editor = useEditorStore.getState();
    editor.setCategory("building");
    useEditorStore.setState({
      selection: [{ kind: "walls", id: crypto.randomUUID() }],
      draft: { points: [{ x: 0, y: 0 }], cursor: null, input: "" },
    });
    editor.setCategory("furniture");
    expect(useEditorStore.getState()).toMatchObject({
      category: "furniture",
      selection: [],
      tool: "select",
      draft: { points: [] },
    });
    useEditorStore.setState({ selection: [{ kind: "furniture", id: crypto.randomUUID() }] });
    editor.setTool("cable");
    expect(useEditorStore.getState()).toMatchObject({ category: "electrical", selection: [], tool: "cable" });
    editor.setTool("select");
    expect(useEditorStore.getState().category).toBe("electrical");
  });
});
