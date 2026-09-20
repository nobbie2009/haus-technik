import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { homeBook } from "../../src/housebook/home";
import { wallPng } from "../wallPhotoFixture";
test("Private Hausübersicht auf dem iPad mit Foto, Zähler und Wartung", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createProject())),
  });
  const png = await wallPng(page);
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Rauchmelder", exact: true }).tap();
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Flurmelder");
  await page
    .getByLabel("Foto hinzufügen", { exact: true })
    .setInputFiles({ name: "melder.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: "Foto: Flurmelder", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Eintrag speichern", exact: true }).tap();
  await nav.getByRole("button", { name: "Zähler & Verbrauch", exact: true }).tap();
  await page.getByLabel("Zählername", { exact: true }).fill("Wasser");
  await page.getByLabel("Zählerart", { exact: true }).selectOption("water");
  await page.getByLabel("Einheit", { exact: true }).selectOption("m³");
  await page.getByRole("button", { name: "Zähler speichern", exact: true }).tap();
  await page.getByLabel("Zählerstand (m³)", { exact: true }).fill("123.4");
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).tap();
  for (const size of [
    { width: 810, height: 1080 },
    { width: 1080, height: 810 },
  ]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const content = page.locator(".book-content");
    expect(await content.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  }
  await nav.getByRole("button", { name: "Wartungen", exact: true }).tap();
  await page.getByLabel("Wartungsname", { exact: true }).fill("Gartenpflege");
  await page.getByRole("button", { name: "Wartung speichern", exact: true }).tap();
  await page.screenshot({ path: "test-results/ipad/home-maintenance.png" });
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await event).createReadStream()) chunks.push(Buffer.from(chunk));
  const b = homeBook(JSON.parse(Buffer.concat(chunks).toString()));
  expect(b.items[0]!.asset.photo).toMatch(/^data:image\/jpeg/);
  expect(b.meters[0]!.readings[0]!.value).toBe(123.4);
  expect(b.tasks[0]!.title).toBe("Gartenpflege");
});
