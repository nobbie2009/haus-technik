import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
test("Handbuch aus der App: Kapitel, Bilder, Umlautsuche und sichere Texteingabe", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const popup = context.waitForEvent("page");
  await page.getByRole("link", { name: "Handbuch", exact: true }).click();
  const book = await popup;
  book.on("pageerror", (e) => errors.push(e.message));
  await book.waitForURL("**/handbuch/index.html");
  await expect(book.getByRole("heading", { level: 1 })).toContainText("Schritt für Schritt");
  await expect(book.locator("main article")).toHaveCount(31);
  await expect(book.locator("figure img")).toHaveCount(29);
  const brokenImages = await book.evaluate(async () => {
    return (
      await Promise.all(
        [...document.images].map(
          (img) =>
            new Promise<string | null>((resolve) => {
              const check = new Image();
              check.onload = () => resolve(null);
              check.onerror = () => resolve(img.src);
              check.src = img.src;
            }),
        ),
      )
    ).filter(Boolean);
  });
  expect(brokenImages).toEqual([]);
  const invalidLinks = await book.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href^='#']")]
      .filter((a) => !document.getElementById(a.hash.slice(1)))
      .map((a) => a.hash),
  );
  expect(invalidLinks).toEqual([]);
  await book.getByLabel("Im Handbuch suchen", { exact: true }).fill("Zaehler verknuepf");
  await expect(book.locator("#results li").first()).toBeVisible();
  await expect(book.getByRole("status")).toContainText("Fundstellen");
  await book.locator("#results a").first().click();
  await expect(book.getByLabel("Im Handbuch suchen", { exact: true })).toHaveValue("");
  expect(await book.locator("main article[hidden]").count()).toBe(0);
  await book.getByLabel("Im Handbuch suchen", { exact: true }).fill("zzzzkeinhandbucheintrag");
  await expect(book.getByRole("status")).toContainText("Keine Treffer");
  await book.getByLabel("Im Handbuch suchen", { exact: true }).fill('<img src=x onerror="alert(1)">');
  await expect(book.locator("#results img")).toHaveCount(0);
  await book.getByRole("button", { name: "Suche zurücksetzen" }).click();
  await book.goto("/handbuch/index.html#gemeinsame-projekte");
  await expect(book.locator("#gemeinsame-projekte")).toBeVisible();
  await book.goto("/handbuch/index.html");
  await book.screenshot({ path: "test-results/handbook-desktop.png" });
  await book.setViewportSize({ width: 390, height: 844 });
  await book.reload();
  await book.locator("#navigation summary").click();
  await book
    .getByRole("navigation", { name: "Handbuchkapitel" })
    .getByRole("link", { name: /FAQ und gezielte/ })
    .click();
  await expect(book.locator("#faq")).toBeVisible();
  expect(await book.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await book.goto("/handbuch/index.html?q=Klingeltrafo");
  await expect(book.getByRole("status")).toContainText("Fundstellen");
  await book.screenshot({ path: "test-results/handbook-mobile.png" });
  expect(errors).toEqual([]);
});
test("Handbuch bleibt ohne JavaScript mit Bildern und Inhaltsverzeichnis lesbar", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/handbuch/index.html");
  await expect(page.locator("main article")).toHaveCount(31);
  await expect(page.getByText(/Ohne JavaScript bleiben/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Handbuchkapitel" })
    .getByRole("link", { name: /Wandansicht und Montage/ })
    .click();
  await expect(page.locator("#wandansicht")).toBeInViewport();
  await context.close();
});
test("Heruntergeladenes Handbuch funktioniert als lokale Datei ohne Server", async ({ page }) => {
  await page.goto(pathToFileURL(resolve("public/handbuch/index.html")).href);
  await expect(page.locator(".app-link")).toBeHidden();
  await page.getByLabel("Im Handbuch suchen", { exact: true }).fill("Sprachaufnahme");
  await expect(page.getByRole("status")).toContainText("Fundstellen");
  await page.locator("#results a").first().click();
  await expect(page.getByLabel("Im Handbuch suchen", { exact: true })).toHaveValue("");
  expect(
    await page
      .locator("figure img")
      .first()
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
});
