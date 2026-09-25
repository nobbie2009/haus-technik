import { test, expect } from "@playwright/test";
import { createDemoProject } from "../../src/editor/demoProject";

test("Strg+A markiert den aktiven Tab und bewahrt die Textauswahl im Dialog", async ({ page }) => {
  const project = createDemoProject();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText(`„${project.name}“ wurde importiert.`)).toBeVisible();
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).click();
  await page.keyboard.press("Control+a");
  const count =
    Object.keys(project.rooms).length +
    Object.keys(project.walls).length +
    Object.keys(project.doors).length +
    Object.keys(project.windows).length;
  await expect(page.getByText(`${count} Objekte`, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.keyboard.press("Control+a");
  await expect(page.getByText("0 Objekte im aktuellen Tab ausgewählt.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  const input = page.getByRole("dialog").getByRole("textbox").first();
  await input.fill("Text auswählen");
  await input.press("Control+a");
  expect(
    await input.evaluate((el: HTMLInputElement) => el.value.substring(el.selectionStart!, el.selectionEnd!)),
  ).toBe("Text auswählen");
});
