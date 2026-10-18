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
  const length = dialog.getByLabel("Neue Wandlänge", { exact: true });
  // Eigener Ziffernblock statt Systemtastatur, die auf dem iPad immer Buchstaben zeigt.
  await expect(length).toHaveAttribute("inputmode", "none");
  await expect(length).toBeFocused();
  const keypad = dialog.getByRole("group", { name: "Ziffernblock" });
  for (const key of ["4", "Komma", "6"]) await keypad.getByRole("button", { name: key, exact: true }).tap();
  await expect(length).toHaveValue("4,6");
  await expect(length).toBeFocused();
  await page.screenshot({ path: "test-results/wall-dimension-keypad-ipad.png" });
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
  const keypad = dialog.getByRole("group", { name: "Ziffernblock" });
  for (const [label, keys] of [
    ["Abstand", ["1"]],
    ["Breite", ["0", "Komma", "5"]],
    ["Tiefe", ["0", "Komma", "4"]],
  ] as const) {
    await dialog.getByLabel(`Versatz ${label}`, { exact: true }).tap();
    for (const key of keys) await keypad.getByRole("button", { name: key, exact: true }).tap();
  }
  await expect(dialog.getByLabel("Versatz Tiefe", { exact: true })).toHaveValue("0,4");
  await dialog.getByRole("button", { name: "Maß übernehmen", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Wandmaß 0,500 m bearbeiten", exact: true })).toBeVisible();
  await expect(page.locator(`.editable-wall-dimension[data-wall-id="${walls[2]!.id}"]`)).toHaveAttribute(
    "aria-label",
    "Wandmaß 4,350 m bearbeiten",
  );
  await page.screenshot({ path: "test-results/wall-offset-ipad.png" });
});
