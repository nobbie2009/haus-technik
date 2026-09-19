import { describe, expect, it } from "vitest";
import { panBy, screenToWorld, worldToScreen, zoomAt } from "../../src/geometry/coordinates";
import { snap } from "../../src/geometry/snapping";
import type { SnapOptions } from "../../src/geometry/snapping";
import { formatArea, formatLength, parseLength } from "../../src/utils/units";

describe("Koordinaten, Zoom und Pan", () => {
  const viewport = { scale: 0.2, originPx: { x: 500, y: 400 } };
  it("invertiert die Y-Achse und transformiert verlustfrei zurück", () => {
    const world = { x: -123.75, y: 4350.125 };
    const screen = worldToScreen(world, viewport);
    expect(screen.y).toBeLessThan(viewport.originPx.y);
    expect(screenToWorld(screen, viewport).x).toBeCloseTo(world.x, 10);
    expect(screenToWorld(screen, viewport).y).toBeCloseTo(world.y, 10);
  });
  it("hält den Weltpunkt unter dem Cursor beim Zoom fest", () => {
    const cursor = { x: 780, y: 250 };
    const before = screenToWorld(cursor, viewport);
    for (const scale of [0.002, 0.05, 1, 5]) {
      const after = screenToWorld(cursor, zoomAt(viewport, cursor, scale));
      expect(after.x).toBeCloseTo(before.x, 8);
      expect(after.y).toBeCloseTo(before.y, 8);
    }
  });
  it("ändert beim Pan nur den Ursprung", () => {
    expect(panBy(viewport, { x: 50, y: -80 })).toEqual({ scale: 0.2, originPx: { x: 550, y: 320 } });
    expect(viewport.originPx).toEqual({ x: 500, y: 400 });
  });
  it.each([0, -1, NaN, Infinity])("verwirft ungültigen Zoom %s", (scale) => {
    expect(() => zoomAt(viewport, { x: 0, y: 0 }, scale)).toThrow();
  });
});

describe("Snap", () => {
  const options: SnapOptions = {
    scale: 0.1,
    radiusPx: 8,
    gridSize: 100,
    points: true,
    walls: true,
    grid: true,
  };
  it("priorisiert Punkte gegenüber Wand und Raster", () => {
    const result = snap(
      { x: 500, y: 10 },
      [{ id: "p", position: { x: 550, y: 0 } }],
      [{ id: "w", start: { x: 0, y: 0 }, end: { x: 1000, y: 0 } }],
      options,
    );
    expect(result?.target).toEqual({ kind: "point", pointId: "p" });
  });
  it("liefert Wand-ID und metrischen Abstand vom Wandstart", () => {
    const result = snap(
      { x: 500, y: 10 },
      [],
      [{ id: "w", start: { x: 0, y: 0 }, end: { x: 1000, y: 0 } }],
      options,
    );
    expect(result?.target).toEqual({ kind: "wall", wallId: "w", position: 500 });
    expect(result?.position).toEqual({ x: 500, y: 0 });
  });
  it("verwendet einen konstanten Bildschirm-Fangradius", () => {
    const candidates = [{ id: "p", position: { x: 0, y: 0 } }];
    expect(snap({ x: 60, y: 0 }, candidates, [], { ...options, grid: false })?.distancePx).toBe(6);
    expect(snap({ x: 60, y: 0 }, candidates, [], { ...options, grid: false, scale: 1 })).toBeNull();
  });
  it("rundet negative Rasterhalbwerte symmetrisch", () => {
    expect(snap({ x: -150, y: 150 }, [], [], options)?.position).toEqual({ x: -200, y: 200 });
  });
  it("ist bei gleichwertigen Kandidaten unabhängig von der Reihenfolge", () => {
    const points = [
      { id: "b", position: { x: 10, y: 0 } },
      { id: "a", position: { x: -10, y: 0 } },
    ];
    expect(snap({ x: 0, y: 0 }, points, [], options)).toEqual(
      snap({ x: 0, y: 0 }, [...points].reverse(), [], options),
    );
  });
  it("beachtet deaktivierte Modi und ignoriert Nullwände", () => {
    expect(
      snap({ x: 0, y: 0 }, [], [{ id: "w", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }], {
        ...options,
        grid: false,
      }),
    ).toBeNull();
    expect(
      snap({ x: 0, y: 0 }, [{ id: "p", position: { x: 0, y: 0 } }], [], {
        ...options,
        points: false,
        grid: false,
      }),
    ).toBeNull();
  });
  it("verwirft ungültige Rasterkonfiguration", () => {
    expect(() => snap({ x: 0, y: 0 }, [], [], { ...options, gridSize: 0 })).toThrow();
  });
  it("hält ein Snap-Ziel stabil und löst es außerhalb der Halteschwelle", () => {
    const points = [
      { id: "a", position: { x: 0, y: 0 } },
      { id: "b", position: { x: 110, y: 0 } },
    ];
    const previous = snap({ x: 0, y: 0 }, points, [], options);
    expect(snap({ x: 100, y: 0 }, points, [], options, previous)?.target).toEqual({
      kind: "point",
      pointId: "a",
    });
    expect(snap({ x: 130, y: 0 }, points, [], options, previous)?.target).toEqual({
      kind: "point",
      pointId: "b",
    });
  });
});

describe("Maßeingabe und Anzeige", () => {
  it.each(["4350", "4350 mm", "435 cm", "4,35 m", "4.35 m", " 4,35 M "])("liest %s als 4350 mm", (input) => {
    expect(parseLength(input)).toBe(4350);
  });
  it("verwendet die explizite Feldeinheit", () => {
    expect(parseLength("4,35", "m")).toBe(4350);
    expect(parseLength("435 cm", "m")).toBe(4350);
    expect(parseLength("-0,5 m")).toBe(-500);
  });
  it.each(["", "4,3.5", "1 000", "1.000,5", "Infinity", "NaN", "3 feet", "12mmfoo"])(
    "verwirft %s",
    (input) => {
      expect(() => parseLength(input)).toThrow();
    },
  );
  it("formatiert deutsche Maße ohne Änderung der gespeicherten Werte", () => {
    expect(formatLength(4350, "m")).toBe("4,350 m");
    expect(formatLength(4350, "cm")).toBe("435,0 cm");
    expect(formatArea(13_920_000)).toBe("13,92 m²");
  });
});
