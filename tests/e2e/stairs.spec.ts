import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { addFurniture } from "../../src/furniture/actions";
import { newId } from "../../src/utils/uuid";

test("Treppenrichtung bearbeiten, Nachbargeschoss anzeigen und speichern", async ({ page }) => {
  const project = createProject();
  const floor = project.floors[project.floorOrder[0]!]!;
  for (const [name, elevation] of [
    ["Obergeschoss", 2800],
    ["Keller", -2800],
  ] as const) {
    const id = newId();
    project.floors[id] = { ...structuredClone(floor), id, name, elevation };
    project.floorOrder.push(id);
  }
  addFurniture(project, floor.id, { x: 2000, y: 2000 }, "straightStairs");
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "stairs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Gerade Treppe", exact: true }).click();
  await expect(page.getByLabel("Treppenrichtung", { exact: true })).toHaveValue("up");
  await expect(page.getByText("Auch sichtbar in: Obergeschoss.", { exact: false })).toBeVisible();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await page.screenshot({ path: "test-results/stairs-upper.png" });
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Erdgeschoss" }).click();
  await page.locator(".object-list").getByRole("button", { name: "Gerade Treppe", exact: true }).click();
  await page.getByLabel("Treppenrichtung", { exact: true }).selectOption("down");
  await expect(page.getByText("Auch sichtbar in: Keller.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByLabel("Treppenrichtung", { exact: true })).toHaveValue("up");
  await page.getByLabel("Treppenrichtung", { exact: true }).selectOption("down");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Gerade Treppe", exact: true }).click();
  await expect(page.getByLabel("Treppenrichtung", { exact: true })).toHaveValue("down");
});
