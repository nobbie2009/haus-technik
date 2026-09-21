import { test, expect, type Page } from "@playwright/test";
import { wallProject, wallPng } from "../wallPhotoFixture";
import { addElectrical } from "../../src/electrical/actions";
import { createProject } from "../../src/core/projectFactory";
import { consumerLibrary, setConsumerLibrary } from "../../src/electrical/consumerLibrary";
import { asset } from "../../src/housebook/model";
import { constructionNotes } from "../../src/housebook/construction";
import type { Project } from "../../src/models/project";
async function load(page: Page, project: Project) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
}
async function exported(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await event).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Wandansicht übernimmt genaue Montagekoordinaten in den Grundriss", async ({ page }) => {
  const { project } = wallProject();
  const outlet = addElectrical(project, project.floorOrder[0]!, { x: 100, y: 100 }, "outlets");
  await load(page, project);
  await page.locator(".object-list summary").click();
  await page.getByRole("button", { name: /^Wand 1/ }).click();
  await page.getByRole("button", { name: "Wandansicht öffnen" }).click();
  const dialog = page.getByRole("dialog", { name: "Wandansicht", exact: true });
  await dialog.getByLabel("Objekt in Wandansicht").selectOption(outlet);
  await dialog.getByLabel("Montageabstand ab A (mm)").fill("1234");
  await dialog.getByLabel("Montagehöhe ab Boden (mm)").fill("650");
  await dialog.getByRole("button", { name: "Montagepunkt speichern" }).click();
  await expect(dialog.getByText("Montagepunkt gespeichert.")).toBeVisible();
  await page.screenshot({ path: "test-results/wall-elevation.png" });
  await page.keyboard.press("Escape");
  const saved = await exported(page);
  expect(asset(saved.electrical.outlets[outlet]!).mounting).toMatchObject({ distance: 1234, height: 650 });
  expect(saved.electrical.outlets[outlet]!.position.x).toBe(1234);
});
test("Baustellenansicht speichert Foto und Messwert auf schmalem Bildschirm und schützt Entwürfe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, createProject());
  await page.getByRole("button", { name: "Baustelle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Baustellenansicht", exact: true });
  await dialog.getByLabel("Baustellentitel", { exact: true }).fill("Gartenleitung");
  await dialog.getByLabel("Messwert mit Einheit und Bezug").fill("60 cm unter Zaunkante");
  await dialog
    .getByLabel("Baustellenfoto aufnehmen oder auswählen")
    .setInputFiles({ name: "graben.png", mimeType: "image/png", buffer: await wallPng(page) });
  await expect(dialog.getByAltText("Baustellenfoto im Entwurf")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog.getByText("Ungespeicherte Eingaben vorhanden.")).toBeVisible();
  await dialog.getByRole("button", { name: "Weiter erfassen" }).click();
  await dialog.getByRole("button", { name: "Baustellennotiz speichern" }).click();
  await expect(dialog.getByRole("heading", { name: "Gartenleitung" })).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
  await page.screenshot({ path: "test-results/construction-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  const rows = constructionNotes(await exported(page));
  expect(rows[0]).toMatchObject({ title: "Gartenleitung", measurement: "60 cm unter Zaunkante" });
  expect(rows[0]!.photo).toMatch(/^data:image\//);
});
test("Gerätevorlage steht in einem anderen Projekt ohne Seriennummer bereit", async ({ page }) => {
  const p = createProject();
  setConsumerLibrary(p, [
    {
      id: crypto.randomUUID(),
      name: "Testgerät",
      manufacturer: "Beispiel",
      model: "600",
      serial: "Einzelgerät",
      width: 600,
      depth: 500,
      height: 900,
      rotation: 0,
      annualEnergyKWh: 100,
      ratedPower: 1000,
      ratedVoltage: 230,
      phases: 1,
    },
  ]);
  await load(page, p);
  const open = async () => {
    await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
    await page.getByRole("button", { name: "Verbraucherdatenbank", exact: true }).click();
    await page.getByText("Projektübergreifende Gerätebibliothek", { exact: true }).click();
  };
  await open();
  await page.getByRole("button", { name: "Übergreifend merken: Testgerät" }).click();
  await expect(page.getByText("Vorlage projektübergreifend gespeichert.")).toBeVisible();
  await page.keyboard.press("Escape");
  await load(page, createProject("Anderes Haus"));
  await open();
  await page.getByRole("button", { name: "Ins Projekt übernehmen: Testgerät" }).click();
  await expect(page.getByText("Vorlage ins aktuelle Projekt übernommen.")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(consumerLibrary(await exported(page))[0]).toMatchObject({
    name: "Testgerät",
    serial: "",
    width: 600,
  });
});
test("Neuer Serverstand wird angeboten und Übernahme sichert den alten Entwurf", async ({ page }) => {
  const p = createProject("Lokales Haus");
  let remote = structuredClone(p),
    etag = '"1"',
    puts = 0;
  await page.route("**/api/home-technik-projects**", async (route) => {
    const r = route.request();
    if (r.method() === "PUT") {
      puts++;
      if (r.headers()["if-none-match"] !== "*" && r.headers()["if-match"] !== etag)
        return route.fulfill({ status: 412 });
      remote = r.postDataJSON();
      return route.fulfill({ status: 200, headers: { ETag: etag }, json: {} });
    }
    if (r.url().endsWith(remote.id)) return route.fulfill({ json: remote, headers: { ETag: etag } });
    return route.fulfill({
      json: { projects: [{ id: remote.id, name: remote.name, etag, saved: "2026-09-21" }] },
    });
  });
  await load(page, p);
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Gemeinsame Projekte", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Hausakte", exact: true });
  await dialog.getByLabel("Projektdienst-Zugriffsschlüssel").fill("test-key");
  await dialog.getByRole("button", { name: "Mit Projektdienst verbinden" }).click();
  await expect(
    dialog.getByRole("button", { name: "Aktuelles Projekt erstmals bereitstellen" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Aktuelles Projekt erstmals bereitstellen" }).click();
  await expect(dialog.getByText("Serverstand verbunden", { exact: true })).toBeVisible();
  etag = '"2"';
  remote.name = "Stand vom iPad";
  await dialog.getByRole("button", { name: "Jetzt abgleichen" }).click();
  await expect(dialog.getByText(/Neuer Serverstand verfügbar/)).toBeVisible();
  expect(puts).toBe(1);
  await dialog.getByRole("button", { name: "Serverprojekte laden" }).click();
  await dialog.getByRole("button", { name: "Serverstand prüfen: Stand vom iPad" }).click();
  await dialog.getByRole("button", { name: "Serverstand übernehmen und verbinden" }).click();
  await expect(dialog.getByRole("heading", { name: "Serverstand: Stand vom iPad" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  expect((await exported(page)).name).toBe("Stand vom iPad");
  const snapshots = await page.evaluate(
    async () =>
      new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open("home-technik", 2);
        request.onsuccess = () => {
          const db = request.result,
            r = db.transaction("snapshots").objectStore("snapshots").getAll();
          r.onsuccess = () => {
            resolve(r.result);
            db.close();
          };
          r.onerror = () => reject(r.error);
        };
      }),
  );
  expect(
    snapshots.some((s) => s.name === "Vor Übernahme vom Server" && s.project.name === "Lokales Haus"),
  ).toBe(true);
});
