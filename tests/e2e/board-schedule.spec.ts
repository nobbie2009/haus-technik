import { test, expect } from "@playwright/test";
import { boardScheduleFixture } from "../boardScheduleFixture";
test("Sicherungskasten-Aushang als mehrseitiges PDF exportieren", async ({ page }) => {
  const f = boardScheduleFixture();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "druckmuster.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(f.project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Sicherungskasten-Aushang", exact: true }).click();
  await page.getByLabel("Sicherungskasten für Aushang", { exact: true }).selectOption("all");
  await page
    .getByLabel("Eigene Hinweise auf dem Aushang", { exact: true })
    .fill("Nur Testdaten · Unterverteilung im Obergeschoss.\nEigene Notiz für den Aushang.");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Aushang als PDF", exact: true }).click();
  const file = await event;
  expect(file.suggestedFilename()).toBe("Sicherungskasten-Aushang.pdf");
  await file.saveAs("test-results/Sicherungskasten-Aushang.pdf");
  await page.screenshot({ path: "test-results/board-schedule-ui.png" });
  await expect(page.getByRole("dialog", { name: "Hausakte", exact: true }).getByRole("alert")).toHaveCount(0);
});
