import { test, expect, type Page } from "@playwright/test";
import { housebook } from "../../src/housebook/model";
async function book(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  return housebook(JSON.parse(Buffer.concat(chunks).toString()));
}
test("SAT-Schüssel, Multischalter und Dose verbinden, Koaxweg zeichnen und speichern", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  const surface = (await page.getByTestId("drawing-surface").boundingBox())!;
  for (const [kind, x] of [
    ["satDish", 220],
    ["multiswitch", 440],
    ["tvSocket", 650],
  ] as const) {
    await page.getByLabel("TV-/SAT-Gerät platzieren", { exact: true }).selectOption(kind);
    await page.mouse.click(surface.x + x, surface.y + 280);
    await expect(page.getByLabel("TV-/SAT-Modell", { exact: true })).toBeVisible();
  }
  const initial = await book(page),
    [dish, ms, socket] = initial.networkNodes;
  await page.getByRole("button", { name: "TV / SAT & Koaxleitungen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "TV / SAT & Koaxleitungen", exact: true });
  await dialog.getByLabel("Von Gerät", { exact: true }).selectOption(dish!.id);
  await dialog.getByLabel("Von Port", { exact: true }).selectOption({ label: "VL" });
  await dialog.getByLabel("Zu Gerät", { exact: true }).selectOption(ms!.id);
  await dialog.getByLabel("Zu Port", { exact: true }).selectOption({ label: "SAT VL" });
  await dialog.getByLabel("Kabelkennzeichnung", { exact: true }).fill("SAT-LNB");
  await dialog.getByRole("button", { name: "Ports verbinden", exact: true }).click();
  await dialog.getByLabel("Von Gerät", { exact: true }).selectOption(ms!.id);
  await dialog.getByLabel("Von Port", { exact: true }).selectOption({ label: "Teilnehmer 1" });
  await dialog.getByLabel("Zu Gerät", { exact: true }).selectOption(socket!.id);
  await dialog.getByLabel("Zu Port", { exact: true }).selectOption({ label: "Zuleitung" });
  await dialog.getByLabel("Kabelkennzeichnung", { exact: true }).fill("SAT-Wohnen");
  await dialog.getByRole("button", { name: "Ports verbinden", exact: true }).click();
  const cable = dialog.getByRole("listitem").filter({ hasText: "SAT-LNB:" });
  await cable.getByRole("button", { name: "Kabel bearbeiten", exact: true }).click();
  await dialog.getByLabel("Längenzuschlag (mm)", { exact: true }).fill("1500");
  await dialog.getByRole("button", { name: "Verbindung speichern", exact: true }).click();
  await cable.getByRole("button", { name: "Leitungsweg zeichnen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.mouse.click(surface.x + 220, surface.y + 410);
  await page.mouse.click(surface.x + 440, surface.y + 410);
  await page.keyboard.press("Enter");
  const saved = await book(page);
  expect(saved.networkLinks).toHaveLength(2);
  expect(saved.networkLinks[0]).toMatchObject({ medium: "coax", allowance: 1500 });
  expect(saved.networkLinks[0]!.path).toHaveLength(2);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await book(page)).networkLinks[0]!.path).toBeUndefined();
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await page.screenshot({ path: "test-results/tv-desktop.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await book(page)).toEqual(saved);
  expect(errors).toEqual([]);
});
