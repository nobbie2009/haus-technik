import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("Kontextmenü: Raum kopieren, einfügen, ausschneiden und löschen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.getByTitle("Rechteckraum (R)").click();
  await page.mouse.click(box.x + 160, box.y + 200);
  await page.mouse.click(box.x + 360, box.y + 340);
  await page.getByTitle("Auswahl (V)").click();

  const menu = page.getByRole("menu", { name: "Kontextmenü" });
  await page.mouse.click(box.x + 260, box.y + 270, { button: "right" });
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("1 Objekt ausgewählt");
  await expect(menu.getByRole("menuitem", { name: /Hier einfügen/ })).toBeDisabled();
  await page.screenshot({ path: "test-results/context-menu.png" });
  await menu.getByRole("menuitem", { name: /Kopieren/ }).click();
  await expect(menu).not.toBeVisible();

  await page.mouse.click(box.x + 600, box.y + 270, { button: "right" });
  await expect(menu).not.toContainText("ausgewählt");
  await menu.getByRole("menuitem", { name: /Hier einfügen/ }).click();
  expect(Object.keys((await exported(page)).rooms)).toHaveLength(2);

  await page.mouse.click(box.x + 600, box.y + 270, { button: "right" });
  await menu.getByRole("menuitem", { name: /Ausschneiden/ }).click();
  expect(Object.keys((await exported(page)).rooms)).toHaveLength(1);
  await page.getByTestId("drawing-surface").focus();
  await page.keyboard.press("ControlOrMeta+v");
  expect(Object.keys((await exported(page)).rooms)).toHaveLength(2);

  await page.mouse.click(box.x + 260, box.y + 270, { button: "right" });
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await page.mouse.click(box.x + 260, box.y + 270, { button: "right" });
  await menu.getByRole("menuitem", { name: /Löschen/ }).click();
  expect(Object.keys((await exported(page)).rooms)).toHaveLength(1);
  expect(errors).toEqual([]);
});
