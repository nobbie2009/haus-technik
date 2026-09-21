import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { createProject } from "../../src/core/projectFactory";

async function surface(page: Page) {
  const box = await page.getByTestId("drawing-surface").boundingBox();
  if (!box) throw new Error("Zeichenfläche fehlt");
  return box;
}
async function drawRectangle(page: Page) {
  await page.getByTitle("Rechteckraum (R)").click();
  const box = await surface(page);
  await page.mouse.click(box.x + 160, box.y + 200);
  await page.mouse.move(box.x + 510, box.y + 440);
  await page.mouse.click(box.x + 510, box.y + 440);
  await expect(page.getByLabel("Raumname", { exact: true })).toBeVisible();
}
async function exportProject(page: Page): Promise<Project> {
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}

test("Möbel bemaßen, drehen, verschieben, duplizieren, sperren und wieder laden", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await drawRectangle(page);
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByLabel("Objektvorlage").selectOption("sofa");
  const box = await surface(page);
  await page.mouse.move(box.x + 300, box.y + 320);
  await page.mouse.click(box.x + 300, box.y + 320);
  await expect(page.getByLabel("Objektname", { exact: true })).toHaveValue("Sofa");
  await expect(page.getByTitle("Möbel / Objekte (M)")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Objektvorlage")).toHaveValue("sofa");
  for (const [label, value] of [
    ["Breite", "2,45 m"],
    ["Tiefe", "0,95 m"],
    ["Höhe", "0,8 m"],
    ["Drehung (°)", "37,5"],
  ]) {
    await page.getByLabel(label!, { exact: true }).fill(value!);
    await page.getByLabel(label!, { exact: true }).press("Enter");
  }
  const initial = await exportProject(page);
  const item = Object.values(initial.furniture)[0]!;
  expect(item).toMatchObject({ width: 2450, depth: 950, height: 800, roomId: Object.keys(initial.rooms)[0] });
  expect(item.rotation).toBeCloseTo((Math.PI * 37.5) / 180);
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 300, box.y + 320);
  await page.mouse.down();
  await page.mouse.move(box.x + 335, box.y + 327, { steps: 5 });
  await page.mouse.up();
  const moved = (await exportProject(page)).furniture[item.id]!;
  expect(moved.position.x - item.position.x).toBe(500);
  expect(moved.position.y - item.position.y).toBe(-100);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exportProject(page)).furniture[item.id]).toEqual(item);
  await page.keyboard.press("Control+d");
  expect(Object.keys((await exportProject(page)).furniture)).toHaveLength(2);
  await page.keyboard.press("Delete");
  expect(Object.keys((await exportProject(page)).furniture)).toHaveLength(1);
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Möbel sperren", exact: true }).click();

  await page.mouse.click(box.x + 300, box.y + 320);
  await expect(page.getByLabel("Breite", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Möbel entsperren", exact: true }).click();

  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Möbel ausblenden", exact: true }).click();

  await page.mouse.click(box.x + 300, box.y + 320);
  await expect(page.getByLabel("Raumname", { exact: true })).not.toBeVisible();
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).click();
  await page.mouse.click(box.x + 300, box.y + 320);
  await expect(page.getByLabel("Raumname", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Möbel einblenden", exact: true }).click();

  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exportProject(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exportProject(page)).toEqual(saved);
  await page.screenshot({ path: "test-results/furniture-desktop.png" });
  expect(errors).toEqual([]);
});

test("Freies Objekt und Migration einer alten Projektdatei", async ({ page }) => {
  const old = createProject("Altes Projekt");
  const { furniture: _furniture, electrical: _electrical, ...legacy } = old;
  const furnitureLayer = Object.values(legacy.layers).find((layer) => layer.kind === "furniture")!;
  delete legacy.layers[furnitureLayer.id];
  const electricalLayer = Object.values(legacy.layers).find((layer) => layer.kind === "electrical")!;
  delete legacy.layers[electricalLayer.id];
  legacy.layerOrder = legacy.layerOrder.filter((id) => id !== electricalLayer.id);
  legacy.layerOrder = legacy.layerOrder.filter((id) => id !== furnitureLayer.id);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "alt.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...legacy, schemaVersion: 1 })),
  });
  await expect(page.getByText("„Altes Projekt“ wurde importiert.")).toBeVisible();
  expect((await exportProject(page)).schemaVersion).toBe(10);
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByLabel("Objektvorlage").selectOption("custom");
  const box = await surface(page);
  await page.mouse.click(box.x + 300, box.y + 300);
  await page.getByLabel("Objektname", { exact: true }).fill("Werkbank");
  await page.getByLabel("Objektname", { exact: true }).press("Enter");
  await page.getByLabel("Objekttyp", { exact: true }).fill("workbench");
  await page.getByLabel("Objekttyp", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "+90° drehen", exact: true }).click();
  const saved = await exportProject(page);
  expect(Object.values(saved.furniture)[0]).toMatchObject({
    name: "Werkbank",
    type: "workbench",
    rotation: Math.PI / 2,
    roomId: null,
  });
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "neu.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByText("„Altes Projekt“ wurde importiert.")).toBeVisible();
  expect(await exportProject(page)).toEqual(saved);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
});

test("Wand mit Tastaturmaß, Eigenschaften, Undo/Redo und Löschen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByTitle("Wand (W)").click();
  const box = await surface(page);
  await page.mouse.click(box.x + 150, box.y + 400);
  await page.mouse.move(box.x + 430, box.y + 400);
  await page.keyboard.type("4350");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Länge", { exact: true })).toHaveValue("4,350 m");
  await page.keyboard.press("Escape");
  await page.getByLabel("Länge", { exact: true }).fill("4,8 m");
  await page.getByLabel("Länge", { exact: true }).press("Enter");
  await expect(page.getByLabel("Länge", { exact: true })).toHaveValue("4,800 m");
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByLabel("Länge", { exact: true })).toHaveValue("4,350 m");
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await expect(page.getByLabel("Länge", { exact: true })).toHaveValue("4,800 m");
  await page.keyboard.press("Delete");
  expect(Object.keys((await exportProject(page)).walls)).toHaveLength(0);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect(Object.keys((await exportProject(page)).walls)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("Rechteck exakt bemaßen, lokal laden, exportieren und importieren", async ({ page }) => {
  await drawRectangle(page);
  await page.getByLabel("Raumname", { exact: true }).fill("Wohnzimmer");
  await page.getByLabel("Raumname", { exact: true }).press("Enter");
  await page.getByLabel("Länge", { exact: true }).fill("4,35 m");
  await page.getByLabel("Länge", { exact: true }).press("Enter");
  await page.getByLabel("Breite", { exact: true }).fill("3,2 m");
  await page.getByLabel("Breite", { exact: true }).press("Enter");
  await expect(page.getByText("13,92 m²", { exact: true })).toBeVisible();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const original = await exportProject(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const restored = await exportProject(page);
  expect(restored).toEqual(original);
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Neues Projekt" });
  await dialog.getByLabel("Projektname").fill("Leeres Testprojekt");
  await dialog.getByRole("button", { name: "Projekt erstellen" }).click();
  await expect(dialog).not.toBeVisible();
  expect(Object.keys((await exportProject(page)).rooms)).toHaveLength(0);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "test.homeplan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect(page.getByText("„Mein Haus“ wurde importiert.")).toBeVisible();
  expect(await exportProject(page)).toEqual(original);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("Nicht unterstützte Projektversion");
  expect(await exportProject(page)).toEqual(original);
});

test("Etagen, Ebenensperre, Duplizieren, Türen und Fenster", async ({ page }) => {
  await page.getByTitle("Beispielgrundriss öffnen").click();
  await expect(page.locator(".project-heading")).toContainText("Haus am Garten");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const sample = await exportProject(page);
  expect(Object.keys(sample.rooms)).toHaveLength(4);
  expect(Object.keys(sample.doors)).toHaveLength(3);
  expect(Object.keys(sample.windows)).toHaveLength(4);
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.getByRole("button", { name: "Etage erstellen", exact: true }).click();
  const dialog = page.getByRole("region", { name: "Etage erstellen" });
  await dialog.getByLabel("Name", { exact: true }).fill("Keller");
  await dialog.getByLabel("Etagenhöhe (m)").fill("-2,8 m");
  await dialog.getByRole("button", { name: "Etage erstellen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".canvas-title")).toContainText("Keller");

  await drawRectangle(page);
  await page.getByRole("button", { name: "Duplizieren", exact: true }).click();
  expect(Object.keys((await exportProject(page)).rooms)).toHaveLength(6);
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Grundriss sperren", exact: true }).click();

  await expect(page.getByLabel("Raumname", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Löschen", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Grundriss entsperren", exact: true }).click();

  await expect(page.getByLabel("Raumname", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Grundriss ausblenden", exact: true }).click();

  await expect(page.getByLabel("Raumname", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Grundriss einblenden", exact: true }).click();

  await page.screenshot({ path: "test-results/editor-keller.png" });
});

test("Polygonraum, Bemaßung, Zoom und Pan behalten die Geometrie", async ({ page }) => {
  await page.getByTitle("Freier Raum (P)").click();
  const box = await surface(page);
  for (const [x, y] of [
    [150, 250],
    [450, 250],
    [450, 400],
    [300, 400],
    [300, 500],
    [150, 500],
  ])
    await page.mouse.click(box.x + x!, box.y + y!);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Raumname", { exact: true })).toBeVisible();
  const before = await exportProject(page);
  await page.getByTitle("Bemaßung (D)").click();
  await page.mouse.click(box.x + 150, box.y + 250);
  await page.mouse.click(box.x + 450, box.y + 250);
  expect(Object.keys((await exportProject(page)).dimensions)).toHaveLength(1);
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 350, box.y + 350);
  await page.mouse.wheel(0, -300);
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 390, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const after = await exportProject(page);
  expect(after.points).toEqual(before.points);
  expect(after.walls).toEqual(before.walls);
  await page.screenshot({ path: "test-results/editor-polygon.png" });
});

test("Beispiel und leere Oberfläche bleiben auf Desktopgrößen nutzbar", async ({ page }) => {
  await page.getByTitle("Beispielgrundriss öffnen").click();
  await expect(page.locator(".project-heading")).toContainText("Haus am Garten");
  await page.screenshot({ path: "test-results/editor-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole("button", { name: "JSON exportieren", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await page.screenshot({ path: "test-results/editor-compact.png" });
});

test("Tür und Fenster einsetzen, Eigenschaften ändern und per Undo entfernen", async ({ page }) => {
  await drawRectangle(page);
  const box = await surface(page);
  await page.getByTitle("Tür (T)").click();
  await page.mouse.click(box.x + 250, box.y + 440);
  await expect(page.getByLabel("Türanschlag", { exact: true })).toBeVisible();
  await page.getByLabel("Türanschlag", { exact: true }).selectOption("endSide");
  await page.getByTitle("Fenster (F)").click();
  await page.mouse.click(box.x + 430, box.y + 440);
  await expect(page.getByLabel("Brüstungshöhe", { exact: true })).toBeVisible();
  await page.getByLabel("Brüstungshöhe", { exact: true }).fill("1,1 m");
  await page.getByLabel("Brüstungshöhe", { exact: true }).press("Enter");
  let project = await exportProject(page);
  expect(Object.values(project.doors)[0]!.openingDirection.hinge).toBe("endSide");
  expect(Object.values(project.windows)[0]!.sillHeight).toBe(1100);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  project = await exportProject(page);
  expect(Object.keys(project.windows)).toHaveLength(0);
  expect(Object.keys(project.doors)).toHaveLength(1);
});

test("Verschieben ist eine Transaktion und Escape verwirft die Vorschau", async ({ page }) => {
  await drawRectangle(page);
  await page.getByTitle("Auswahl (V)").click();
  const original = await exportProject(page);
  const box = await surface(page);
  await page.mouse.move(box.x + 300, box.y + 320);
  await page.mouse.down();
  await page.mouse.move(box.x + 340, box.y + 350, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await exportProject(page)).points).toEqual(original.points);
  await page.mouse.move(box.x + 300, box.y + 320);
  await page.mouse.down();
  await page.mouse.move(box.x + 360, box.y + 320, { steps: 5 });
  await page.mouse.up();
  expect((await exportProject(page)).points).not.toEqual(original.points);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exportProject(page)).points).toEqual(original.points);
});

test("Größerer Grundriss mit 1000 Wänden lässt sich laden und zoomen", async ({ page }) => {
  const project = createProject("1000-Wände-Test");
  for (let i = 0; i < 1000; i++) {
    const startId = crypto.randomUUID(),
      endId = crypto.randomUUID(),
      wallId = crypto.randomUUID();
    const x = (i % 40) * 2000,
      y = Math.floor(i / 40) * 2000;
    project.points[startId] = {
      id: startId,
      floorId: project.floorOrder[0]!,
      position: { x, y },
      metadata: {},
    };
    project.points[endId] = {
      id: endId,
      floorId: project.floorOrder[0]!,
      position: { x: x + 1200, y },
      metadata: {},
    };
    project.walls[wallId] = {
      id: wallId,
      floorId: project.floorOrder[0]!,
      layerId: project.layerOrder[0]!,
      startPointId: startId,
      endPointId: endId,
      thickness: 200,
      height: 2500,
      material: "Mauerwerk",
      metadata: {},
    };
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„1000-Wände-Test“ wurde importiert.")).toBeVisible();
  await page.getByRole("button", { name: "Vergrößern", exact: true }).click();
  await page.getByRole("button", { name: "Vergrößern", exact: true }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  expect(Object.keys((await exportProject(page)).walls)).toHaveLength(1000);
  expect(errors).toEqual([]);
});
