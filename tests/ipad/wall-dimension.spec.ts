import { test, expect } from "@playwright/test";
import { rectangleFixture } from "../fixtures";

test("Raummaß per Touch eingeben", async ({ page }) => {
  const { project, walls } = rectangleFixture();
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "room.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Menüband", exact: true }).tap();
  const wall = walls[0]!;
  await page.locator(`.editable-wall-dimension[data-wall-id="${wall.id}"]`).tap();
  const dialog = page.getByRole("dialog", { name: "Wandmaß ändern" });
  await expect(dialog.getByLabel("Neue Wandlänge", { exact: true })).toHaveAttribute("inputmode", "decimal");
  await expect(dialog.getByLabel("Neue Wandlänge", { exact: true })).toBeFocused();
  await dialog.getByLabel("Neue Wandlänge", { exact: true }).fill("460 cm");
  await dialog.getByRole("button", { name: "Maß übernehmen", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(`.editable-wall-dimension[data-wall-id="${wall.id}"]`)).toHaveAttribute(
    "aria-label",
    "Wandmaß 4,600 m bearbeiten",
  );
  await page.screenshot({ path: "test-results/wall-dimension-ipad.png" });
});

test("Schornstein per Touch als Wandversatz einfügen", async ({ page }) => {
  const { project, walls } = rectangleFixture();
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "room.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Menüband", exact: true }).tap();
  const wall = walls[0]!;
  await page.locator(`.editable-wall-dimension[data-wall-id="${wall.id}"]`).tap();
  const dialog = page.getByRole("dialog", { name: "Wandmaß ändern" });
  await dialog.getByLabel("Art der Änderung", { exact: true }).selectOption("offset");
  for (const [label, value] of [
    ["Abstand", "1"],
    ["Breite", "0,5"],
    ["Tiefe", "0,4"],
  ] as const) {
    const field = dialog.getByLabel(`Versatz ${label}`, { exact: true });
    await expect(field).toHaveAttribute("inputmode", "decimal");
    await field.fill(value);
  }
  await dialog.getByRole("button", { name: "Maß übernehmen", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Wandmaß 0,500 m bearbeiten", exact: true })).toBeVisible();
  await expect(page.locator(`.editable-wall-dimension[data-wall-id="${walls[2]!.id}"]`)).toHaveAttribute(
    "aria-label",
    "Wandmaß 4,350 m bearbeiten",
  );
  await page.screenshot({ path: "test-results/wall-offset-ipad.png" });
});
