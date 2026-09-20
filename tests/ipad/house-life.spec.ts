import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { homeBook } from "../../src/housebook/home";
import { life } from "../../src/housebook/life";

test("Hausalltag auf dem iPad: Chronik, Bewässerung und verknüpfte Pflege", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createProject("iPad-Haus"))),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await page.getByRole("button", { name: "Foto / Ereignis erfassen", exact: true }).tap();
  await page.getByLabel("Ereignistitel", { exact: true }).fill("Terrasse erneuert");
  await page.getByRole("button", { name: "Ereignis speichern", exact: true }).tap();
  await nav.getByRole("button", { name: "Garten & Außenlicht", exact: true }).tap();
  await page.getByLabel("Gartenbereich", { exact: true }).selectOption("irrigationZone");
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Bewässerung Terrasse");
  await page.getByRole("button", { name: "Eintrag speichern", exact: true }).tap();
  await page.getByRole("button", { name: "Pflege planen: Bewässerung Terrasse", exact: true }).tap();
  await expect(page.getByLabel("Wartungsname", { exact: true })).toHaveValue("Pflege: Bewässerung Terrasse");
  await page.getByLabel("Fällig am", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Wartung speichern", exact: true }).tap();
  for (const section of [
    "Hauschronik",
    "Sicherung & Gerätewechsel",
    "Haus-Schnellübersicht",
    "QR-Aufkleber",
  ]) {
    await nav.getByRole("button", { name: section, exact: true }).tap();
    for (const size of [
      { width: 810, height: 1080 },
      { width: 1080, height: 810 },
    ]) {
      await page.setViewportSize(size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator(".book-content").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
        true,
      );
    }
  }
  await page.screenshot({ path: "test-results/ipad/house-life.png" });
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await event).createReadStream()) chunks.push(Buffer.from(chunk));
  const p = JSON.parse(Buffer.concat(chunks).toString());
  expect(life(p).events[0]!.title).toBe("Terrasse erneuert");
  const b = homeBook(p);
  expect(b.items[0]!.gardenRole).toBe("irrigationZone");
  expect(b.tasks[0]!.itemId).toBe(b.items[0]!.id);
});
