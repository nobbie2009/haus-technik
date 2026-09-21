import { test, expect, type Page } from "@playwright/test";
import { rectangleFixture } from "../fixtures";
import type { Project } from "../../src/models/project";

async function exported(page: Page): Promise<Project> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await download).createReadStream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Raummaß anklicken, genau ändern, abbrechen und rückgängig machen", async ({ page }) => {
  const { project, walls } = rectangleFixture();
  const wall = walls[0]!;
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "room.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  const measure = page.locator(`.editable-wall-dimension[data-wall-id="${wall.id}"]`);
  await measure.click();
  const dialog = page.getByRole("dialog", { name: "Wandmaß ändern" });
  await expect(dialog.getByLabel("Neue Wandlänge", { exact: true })).toBeFocused();
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Maß übernehmen", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("mindestens 1 mm");
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).fill("4,8 m");
  await dialog.getByRole("button", { name: "Maß übernehmen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const changed = await exported(page);
  expect(changed.points[wall.endPointId]!.position).toEqual({ x: 4800, y: 0 });
  for (const point of Object.values(project.points).filter((p) => p.id !== wall.endPointId))
    expect(changed.points[point.id]!.position).toEqual(point.position);
  await measure.click();
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).fill("5 m");
  await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  expect((await exported(page)).points).toEqual(changed.points);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).points).toEqual(project.points);
  await measure.click();
  await dialog.getByLabel("Fester Endpunkt", { exact: true }).selectOption("end");
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).fill("400 cm");
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).press("Enter");
  const fixed = await exported(page);
  expect(fixed.points[wall.startPointId]!.position).toEqual({ x: 350, y: 0 });
  expect(fixed.points[wall.endPointId]!.position).toEqual(project.points[wall.endPointId]!.position);
  await page.screenshot({ path: "test-results/wall-dimension.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  expect((await exported(page)).points).toEqual(fixed.points);
});
