import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbRepository } from "../../src/persistence/indexedDbRepository";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";
import { createDemoProject } from "../../src/editor/demoProject";
import { createProject } from "../../src/core/projectFactory";

describe("Dateien und lokaler Speicher", () => {
  it("erhält sämtliche IDs und Maße im JSON-Roundtrip", () => {
    const project = createDemoProject();
    expect(importProjectText(exportProjectText(project))).toEqual(project);
  });
  it.each(["{kaputt", JSON.stringify({ schemaVersion: 999 }), JSON.stringify({ schemaVersion: 1 })])(
    "lehnt ungültige Dateien ab",
    (input) => {
      expect(() => importProjectText(input)).toThrow();
    },
  );
  it("speichert mehrere Projekte und lädt das zuletzt aktive vollständig", async () => {
    const repository = new IndexedDbRepository(`test-${crypto.randomUUID()}`);
    const a = createDemoProject();
    const b = createProject("Zweites Haus");
    expect(await repository.loadActive()).toBeNull();
    await repository.save(a);
    await repository.save(b);
    expect(await repository.load(a.id)).toEqual(a);
    expect(await repository.loadActive()).toEqual(b);
    expect(await repository.list()).toHaveLength(2);
  });
  it("ersetzt einen gültigen Speicherstand nicht durch ungültige Daten", async () => {
    const repository = new IndexedDbRepository(`test-${crypto.randomUUID()}`);
    const project = createDemoProject();
    await repository.save(project);
    await expect(repository.save({ ...project, name: "" })).rejects.toThrow();
    expect(await repository.load(project.id)).toEqual(project);
  });
});
