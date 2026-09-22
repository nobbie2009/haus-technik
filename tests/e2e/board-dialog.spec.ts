import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
import { addProtectionDevice, addBoardTransformer } from "../../src/electrical/boardActions";
import { addCable } from "../../src/electrical/cables";

test("Grafischer Sicherungskasten bearbeitet Schutzkette und Leitungen in Unterdialogen", async ({
  page,
}) => {
  const { project, sub, branch, terminal, outlet } = simulationFixture();
  const fi = addProtectionDevice(project, sub, "RCD");
  project.electrical.protectionDevices[fi]!.label = "FI-OG";
  project.electrical.protectionDevices[branch]!.upstreamProtectionDeviceId = fi;
  const transformer = addBoardTransformer(project, sub);
  project.electrical.transformers[transformer]!.circuitId = terminal;
  const cable = addCable(project, sub, outlet, []);
  project.electrical.cables[cable]!.circuitId = terminal;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "kasten.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Etagenverteiler", exact: true }).click();
  await page.getByRole("button", { name: "Sicherungskasten öffnen", exact: true }).click();
  const board = page.getByRole("dialog", { name: /^Sicherungskasten ·/ });
  await expect(board.getByRole("button", { name: /FI-OG/ })).toBeVisible();
  await expect(board.locator(".board-tree > li > ul .board-node-protection")).toHaveCount(1);
  await board.getByRole("button", { name: /FI-OG/ }).click();
  const component = page.getByRole("dialog", { name: /^Komponente bearbeiten/ });
  await component.getByLabel("Bemessungsstrom (A)", { exact: true }).fill("63");
  await component.getByLabel("Bemessungsstrom (A)", { exact: true }).press("Tab");
  await page.keyboard.press("Escape");
  await expect(component).toHaveCount(0);
  await expect(board.getByRole("button", { name: /FI-OG/ })).toContainText("63 A");
  await expect(board.getByRole("button", { name: /FI-OG/ })).toBeFocused();
  await board.getByRole("button", { name: /Stromkreis · L1/ }).click();
  await component.getByLabel("Stromkreisname", { exact: true }).fill("Licht und Klingel OG");
  await component.getByLabel("Stromkreisname", { exact: true }).press("Tab");
  await page.keyboard.press("Escape");
  await board.getByRole("button", { name: /^Leitung ·/ }).click();
  await expect(component.getByRole("button", { name: "Anschlussbelegung bearbeiten" })).toBeVisible();
  await component.getByRole("button", { name: "Anschlussbelegung bearbeiten" }).click();
  await expect(page.locator("dialog:modal")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(component).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1500 });
  await board.evaluate((e) => {
    e.scrollTop = 0;
  });
  await board.screenshot({ path: "test-results/board-popup.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await board.getByRole("button", { name: "Leitung verbinden", exact: true }).click();
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(outlet);
  await page.getByRole("button", { name: "Leitungsweg speichern", exact: true }).click();
  await expect(board.getByRole("heading", { name: "Leitungen und Anschlüsse · 2" })).toBeVisible();
  await board.getByLabel("Neue Sicherung", { exact: true }).selectOption("C16-3");
  await board.getByRole("button", { name: "Sicherung hinzufügen", exact: true }).click();
  await expect(component.getByLabel("Pole", { exact: true })).toHaveValue("3");
  await page.keyboard.press("Escape");
  await board.getByRole("button", { name: "Klingeltrafo hinzufügen", exact: true }).click();
  await expect(component.getByLabel("Trafo-Primärstromkreis", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(board).toBeVisible();
  expect(await board.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("home-technik");
      r.onsuccess = () => resolve(r.result);
    });
    return new Promise<any[]>((resolve) => {
      const r = db.transaction("projects").objectStore("projects").getAll();
      r.onsuccess = () => {
        db.close();
        resolve(r.result);
      };
    });
  });
  expect(saved.find((p) => p.id === project.id).electrical.protectionDevices[fi].ratedCurrent).toBe(63);
  expect(saved.find((p) => p.id === project.id).electrical.circuits[terminal].name).toBe(
    "Licht und Klingel OG",
  );
  expect(errors).toEqual([]);
});
