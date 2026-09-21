import { test, expect } from "@playwright/test";
test("Planzähler erscheinen automatisch nach Art und behalten Ablesungen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true }).click();
  for (const [medium, x] of [
    ["cold", 180],
    ["gas", 380],
  ] as const) {
    await page.getByLabel("Leitungsmedium", { exact: true }).selectOption(medium);
    await page.getByLabel("Komponentenart", { exact: true }).selectOption("meter");
    await page.getByRole("button", { name: "Komponente platzieren", exact: true }).click();
    await page.mouse.click(box.x + x, box.y + 280);
  }
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("meters");
  await page.mouse.click(box.x + 280, box.y + 400);
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("outlets");
  await page.mouse.click(box.x + 480, box.y + 400);
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Bereiche der Hausakte" })
    .getByRole("button", { name: "Zähler & Verbrauch", exact: true })
    .click();
  const list = page.getByLabel("Zähler auswählen", { exact: true });
  await expect(list.locator("option")).toHaveCount(4);
  await expect(list).toContainText("Wasser · Zähler · m³");
  await expect(list).toContainText("Gas · Zähler · m³");
  await expect(list).toContainText("Strom · Stromzähler · kWh");
  await expect(page.getByLabel("Zählername", { exact: true })).toHaveCount(0);
  await list.selectOption({ label: "Wasser · Zähler · m³ · Erdgeschoss" });
  await page.getByLabel("Ablesedatum", { exact: true }).fill("2026-09-21");
  await page.getByLabel("Zählerstand (m³)", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  await page.getByRole("button", { name: "Zähler bearbeiten", exact: true }).click();
  const targets = page.getByLabel("Verknüpfter Planzähler", { exact: true });
  await expect(targets.locator("option")).toHaveCount(2);
  await expect(targets).toContainText("Wasserzähler · Kaltwasser");
  await expect(targets).not.toContainText("Stromzähler");
  await expect(targets).not.toContainText("Steckdose");
  await page.getByLabel("Zählernummer", { exact: true }).fill("TEST-WASSER-1");
  await page.getByRole("button", { name: "Zähler speichern", exact: true }).click();
  await expect(page.getByText("2026-09-21: 123 m³", { exact: false })).toBeVisible();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/plan-meters.png" });
  await page.reload();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Bereiche der Hausakte" })
    .getByRole("button", { name: "Zähler & Verbrauch", exact: true })
    .click();
  await list.selectOption({ label: "Wasser · Zähler · m³ · Erdgeschoss" });
  await expect(list.locator("option")).toHaveCount(4);
  await expect(page.getByText("2026-09-21: 123 m³", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
