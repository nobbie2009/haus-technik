import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
test("iPad: Sicherungskasten wählen und Aushang herunterladen", async ({ page }) => {
  const f = simulationFixture();
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "verteiler.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(f.project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Sicherungskasten-Aushang", exact: true }).tap();
  await page.getByLabel("Sicherungskasten für Aushang", { exact: true }).selectOption(f.sub);
  await page.getByLabel("Eigene Hinweise auf dem Aushang", { exact: true }).fill("Etagenverteiler im Flur");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Aushang als PDF", exact: true }).tap();
  const file = await event;
  expect(file.suggestedFilename()).toBe("Sicherungskasten-Aushang.pdf");
  const chunks: Buffer[] = [];
  for await (const c of await file.createReadStream()) chunks.push(Buffer.from(c));
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
  expect(await page.locator(".book-content").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});
