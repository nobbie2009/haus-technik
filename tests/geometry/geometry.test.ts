import { describe, expect, it } from "vitest";
import { distance, projectToSegment } from "../../src/geometry/distance";
import {
  polygonArea,
  polygonPerimeter,
  polygonProblem,
  rectangleDimensions,
} from "../../src/geometry/polygon";
import { segmentsIntersect } from "../../src/geometry/intersections";
import { resizeWallEndpoints, wallFootprint } from "../../src/geometry/wallGeometry";

const rectangle = [
  { x: 0, y: 0 },
  { x: 4350, y: 0 },
  { x: 4350, y: 3200 },
  { x: 0, y: 3200 },
];

describe("Abstände und Projektionen", () => {
  it("berechnet metrische Abstände auch mit negativen Koordinaten", () => {
    expect(distance({ x: -1000, y: -1000 }, { x: 2000, y: 3000 })).toBe(5000);
    expect(distance({ x: 0, y: 0 }, { x: 4350, y: 0 })).toBe(4350);
  });
  it("projiziert auf ein endliches Wandsegment", () => {
    expect(projectToSegment({ x: 500, y: 200 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toEqual({
      position: { x: 500, y: 0 },
      fraction: 0.5,
      distance: 200,
    });
    expect(projectToSegment({ x: 1200, y: 0 }, { x: 0, y: 0 }, { x: 1000, y: 0 }).position).toEqual({
      x: 1000,
      y: 0,
    });
  });
  it("behandelt ein degeneriertes Segment als Punkt", () => {
    expect(projectToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }).distance).toBe(5);
  });
  it("verwirft nicht endliche Eingaben", () => {
    expect(() => distance({ x: NaN, y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});

describe("Polygone", () => {
  it("berechnet 13,92 m² und 15,1 m Umfang", () => {
    expect(polygonArea(rectangle)).toBe(13_920_000);
    expect(polygonPerimeter(rectangle)).toBe(15_100);
    expect(polygonProblem(rectangle)).toBeNull();
    expect(polygonArea([...rectangle].reverse())).toBe(13_920_000);
  });
  it("berechnet konkave L-Räume", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 2000 },
      { x: 2000, y: 2000 },
      { x: 2000, y: 4000 },
      { x: 0, y: 4000 },
    ];
    expect(polygonProblem(points)).toBeNull();
    expect(polygonArea(points)).toBe(12_000_000);
    expect(rectangleDimensions(points)).toBeNull();
  });
  it("behält Genauigkeit bei weit verschobenem Ursprung", () => {
    expect(polygonArea(rectangle.map((p) => ({ x: p.x + 1e9, y: p.y - 1e9 })))).toBe(13_920_000);
  });
  it.each([
    [
      "Selbstüberschneidung",
      [
        { x: 0, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
        { x: 3000, y: 0 },
      ],
    ],
    ["Doppelpunkt", [...rectangle, rectangle[0]!]],
    [
      "Rücklauf",
      [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 1000 },
      ],
    ],
    [
      "Linie",
      [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 2000, y: 0 },
      ],
    ],
    [
      "zu wenige Punkte",
      [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
    ],
  ])("erkennt %s", (_label, points) => {
    expect(polygonProblem(points)).not.toBeNull();
  });
  it("erkennt gedrehte Rechtecke und kollineare Wandteilpunkte", () => {
    const points = [rectangle[0]!, { x: 2000, y: 0 }, ...rectangle.slice(1)].map((p) => ({
      x: p.x * Math.cos(0.7) - p.y * Math.sin(0.7),
      y: p.x * Math.sin(0.7) + p.y * Math.cos(0.7),
    }));
    const result = rectangleDimensions(points);
    expect(result?.length).toBeCloseTo(4350, 8);
    expect(result?.width).toBeCloseTo(3200, 8);
  });
  it("erkennt Berührungen und kollineare Überlappungen", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 20, y: 0 })).toBe(true);
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 })).toBe(true);
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 11, y: 0 }, { x: 20, y: 0 })).toBe(false);
  });
});

describe("Wandgeometrie", () => {
  it("setzt eine diagonale Wand auf 4350 mm, ohne Winkel oder Start zu ändern", () => {
    const start = { x: -100, y: 200 };
    const end = { x: 200, y: 600 };
    const result = resizeWallEndpoints(start, end, 4350);
    expect(result.start).toEqual(start);
    expect(distance(result.start, result.end)).toBeCloseTo(4350, 10);
    expect(result.end).toEqual({ x: 2510, y: 3680 });
    expect(end).toEqual({ x: 200, y: 600 });
  });
  it("kann das Wandende festhalten", () => {
    expect(resizeWallEndpoints({ x: 0, y: 0 }, { x: 1000, y: 0 }, 4350, "end")).toEqual({
      start: { x: -3350, y: 0 },
      end: { x: 1000, y: 0 },
    });
  });
  it("erzeugt einen Wandkörper mit realer Stärke", () => {
    const footprint = wallFootprint({ x: 0, y: 0 }, { x: 4350, y: 0 }, 200);
    expect(footprint).toEqual([
      { x: 0, y: 100 },
      { x: 4350, y: 100 },
      { x: 4350, y: -100 },
      { x: 0, y: -100 },
    ]);
    expect(polygonArea(footprint)).toBe(870_000);
  });
  it("verwirft Nullwände und ungültige Maße", () => {
    expect(() => wallFootprint({ x: 0, y: 0 }, { x: 0, y: 0 }, 200)).toThrow();
    expect(() => resizeWallEndpoints({ x: 0, y: 0 }, { x: 1, y: 0 }, 0)).toThrow();
    expect(() => wallFootprint({ x: 0, y: 0 }, { x: 1, y: 0 }, -1)).toThrow();
  });
});
