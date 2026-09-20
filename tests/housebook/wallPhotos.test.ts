import { describe, it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addWallPath } from "../../src/editor/actions/topology";
import { parseProject } from "../../src/core/validation";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection, duplicateSelection } from "../../src/editor/actions/edit";
import {
  wallPhotos,
  setWallPhotos,
  editWallPhoto,
  photoTraceLength,
  wallPhotoSvg,
  type WallPhoto,
} from "../../src/housebook/wallPhotos";
import { newId } from "../../src/utils/uuid";
export function photoFixture() {
  const project = createProject(),
    floor = project.floorOrder[0]!;
  const wall = addWallPath(project, floor, { x: 0, y: 0 }, { x: 4000, y: 0 }).wallIds[0]!;
  const photo: WallPhoto = {
    id: newId(),
    name: "Küche",
    side: "Innenseite",
    notes: "Vor dem Verputzen",
    data: "data:image/png;base64,AAAA",
    pixelWidth: 1200,
    pixelHeight: 600,
    calibration: null,
    traces: [
      {
        id: newId(),
        name: "Steckdosen",
        type: "electrical",
        notes: "Eigene Dokumentation",
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.6, y: 0.2 },
          { x: 0.6, y: 0.7 },
        ],
      },
    ],
  };
  setWallPhotos(project, wall, [photo]);
  return { project, floor, wall, photo };
}
describe("Wandfotos", () => {
  it("speichert mehrere Wandseiten und unabhängige Verläufe im Projekt", () => {
    const { project, wall, photo } = photoFixture();
    setWallPhotos(project, wall, [photo, { ...photo, id: newId(), side: "Flurseite", traces: [] }]);
    expect(parseProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
    expect(wallPhotos(project, wall)).toHaveLength(2);
    expect(photoTraceLength(photo, photo.traces[0]!)).toBeNull();
    expect(Object.values(project.electrical.cables)).toHaveLength(0);
  });
  it("rechnet Referenzstrecken mit beiden Bilddimensionen und unveränderten Fotokoordinaten", () => {
    const { photo } = photoFixture();
    photo.calibration = {
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
      ],
      distanceMm: 2000,
    };
    expect(photoTraceLength(photo, photo.traces[0]!)).toBeCloseTo(3000);
    const scaled = { ...photo, pixelWidth: 2400, pixelHeight: 1200 };
    expect(photoTraceLength(scaled, scaled.traces[0]!)).toBeCloseTo(3000);
  });
  it("verhindert ungültige Koordinaten, doppelte IDs und Nullstrecken atomar", () => {
    const { project, wall, photo } = photoFixture();
    for (const change of [
      (p: WallPhoto) => {
        p.traces[0]!.points[0]!.x = 1.1;
      },
      (p: WallPhoto) => {
        p.calibration = {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ],
          distanceMm: 1,
        };
      },
      (p: WallPhoto) => {
        p.traces.push(p.traces[0]!);
      },
      (p: WallPhoto) => {
        p.data = "https://example.com/photo.jpg";
      },
    ])
      expect(() => transact(project, (p) => editWallPhoto(p, wall, photo.id, change))).toThrow();
    const invalid = structuredClone(project);
    invalid.walls[wall]!.metadata.wallPhotos = [{}];
    expect(() => parseProject(invalid)).toThrow(/Wandfotos/);
    expect(wallPhotos(project, wall)[0]).toEqual(photo);
  });
  it("respektiert die Wandsperre und kopiert Fotos unabhängig mit der Wand", () => {
    const { project, wall, photo } = photoFixture();
    const copy = transact(project, (p) => {
      duplicateSelection(p, [{ kind: "walls", id: wall }]);
    });
    const other = Object.keys(copy.walls).find((id) => id !== wall)!;
    const changed = transact(copy, (p) =>
      editWallPhoto(p, other, photo.id, (v) => {
        v.traces = [];
      }),
    );
    expect(wallPhotos(changed, wall)[0]!.traces).toHaveLength(1);
    expect(wallPhotos(changed, other)[0]!.traces).toHaveLength(0);
    project.layers[project.walls[wall]!.layerId]!.locked = true;
    expect(() => transact(project, (p) => setWallPhotos(p, wall, []))).toThrow(/gesperrt/);
    const removed = transact(copy, (p) => deleteSelection(p, [{ kind: "walls", id: wall }]));
    expect(wallPhotos(removed, wall)).toHaveLength(0);
  });
  it("begrenzt Projekte mit Wandbildern auch ohne weitere Hausaktendaten", () => {
    const { project, wall, photo } = photoFixture();
    const photos = Array.from({ length: 5 }, () => ({
      ...photo,
      id: newId(),
      data: `data:image/jpeg;base64,${"AAAA".repeat(930000)}`,
    }));
    expect(() => transact(project, (p) => setWallPhotos(p, wall, photos))).toThrow(/18 MB/);
  });
  it("exportiert ein eigenständiges SVG mit Foto, Linien und escaped Beschriftungen", () => {
    const { photo } = photoFixture();
    photo.name = '<Foto & "Wand">';
    photo.traces[0]!.name = "<script>";
    const svg = wallPhotoSvg(photo);
    expect(svg).toContain('href="data:image/png;base64,AAAA"');
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain('points="120,120 720,120 720,420"');
  });
});
