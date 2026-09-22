import { test, expect } from "@playwright/test";

test("Ampere vorbelegen, nachrechnen und eine manuelle Eingabe erhalten", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("devices");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 250, box.y + 250);
  await page.getByLabel("Symbol im Plan", { exact: true }).selectOption("lamp");
  const voltage = page.getByLabel("Nennspannung (V)", { exact: true });
  await voltage.fill("230");
  await voltage.press("Enter");
  const current = page.getByLabel("Nennstrom (A)", { exact: true });
  await expect(current).toHaveValue("0,021739");
  await expect(page.getByText(/Schätzung mit cos φ = 1/)).toBeVisible();
  const power = page.getByLabel("Nennleistung (W)", { exact: true });
  await power.fill("8");
  await power.press("Enter");
  await expect(current).toHaveValue("0,034783");
  await current.fill("0,1");
  await current.press("Enter");
  await power.fill("10");
  await power.press("Enter");
  await expect(current).toHaveValue("0,1");
  await current.fill("");
  await current.press("Enter");
  await expect(current).toHaveValue("0,043478");
});
