import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addUtilityNode } from "../../src/utilities/model";
import { syncPlanMeters } from "../../src/housebook/planMeters";
import { homeBook, setHomeBook } from "../../src/housebook/home";
test("Alte Zählernummer aus Akte übernehmen und vom Plan aus direkt ablesen", async ({ page }) => {
  const p = createProject(),
    floor = p.floorOrder[0]!;
  addUtilityNode(p, floor, { x: 2000, y: 0 }, "meter", "cold");
  const id = addElectrical(p, floor, { x: 0, y: 0 }, "meters");
  p.electrical.meters[id]!.name = "Altstrom";
  syncPlanMeters(p);
  const b = homeBook(p),
    record = b.meters.find((m) => m.target?.id === id)!;
  record.serial = "ALT-2026";
  setHomeBook(p, b);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "zaehler.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".object-list summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Altstrom", exact: true }).click();
  await expect(page.getByLabel("Zählernummer", { exact: true })).toHaveValue("ALT-2026");
  await page.getByRole("button", { name: "Zählerstände / Hausakte öffnen", exact: true }).click();
  await expect(page.getByLabel("Zähler auswählen", { exact: true })).toHaveValue(record.id);
  await page.getByRole("button", { name: "Zähler bearbeiten", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Zählernummer", { exact: true }).fill("NEU-123");
  await page.getByRole("button", { name: "Zähler speichern", exact: true }).click();
  await page.getByLabel("Ablesedatum", { exact: true }).fill("2026-09-21");
  await page.getByLabel("Zählerstand (kWh)", { exact: true }).fill("321");
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByLabel("Zählernummer", { exact: true })).toHaveValue("NEU-123");
  await expect(page.getByRole("region", { name: "Verknüpfte Zählerakte" })).toContainText(
    "321 kWh · 2026-09-21",
  );
  await page.getByLabel("Zählernummer", { exact: true }).fill("PLAN-456");
  await page.getByLabel("Zählernummer", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Zählerstände / Hausakte öffnen", exact: true }).click();
  await page.getByRole("button", { name: "Zähler bearbeiten", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Zählernummer", { exact: true })).toHaveValue("PLAN-456");
  expect(errors).toEqual([]);
});
