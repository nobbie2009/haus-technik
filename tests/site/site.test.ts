import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { addSiteElement, site, siteArea, siteLength, siteSnapPoints } from "../../src/site/model";
import { transact } from "../../src/editor/history/transaction";
import { moveSelection, duplicateSelection, deleteSelection } from "../../src/editor/actions/edit";
import { snap } from "../../src/geometry/snapping";
import { planPrimitives, planBounds, planSvg } from "../../src/housebook/export";
import { hitTest } from "../../src/editor/interaction/hitTest";
import { useEditorStore } from "../../src/stores/editorStore";
import { useProjectStore } from "../../src/stores/projectStore";
import { updateCursor } from "../../src/editor/interaction/drawing";
import { confirmSite } from "../../src/site/drawing";

const rectangle = [
  { x: 0, y: 0 },
  { x: 10000, y: 0 },
  { x: 10000, y: 6000 },
  { x: 0, y: 6000 },
];
describe("Grundstück, Wege und Referenzpunkte", () => {
  it("exportiert breite Wege einschließlich ihrer Ränder", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    addSiteElement(
      p,
      floor,
      "path",
      [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
      4000,
    );
    const primitives = planPrimitives(p, floor);
    const b = planBounds(primitives);
    expect(b.x).toBeLessThanOrEqual(-2000);
    expect(b.y).toBeGreaterThanOrEqual(2000);
    expect(b.y - b.height).toBeLessThanOrEqual(-2000);
    expect(b.x + b.width).toBeGreaterThanOrEqual(3000);
    expect(planSvg(p, floor, 50, "all")).toContain('stroke-linecap="round"');
  });
  it("erfasst eigenständige Flächen ohne Räume/Wände mit korrekten Maßen", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    const id = addSiteElement(p, floor, "boundary", rectangle);
    const path = addSiteElement(
      p,
      floor,
      "path",
      [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 4000 },
      ],
      1200,
    );
    expect(siteArea(site(p).elements[id]!)).toBe(60000000);
    expect(siteLength(site(p).elements[id]!)).toBe(32000);
    expect(siteLength(site(p).elements[path]!)).toBe(7000);
    expect(site(p).elements[path]!.width).toBe(1200);
    expect(p.rooms).toEqual({});
    expect(p.walls).toEqual({});
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it("weist ungültige Polygone, Breiten und Referenzen atomar zurück", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    expect(() =>
      transact(p, (d) => {
        addSiteElement(d, floor, "boundary", [
          { x: 0, y: 0 },
          { x: 1000, y: 1000 },
          { x: 0, y: 1000 },
          { x: 1000, y: 0 },
        ]);
      }),
    ).toThrow(/überschneidet/);
    expect(() =>
      transact(p, (d) => {
        addSiteElement(d, floor, "reference", rectangle);
      }),
    ).toThrow(/genau eine/);
    expect(() =>
      transact(p, (d) => {
        addSiteElement(d, floor, "path", rectangle, 0);
      }),
    ).toThrow();
    expect(site(p).elements).toEqual({});
    const id = addSiteElement(p, floor, "boundary", rectangle);
    expect(() =>
      transact(p, (d) => {
        site(d).elements[id]!.layerId = d.layerOrder[0]!;
      }),
    ).toThrow(/Grundstücksebene/);
    expect(() =>
      transact(p, (d) => {
        site(d).elements[id]!.floorId = d.id;
      }),
    ).toThrow(/Geschoss/);
    expect(() => parseProject({ ...p, metadata: { site: { version: 1, elements: [] } } })).toThrow();
  });
  it("verschiebt, dupliziert und löscht Außenobjekte und respektiert Ebenensperren", () => {
    let p = createProject();
    const id = addSiteElement(p, p.floorOrder[0]!, "boundary", rectangle);
    const selection = [{ kind: "siteElements" as const, id }];
    p = transact(p, (d) => moveSelection(d, selection, { x: 500, y: -100 }));
    expect(site(p).elements[id]!.vertices[0]).toEqual({ x: 500, y: -100 });
    p = transact(p, (d) => {
      duplicateSelection(d, selection);
    });
    expect(Object.keys(site(p).elements)).toHaveLength(2);
    p.layers[site(p).elements[id]!.layerId]!.locked = true;
    expect(() => transact(p, (d) => moveSelection(d, selection, { x: 1, y: 1 }))).toThrow(/gesperrt/);
    expect(() => transact(p, (d) => deleteSelection(d, selection))).toThrow(/gesperrt/);
    p.layers[site(p).elements[id]!.layerId]!.locked = false;
    p = transact(p, (d) => deleteSelection(d, selection));
    expect(site(p).elements[id]).toBeUndefined();
  });
  it("fängt sichtbare Grundstückspunkte auch beim Platzieren anderer Gewerke", () => {
    const p = createProject(),
      floor = p.floorOrder[0]!;
    const id = addSiteElement(p, floor, "reference", [{ x: 1275, y: 2225 }]);
    useProjectStore.getState().replace(p);
    useEditorStore.setState({
      floorId: floor,
      tool: "electrical",
      category: "electrical",
      viewport: { scale: 0.1, originPx: { x: 0, y: 0 } },
      snap: null,
      dragOffset: null,
      draft: { points: [], cursor: null, input: "" },
      snapPoints: true,
      snapGrid: true,
      orthogonal: false,
    });
    expect(updateCursor({ x: 1290, y: 2220 })).toEqual({ x: 1275, y: 2225 });
    expect(hitTest(p, floor, { x: 1275, y: 2225 }, 0.1, false, "electrical")).toBeNull();
    expect(hitTest(p, floor, { x: 1275, y: 2225 }, 0.1, false, "site")).toEqual({ kind: "siteElements", id });
    p.layers[site(p).elements[id]!.layerId]!.locked = true;
    expect(siteSnapPoints(p, floor)).toHaveLength(1);
    p.layers[site(p).elements[id]!.layerId]!.visible = false;
    expect(siteSnapPoints(p, floor)).toHaveLength(0);
    expect(planPrimitives(p, floor).some((v) => v.kind === "text" && v.text.includes("Referenzpunkt"))).toBe(
      false,
    );
    expect(
      snap({ x: 1290, y: 2220 }, [], [], {
        scale: 0.1,
        radiusPx: 9,
        gridSize: 100,
        grid: false,
        points: true,
        walls: false,
      }),
    ).toBeNull();
  });
  it("schließt Grenzen und Wege mit Enter und verwirft ungültige Längeneingaben", () => {
    const p = createProject();
    useProjectStore.getState().replace(p);
    useEditorStore.setState({
      floorId: p.floorOrder[0]!,
      tool: "site",
      category: "site",
      siteKind: "boundary",
      draft: { points: [], cursor: null, input: "" },
    });
    rectangle.forEach((v) => confirmSite(v));
    confirmSite({ x: 500, y: 200 }, true);
    expect(Object.values(site(useProjectStore.getState().project).elements)[0]!.vertices).toEqual(rectangle);
    expect(useEditorStore.getState().tool).toBe("select");
    useEditorStore.setState({
      tool: "site",
      siteKind: "path",
      draft: { points: [{ x: 0, y: 0 }], cursor: { x: 2000, y: 0 }, input: "0" },
    });
    confirmSite({ x: 2000, y: 0 });
    expect(useEditorStore.getState().draft.points).toHaveLength(1);
    expect(useProjectStore.getState().error).toContain("gültige Länge");
  });
});
