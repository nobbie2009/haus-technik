import { test, expect } from "@playwright/test";

test("Router im Netzwerkbereich platzieren, verschieben, sperren und wieder laden", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await expect(page.getByLabel("Netzwerkgerät platzieren", { exact: true })).toHaveValue("router");
  await page.getByRole("button", { name: "Im Grundriss platzieren", exact: true }).click();
  const surface = page.getByTestId("drawing-surface"),
    box = (await surface.boundingBox())!;
  await page.mouse.click(box.x + 250, box.y + 240);
  await expect(page.getByLabel("Netzwerkname", { exact: true })).toHaveValue("Router 1");
  await page.getByLabel("Netzwerkname", { exact: true }).fill("Router Flur");
  await page.getByLabel("Netzwerkname", { exact: true }).press("Enter");
  const before = Number(await page.getByLabel("Netzwerkposition X (mm)", { exact: true }).inputValue());
  await page.mouse.move(box.x + 250, box.y + 240);
  await page.mouse.down();
  await page.mouse.move(box.x + 320, box.y + 240, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Netzwerkposition X (mm)", { exact: true })).not.toHaveValue(String(before));
  await page.getByRole("button", { name: "Duplizieren", exact: true }).click();
  await expect(page.getByLabel("Netzwerkname", { exact: true })).toHaveValue("Router Flur – Kopie");
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.locator(".object-list summary").click();
  await expect(page.locator(".object-list button")).toHaveCount(2);
  await page.locator(".object-list").getByRole("button", { name: "Router Flur", exact: true }).click();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Netzwerk sperren", exact: true }).click();

  await expect(page.getByLabel("Netzwerkname", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Netzwerk entsperren", exact: true }).click();

  await page.getByLabel("Netzwerkgerät platzieren", { exact: true }).selectOption("switch");
  await page.mouse.click(box.x + 410, box.y + 340);
  await expect(page.getByLabel("Netzwerkname", { exact: true })).toHaveValue("Switch 1");
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Netzwerk ausblenden", exact: true }).click();

  await expect(page.locator(".object-list button")).toHaveCount(0);
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Netzwerk einblenden", exact: true }).click();

  await expect(page.locator(".object-list button")).toHaveCount(3);
  await page.locator(".object-list").getByRole("button", { name: "Router Flur", exact: true }).click();
  await page.locator(".left-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.locator(".right-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/network-editor-desktop.png" });
  await page.getByRole("button", { name: "Ports, Kabel & WLAN", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Netzwerk und Verbindungen", exact: true })).toContainText(
    "Router Flur",
  );
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator(".left-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.locator(".right-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/network-editor-compact.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.locator(".object-list summary").click();
  await expect(page.locator(".object-list button")).toHaveCount(3);
  await page.locator(".object-list").getByRole("button", { name: "Router Flur", exact: true }).click();
  await expect(page.getByLabel("Netzwerkname", { exact: true })).toHaveValue("Router Flur");
  expect(errors).toEqual([]);
});
