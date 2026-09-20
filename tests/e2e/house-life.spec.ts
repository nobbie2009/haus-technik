import { test, expect, type Page } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { homeBook, setHomeBook, newHomeItem } from "../../src/housebook/home";
import { life } from "../../src/housebook/life";
import { wallPng } from "../wallPhotoFixture";
import { qrLink } from "../../src/housebook/qr";
import { newId } from "../../src/utils/uuid";
async function load(page: Page) {
  const p = createProject("Hausalltag"),
    b = homeBook(p);
  b.items.push({
    ...newHomeItem("shutoff"),
    name: "Hauptwasser",
    location: "Keller",
    controls: "Gesamtes Haus",
  });
  setHomeBook(p, b);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "alltag.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  return p;
}
async function json(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}
test("Hauschronik, Kontakte und druckbare Schnellübersicht", async ({ page }) => {
  await load(page);
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await expect(page.getByRole("region", { name: "Haus-Startseite" })).toBeVisible();
  await nav.getByRole("button", { name: "Hauschronik", exact: true }).click();
  await page.getByLabel("Ereignistitel", { exact: true }).fill("Bad renoviert");
  await page.getByLabel("Kosten (€)", { exact: true }).fill("250.50");
  const png = await wallPng(page);
  await page
    .getByLabel("Vorher-Foto", { exact: true })
    .setInputFiles({ name: "vorher.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: "Vorher: Bad renoviert", exact: true })).toBeVisible();
  await page
    .getByLabel("Nachher-Foto", { exact: true })
    .setInputFiles({ name: "nachher.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: "Nachher: Bad renoviert", exact: true })).toBeVisible();
  await page
    .getByLabel("Rechnung / Beleg (PDF oder Bild)", { exact: true })
    .setInputFiles({ name: "rechnung.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("button", { name: "Beleg herunterladen", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ereignis speichern", exact: true }).click();
  await nav.getByRole("button", { name: "Haus-Schnellübersicht", exact: true }).click();
  await page
    .getByRole("button", { name: "Sicherungskästen und Absperrstellen übernehmen", exact: true })
    .click();
  await page.getByLabel("Kontaktname", { exact: true }).fill("Hausservice");
  await page.getByLabel("Telefon", { exact: true }).fill("01234 56789");
  await page.getByLabel("Zuständig für", { exact: true }).fill("Heizung");
  await page.getByRole("button", { name: "Kontakt speichern", exact: true }).click();
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Hausübersicht als PDF", exact: true }).click();
  await (await pdf).saveAs("test-results/Haus-Schnelluebersicht.pdf");
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const p = JSON.parse((await json(page)).toString());
  expect(life(p).events[0]).toMatchObject({ title: "Bad renoviert", cost: 250.5 });
  expect(life(p).events[0]!.before).toMatch(/^data:image/);
  expect(life(p).events[0]!.receipt?.name).toBe("rechnung.jpg");
  expect(life(p).contacts).toHaveLength(1);
});
test("Sicherung prüfen und ältere Transferdatei bewusst übernehmen", async ({ page }) => {
  const original = await load(page),
    nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const exported = await json(page);
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await nav.getByRole("button", { name: "Sicherung & Gerätewechsel", exact: true }).click();
  await page
    .getByLabel("Gesicherte Datei prüfen", { exact: true })
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: exported });
  await expect(
    page.getByText("Datei geprüft: Sie enthält genau den aktuellen Projektstand.", { exact: true }),
  ).toBeVisible();
  const changed = structuredClone(original);
  changed.name = "Übernommener Altstand";
  changed.updatedAt = "2020-01-01T00:00:00.000Z";
  changed.createdAt = "2020-01-01T00:00:00.000Z";
  await page.getByLabel("Transferdatei auswählen", { exact: true }).setInputFiles({
    name: "alt.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(changed)),
  });
  await expect(page.getByText(/Die Datei trägt einen älteren Änderungszeitpunkt/)).toBeVisible();
  await page.getByRole("button", { name: "Diesen Stand bewusst übernehmen", exact: true }).click();
  await expect(
    page.getByText("Projektstand übernommen. Prüfe ihn vor der weiteren Bearbeitung.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  expect(JSON.parse((await json(page)).toString()).name).toBe("Übernommener Altstand");
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await nav.getByRole("button", { name: "Wiederherstellung", exact: true }).click();
  await expect(page.getByText("Hausalltag", { exact: false }).first()).toBeVisible();
});
test("QR-Aufkleber exportieren und richtige sowie fremde Projektziele behandeln", async ({ page }) => {
  const p = await load(page),
    item = homeBook(p).items[0]!,
    nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "QR-Aufkleber", exact: true }).click();
  await page.getByLabel("WLAN-Adresse der Anwendung", { exact: true }).fill("http://192.168.178.190:4173/");
  await page.getByRole("checkbox", { name: /Hauptwasser/ }).check();
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "QR-Aufkleber als PDF", exact: true }).click();
  await (await pdf).saveAs("test-results/Hausakte-QR-Aufkleber.pdf");
  await page.getByRole("button", { name: "Ziel testen: Hauptwasser", exact: true }).click();
  await expect(page.getByLabel("Bezeichnung", { exact: true })).toHaveValue("Hauptwasser");
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.goto(qrLink("http://127.0.0.1:5173/", p.id, `home:${item.id}`));
  await expect(page.getByLabel("Bezeichnung", { exact: true })).toHaveValue("Hauptwasser");
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.goto(qrLink("http://127.0.0.1:5173/", newId(), `home:${item.id}`));
  await expect(page.getByText(/Dieser QR-Aufkleber gehört zu einem anderen Projekt/)).toBeVisible();
  await expect(page.getByLabel("Bezeichnung", { exact: true })).toHaveCount(0);
});

test("Abweichende Sicherung ablehnen und Transfer als getrennte Kopie behalten", async ({ page }) => {
  const original = await load(page);
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Sicherung & Gerätewechsel", exact: true }).click();
  const incoming = structuredClone(original);
  incoming.name = "Anderer Stand";
  const file = {
    name: "transfer.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incoming)),
  };
  await page.getByLabel("Gesicherte Datei prüfen", { exact: true }).setInputFiles(file);
  await expect(page.getByRole("alert")).toContainText("entspricht nicht dem aktuell geöffneten Projektstand");
  await page.getByLabel("Transferdatei auswählen", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Als separate Kopie öffnen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Anderer Stand · Importkopie", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const copy = JSON.parse((await json(page)).toString());
  expect(copy.id).not.toBe(original.id);
  expect(homeBook(copy).items).toEqual(homeBook(original).items);
  const item = homeBook(original).items[0]!;
  await page.goto(qrLink("http://127.0.0.1:5173/", original.id, `home:${item.id}`));
  await page.getByRole("button", { name: "Passendes lokales Projekt öffnen", exact: true }).click();
  await expect(page.getByLabel("Bezeichnung", { exact: true })).toHaveValue("Hauptwasser");
});
