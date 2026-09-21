import { describe, it, expect } from "vitest";
import { gpsToPlan, freshFix, saveGpsSurvey, gpsReference, type GpsReference } from "../../src/site/gps";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { site } from "../../src/site/model";
const fix = { latitude: 0, longitude: 0, accuracy: 3, timestamp: 1000 };
const ref: GpsReference = { fix, position: { x: 2000, y: 3000 }, northAngle: 0, label: "Testursprung" };
const degreePerMeter = 180 / (Math.PI * 6378137);
describe("GPS-Gartenerfassung", () => {
  it("projiziert Nord/Ost und gedrehte Pläne maßhaltig relativ zum Bezugspunkt", () => {
    expect(gpsToPlan(ref, fix)).toEqual(ref.position);
    expect(gpsToPlan(ref, { ...fix, longitude: degreePerMeter }).x).toBeCloseTo(3000, 2);
    expect(gpsToPlan(ref, { ...fix, latitude: degreePerMeter }).y).toBeCloseTo(4000, 2);
    const rotated = gpsToPlan({ ...ref, northAngle: 90 }, { ...fix, latitude: degreePerMeter });
    expect(rotated.x).toBeCloseTo(3000, 2);
    expect(rotated.y).toBeCloseTo(3000, 2);
    const crossing = gpsToPlan(
      { ...ref, fix: { ...fix, longitude: 179.99999 } },
      { ...fix, longitude: -179.99999 },
    );
    expect(crossing.x - ref.position.x).toBeCloseTo(2226.39, 1);
  });
  it("weist entfernte und veraltete Positionen zurück", () => {
    expect(() => gpsToPlan(ref, { ...fix, latitude: 1 })).toThrow(/10 km/);
    expect(freshFix(fix, 16000)).toBe(true);
    expect(freshFix(fix, 16001)).toBe(false);
    expect(freshFix(null, 1000)).toBe(false);
    expect(freshFix(fix, -1001)).toBe(false);
  });
  it("speichert Georeferenz und Messqualität im Projekt und behält manuelle Korrekturen", () => {
    let id = "";
    const p = transact(createProject(), (p) => {
      const floor = p.floorOrder[0]!;
      p.floors[floor]!.metadata.gpsReference = ref;
      id = saveGpsSurvey(p, floor, "boundary", 1000, ref, [
        fix,
        { ...fix, longitude: degreePerMeter * 20 },
        { ...fix, longitude: degreePerMeter * 20, latitude: degreePerMeter * 10 },
      ]);
    });
    expect(gpsReference(p, p.floorOrder[0]!)).toEqual(ref);
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const changed = transact(p, (d) => {
      site(d).elements[id]!.vertices[0]!.x += 100;
    });
    expect(site(changed).elements[id]!.metadata.gpsSurvey).toEqual(site(p).elements[id]!.metadata.gpsSurvey);
    expect(() =>
      transact(p, (d) => {
        d.floors[d.floorOrder[0]!]!.metadata.gpsReference = { ...ref, northAngle: 360 };
      }),
    ).toThrow(/GPS-Referenz/);
  });
  it("prüft Geometrie und Ebenensperren auch für GPS-Aufnahmen", () => {
    const p = transact(createProject(), (d) => {
      saveGpsSurvey(d, d.floorOrder[0]!, "reference", 1000, ref, [fix]);
    });
    const item = Object.values(site(p).elements)[0]!;
    p.layers[item.layerId]!.locked = true;
    expect(() =>
      transact(p, (d) => {
        saveGpsSurvey(d, d.floorOrder[0]!, "path", 1000, ref, [fix, { ...fix, latitude: degreePerMeter }]);
      }),
    ).toThrow(/entsperren/);
    expect(() =>
      transact(createProject(), (d) => {
        saveGpsSurvey(d, d.floorOrder[0]!, "boundary", 1000, ref, [fix, fix, fix]);
      }),
    ).toThrow();
  });
});
