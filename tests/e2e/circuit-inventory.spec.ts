import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addCable } from "../../src/electrical/cables";

test("Stromkreisbestand zeigt Leitungen und navigiert etagenübergreifend ohne Datenänderung", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const project = createProject("Bestandsübersicht");
  const ground = project.floorOrder[0]!;
  const upper = {
    ...project.floors[ground]!,
    id: crypto.randomUUID(),
    name: "Obergeschoss",
    elevation: 3000,
  };
  project.floors[upper.id] = upper;
  project.floorOrder.push(upper.id);
  const board = addElectrical(project, upper.id, { x: 1000, y: 1000 }, "distributionBoards");
  const outlet = addElectrical(project, upper.id, { x: 4000, y: 5000 }, "outlets");
  const cable = addCable(project, board, outlet, [{ x: 4000, y: 1000 }]);
  addCable(project, board, outlet, []); // Verbunden, aber keinem Stromkreis zugeordnet.
  const circuit = crypto.randomUUID();
  project.electrical.circuits[circuit] = {
    id: circuit,
    name: "Wohnen",
    label: "SK-01",
    distributionBoardId: board,
    protectionDeviceId: null,
    phase: "unknown",
    nominalVoltage: null,
    metadata: {},
  };
  project.electrical.outlets[outlet]!.circuitId = circuit;
  project.electrical.cables[cable]!.circuitId = circuit;
  project.electrical.cables[cable]!.lengthAllowance = 1250;
  const device = addElectrical(project, ground, { x: 0, y: 0 }, "devices");
  project.electrical.devices[device]!.connectionPointId = outlet;
  project.electrical.devices[device]!.ratedPower = 600;
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "bestand.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Bestandsübersicht“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  const open = async () =>
    page.locator(".left-panel").getByRole("button", { name: "Stromkreise verwalten", exact: true }).click();
  await open();
  const dialog = page.getByRole("dialog");
  const inventory = dialog.getByRole("region", { name: "Stromkreisbestand" });
  await expect(inventory.getByText("1 Leitungen · 8,250 m Gesamtlänge", { exact: true })).toBeVisible();
  await expect(inventory.getByText("Planlänge 7,000 m + Steigstrecken und Zuschläge 1,250 m")).toBeVisible();
  await expect(inventory.getByText("Erfasste Nennleistung: 600 W", { exact: true })).toBeVisible();
  await expect(inventory.getByRole("button", { name: "L-02 im Plan anzeigen", exact: true })).toHaveCount(0);
  await inventory.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/circuit-inventory-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await inventory.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/circuit-inventory-compact.png" });
  await inventory.getByRole("button", { name: "SD-01 im Plan anzeigen", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".floor-item").filter({ hasText: "Obergeschoss" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("tab", { name: "Elektrik", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Kennzeichnung", { exact: true })).toHaveValue("SD-01");
  await expect(page.getByTestId("drawing-surface")).toBeFocused();
  await expect(page.getByRole("button", { name: "Rückgängig", exact: true })).toBeDisabled();
  await open();
  await inventory.getByRole("button", { name: "L-01 im Plan anzeigen", exact: true }).click();
  await expect(page.getByLabel("Leitungskennzeichnung", { exact: true })).toHaveValue("L-01");
  await page.getByRole("button", { name: "Elektrik sperren", exact: true }).click();
  await open();
  await expect(inventory.getByText("Ebene gesperrt · nur ansehen")).toHaveCount(3);
  await inventory.getByRole("button", { name: "VG-01 im Plan anzeigen", exact: true }).click();
  await expect(page.getByLabel("Nennleistung (W)", { exact: true })).toHaveValue("600");
  await expect(page.getByLabel("Nennleistung (W)", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Elektrik ausblenden", exact: true }).click();
  await open();
  await expect(inventory.getByRole("button", { name: "SD-01 im Plan anzeigen", exact: true })).toBeDisabled();
  await expect(inventory.getByText("1 Leitungen · 8,250 m Gesamtlänge", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  expect(errors).toEqual([]);
});
