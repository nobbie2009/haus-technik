import { test, expect } from "@playwright/test";

test("PoE-Switch und Doorbell platzieren, über Ethernet versorgen und wieder laden", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByLabel("Netzwerkgerät platzieren", { exact: true }).selectOption("poeSwitch");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 250, box.y + 220);
  if (!(await page.getByLabel("PoE-Gesamtbudget (W)", { exact: true }).isVisible()))
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await page.getByLabel("PoE-Gesamtbudget (W)", { exact: true }).fill("60");
  await page.getByLabel("PoE-Gesamtbudget (W)", { exact: true }).press("Enter");
  if (await page.getByRole("button", { name: "Eigenschaften", exact: true }).isVisible())
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await page.getByLabel("Netzwerkgerät platzieren", { exact: true }).selectOption("poeDoorbell");
  await page.mouse.click(box.x + 450, box.y + 380);
  if (!(await page.getByLabel("PoE-Verbraucherleistung (W)", { exact: true }).isVisible()))
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await expect(page.getByLabel("PoE-Verbraucherleistung (W)", { exact: true })).toHaveValue("12");
  await expect(page.getByText("Planungsstrom: 0,25 A (P / U)", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mit Steckdose verbinden", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ports, Kabel & WLAN", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Netzwerk und Verbindungen", exact: true });
  await dialog.getByLabel("Von Gerät", { exact: true }).selectOption({ label: "Switch mit PoE 1" });
  await dialog
    .getByLabel("Zu Gerät", { exact: true })
    .selectOption({ label: "Reolink Video Doorbell PoE 1" });
  await dialog.getByRole("button", { name: "Ports verbinden", exact: true }).click();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(
    page.getByText("PoE-Verbindung und Leistungsbudget passen (Planungsprüfung).", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Quelle: Switch mit PoE 1 · Port 1", { exact: true })).toBeVisible();
  await page.locator(".right-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/poe-desktop.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  if (!(await page.locator(".object-list summary").isVisible()))
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await page.locator(".object-list summary").click();
  await page
    .locator(".object-list")
    .getByRole("button", { name: "Reolink Video Doorbell PoE 1", exact: true })
    .click();
  await expect(page.getByText("Quelle: Switch mit PoE 1 · Port 1", { exact: true })).toBeVisible();
  await page.locator(".object-list").getByRole("button", { name: "Switch mit PoE 1", exact: true }).click();
  await page.getByText("PoE-Ports aktivieren", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Port 1", exact: true }).uncheck();
  await expect(page.getByText(/Port 1: Reolink.*ausgeschaltet/)).toBeVisible();
});
