import { test, expect, type Page } from "@playwright/test";
import { wallProject, wallPng } from "../wallPhotoFixture";
import { wallPhotos, photoTraceLength } from "../../src/housebook/wallPhotos";
import type { Project } from "../../src/models/project";
async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Wandfoto zuordnen, Verlauf und Referenz zeichnen, exportieren und wieder laden", async ({ page }) => {
  const { project, wall } = wallProject(),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "wand.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.locator(".object-list summary").click();
  await page.getByRole("button", { name: /^Wand 1/ }).click();
  await page.getByRole("button", { name: "Wandfotos und Verläufe (0)", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Wandfotos und Leitungsverläufe", exact: true });
  await dialog
    .getByLabel("Wandfoto hinzufügen")
    .setInputFiles({ name: "Kuechenwand.png", mimeType: "image/png", buffer: await wallPng(page) });
  const canvas = page.getByTestId("wall-photo-canvas");
  await expect(canvas).toBeVisible();
  await dialog.getByText("Fotodaten und Wandseite", { exact: true }).click();
  await dialog.getByLabel("Wandseite / Raum", { exact: true }).fill("Küchenseite");
  await dialog.getByLabel("Wandseite / Raum", { exact: true }).press("Enter");
  await dialog.getByText("Fotodaten und Wandseite", { exact: true }).click();
  const point = async (x: number, y: number) => {
    const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width * x, y: box.height * y } });
  };
  await dialog.getByRole("button", { name: "Neuen Verlauf zeichnen", exact: true }).click();
  await point(0.1, 0.2);
  await point(0.6, 0.2);
  await point(0.6, 0.7);
  await dialog.getByLabel("Verlaufsname", { exact: true }).fill("Küchensteckdosen");
  await dialog.getByRole("button", { name: "Verlauf speichern", exact: true }).click();
  await dialog.getByRole("button", { name: "Referenzstrecke markieren", exact: true }).click();
  await point(0.1, 0.85);
  await point(0.6, 0.85);
  await dialog.getByLabel("Bekannte Fotostrecke (mm)", { exact: true }).fill("2000");
  await dialog.getByRole("button", { name: "Referenz speichern", exact: true }).click();
  await expect(dialog.getByText("ca. 3.00 m (Foto)", { exact: true })).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/wall-photo-desktop.png" });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Wandfoto als SVG exportieren", exact: true }).click();
  await (await download).saveAs("test-results/wall-photo.svg");
  await dialog.getByRole("button", { name: "Neuen Verlauf zeichnen", exact: true }).click();
  await point(0.3, 0.3);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Die begonnenen Punkte sind noch nicht gespeichert.", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Weiterzeichnen", exact: true }).click();
  await dialog.getByRole("button", { name: "Zeichnung abbrechen", exact: true }).click();
  await dialog.getByRole("button", { name: "Wandfoto löschen", exact: true }).click();
  await dialog.getByRole("button", { name: "Foto und Verläufe löschen", exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await dialog.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(canvas).toBeVisible();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const saved = await exported(page),
    photo = wallPhotos(saved, wall)[0]!;
  expect(photo.side).toBe("Küchenseite");
  expect(photo.traces).toHaveLength(1);
  expect(photoTraceLength(photo, photo.traces[0]!)).toBeCloseTo(3000, -1);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  expect(wallPhotos(await exported(page), wall)).toEqual([photo]);
  expect(errors).toEqual([]);
});
