import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { addNetworkNode } from "../../src/network/model";
import { housebook } from "../../src/housebook/model";

test("Netzwerkkabel über Geschosse zeichnen, Ports bestätigen und wieder laden", async ({ page }) => {
  const project = createProject("Netzwerkkabel-Beispiel");
  const ground = project.floorOrder[0]!,
    upper = crypto.randomUUID();
  project.floors[upper] = { ...project.floors[ground]!, id: upper, name: "Obergeschoss", elevation: 3000 };
  project.floorOrder.push(upper);
  addNetworkNode(project, ground, { x: 0, y: 0 }, "poeSwitch");
  addNetworkNode(project, upper, { x: 2000, y: 1000 }, "poeDoorbell");
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByRole("button", { name: "Netzwerkkabel verlegen", exact: true }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  let box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 120, box.y + box.height / 2);
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 - 100, box.y + box.height / 2 + 100);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const dialog = page.getByRole("dialog", { name: "Netzwerkkabel anschließen", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Erdgeschoss");
  await expect(dialog).toContainText("Obergeschoss");
  await dialog.getByLabel("Startport", { exact: true }).selectOption("2");
  await dialog.getByLabel("Kabelkennzeichnung", { exact: true }).fill("NET-Tür");
  await dialog.screenshot({ path: "test-results/network-route-dialog.png" });
  await dialog.getByRole("button", { name: "Kabel und Anschlüsse speichern", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const book = housebook(JSON.parse(Buffer.concat(chunks).toString()));
  expect(book.networkLinks).toHaveLength(1);
  expect(book.networkLinks[0]).toMatchObject({ name: "NET-Tür", fromPort: 2, toPort: 1 });
  expect(book.networkLinks[0]!.route!.map((p) => p.floorId)).toEqual([ground, upper, upper]);
});
