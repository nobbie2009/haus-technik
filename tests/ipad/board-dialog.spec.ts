import { test, expect } from "@playwright/test";
import { distributionFixture } from "../electrical/distributionFixture";

for (const locked of [false, true]) {
  test(`iPad: Sicherungskasten und Unterdialog, Ebene ${locked ? "gesperrt" : "entsperrt"}`, async ({
    page,
  }) => {
    const { project, main, upstream } = distributionFixture();
    project.layers[project.electrical.distributionBoards[main]!.layerId]!.locked = locked;
    await page.goto("/");
    await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
    await page.getByLabel("Projektdatei importieren").setInputFiles({
      name: "beispiel.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
    await page.getByRole("tab", { name: "Elektrik", exact: true }).tap();
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
    await page.locator(".object-list summary").tap();
    await page.locator(".object-list").getByRole("button", { name: "Hauptverteilung", exact: true }).tap();
    await page.getByRole("button", { name: "Sicherungskasten öffnen", exact: true }).tap();
    const board = page.getByRole("dialog", { name: /^Sicherungskasten ·/ });
    await expect(board.getByRole("button", { name: "Sicherung hinzufügen", exact: true })).toBeEnabled({
      enabled: !locked,
    });
    await expect(board.getByRole("button", { name: "Leitung verbinden", exact: true })).toBeEnabled({
      enabled: !locked,
    });
    await board
      .getByRole("button", { name: new RegExp(project.electrical.protectionDevices[upstream]!.label) })
      .tap();
    const detail = page.getByRole("dialog", { name: /^Komponente bearbeiten/ });
    await expect(detail.getByLabel("Bemessungsstrom (A)", { exact: true })).toBeEnabled({ enabled: !locked });
    await detail.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
    await expect(board).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await board.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBeTruthy();
    await board.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
    await expect(board).toHaveCount(0);
  });
}
