import { test, expect } from "@playwright/test";

test("Leitungsweg per Touch zeichnen und unmittelbar anschließen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).tap();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("outlets");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.touchscreen.tap(box.x + 160, box.y + 200);
  await page.touchscreen.tap(box.x + 380, box.y + 340);
  await page.getByTitle("Leitung (L)", { exact: true }).tap();
  await page.touchscreen.tap(box.x + 160, box.y + 200);
  await page.touchscreen.tap(box.x + 380, box.y + 200);
  await page.touchscreen.tap(box.x + 380, box.y + 340);
  const dialog = page.getByRole("dialog", { name: "Anschlüsse verbinden" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Leitungsweg mit 1 Zwischenpunkten");
  await expect(page.getByLabel("Verbindung 1 · Startkontakt", { exact: true })).toHaveValue("L");
  await dialog.getByRole("button", { name: "Belegung speichern", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const cables = Object.values(project.electrical.cables) as {
    path: unknown[];
    conductorConnections: unknown[];
  }[];
  expect(cables).toHaveLength(1);
  expect(cables[0]!.path).toHaveLength(1);
  expect(cables[0]!.conductorConnections).toHaveLength(3);
});
