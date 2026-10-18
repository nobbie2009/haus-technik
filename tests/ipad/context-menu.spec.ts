import { test, expect } from "@playwright/test";
import { rectangleFixture } from "../fixtures";

test("Langes Antippen öffnet das Kontextmenü und dupliziert den Raum", async ({ page }) => {
  const { project } = rectangleFixture();
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "room.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Menüband", exact: true }).tap();
  await expect(page.locator(".canvas-subtitle")).toContainText("1 Räume");
  const surface = page.getByTestId("drawing-surface");
  const box = (await surface.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // Finger aufsetzen, halten, loslassen – wie ein langes Antippen auf dem iPad.
  const touch = (type: string) =>
    surface.dispatchEvent(type, {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: point.x,
      clientY: point.y,
    });
  await touch("pointerdown");
  const menu = page.getByRole("menu", { name: "Kontextmenü" });
  await expect(menu).toBeVisible();
  await touch("pointerup");
  await expect(menu).toContainText("1 Objekt ausgewählt");
  await page.screenshot({ path: "test-results/context-menu-ipad.png" });
  await menu.getByRole("menuitem", { name: /Duplizieren/ }).tap();
  await expect(menu).not.toBeVisible();
  await expect(page.locator(".canvas-subtitle")).toContainText("2 Räume");
});
