import { test, expect } from "@playwright/test";
import { distributionFixture } from "../electrical/distributionFixture";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import type { Project } from "../../src/models/project";

test("Sicherung ohne Stromkreis als Anschluss wählen, abbrechen und atomar speichern", async ({ page }) => {
  const { project, main, outlet } = distributionFixture();
  project.electrical.outlets[outlet]!.circuitId = null;
  const protection = addProtectionDevice(project, main);
  project.electrical.protectionDevices[protection]!.label = "F-KUECHE";
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Hauptverteilung", exact: true }).click();
  await page.getByRole("button", { name: "Sicherungskasten öffnen", exact: true }).click();
  const board = page.getByRole("dialog", { name: /^Sicherungskasten ·/ });
  for (const save of [false, true]) {
    await board.getByRole("button", { name: "Leitung verbinden", exact: true }).click();
    await page.getByLabel("Zielobjekt", { exact: true }).selectOption(outlet);
    await page
      .getByLabel("Start · Sicherung / Stromkreis", { exact: true })
      .selectOption(`protection:${protection}`);
    await expect(page.getByLabel("Verbindung 1 · Startkontakt", { exact: true })).toContainText("F-KUECHE");
    await page.getByRole("checkbox", { name: /Endobjekt zusätzlich/ }).check();
    if (save) {
      await page.setViewportSize({ width: 1440, height: 1600 });
      await page
        .getByRole("dialog", { name: "Anschlüsse verbinden", exact: true })
        .screenshot({ path: "test-results/board-connection.png" });
    }
    await page.getByRole("button", { name: save ? "Belegung speichern" : "Abbrechen", exact: true }).click();
    await expect(
      board.getByRole("heading", { name: `Leitungen und Anschlüsse · ${save ? 1 : 0}`, exact: true }),
    ).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON exportieren", exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const saved = JSON.parse(Buffer.concat(chunks).toString()) as Project;
  const circuits = Object.values(saved.electrical.circuits).filter(
    (c) => c.protectionDeviceId === protection,
  );
  expect(circuits).toHaveLength(1);
  expect(saved.electrical.outlets[outlet]!.circuitId).toBe(circuits[0]!.id);
  expect(Object.values(saved.electrical.cables)[0]!.circuitId).toBe(circuits[0]!.id);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.getByRole("button", { name: "Sicherungskasten öffnen", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Leitungen und Anschlüsse · 0", exact: true }),
  ).toBeVisible();
});
